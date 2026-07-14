document.getElementById('productMasterPlaceholder').innerHTML = `
<div class="space-y-6">
  <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-3">
    <div>
      <h2 class="text-lg font-bold text-slate-700">Central Product Master Repository (Tab3) <span id="pmTotalCountBadge" class="ml-2 bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-bold text-xs">0 Items</span></h2>
    </div>
    <div class="flex space-x-2">
      <label class="bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded shadow cursor-pointer">📥 Upload CSV<input type="file" id="excelCsvFileInput" accept=".csv" onchange="handleExcelCsvImport(this)" class="hidden"></label>
      <button onclick="downloadProductMasterAsCsv()" class="bg-blue-600 text-white font-bold text-xs py-2 px-3 rounded shadow">📤 Download Catalog</button>
      <button onclick="toggleAddProductModal(true)" class="bg-amber-500 text-slate-950 font-bold text-xs py-2 px-3 rounded shadow">+ Register Item</button>
    </div>
  </div>
  <div class="flex gap-2">
    <input type="text" id="pmSearchQuery" onkeyup="filterProductMasterViewTable()" placeholder="Search..." class="w-full p-2 border rounded text-sm bg-white">
    <select id="pmViewLimitSelect" onchange="filterProductMasterViewTable()" class="p-2 border rounded text-sm bg-white"><option value="50">50 Rows</option><option value="200" selected>200 Rows</option></select>
  </div>
  <div class="overflow-x-auto border rounded-lg"><table class="min-w-full text-xs text-left"><thead class="bg-slate-800 text-white uppercase text-[10px]"><tr><th class="px-4 py-3">Barcode</th><th class="px-4 py-3">SKU Code</th><th class="px-4 py-3">Description Name</th><th class="px-4 py-3">UOM</th><th class="px-4 py-3">Pack Size</th></tr></thead><tbody id="productMasterTableBody"></tbody></table></div>
</div>
<div id="addProductModal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 hidden">
  <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-t-4 border-amber-500">
    <h3 class="text-base font-bold mb-4">Register Master Product Entry</h3>
    <form id="newProductForm" onsubmit="handleMasterProductSubmit(event)" class="space-y-3">
      <input type="text" id="pmBarcode" placeholder="Item Barcode" required class="w-full p-2 border text-sm">
      <input type="text" id="pmSkuCode" placeholder="SKU Code" required class="w-full p-2 border text-sm font-mono">
      <input type="text" id="pmItemName" placeholder="Item Name" required class="w-full p-2 border text-sm">
      <div class="grid grid-cols-2 gap-2"><input type="text" id="pmUom" placeholder="UOM" required class="p-2 border text-sm"><input type="text" id="pmPackSize" placeholder="Pack Size" required class="p-2 border text-sm"></div>
      <div class="grid grid-cols-2 gap-2 pt-2"><button type="button" onclick="toggleAddProductModal(false)" class="bg-slate-200 py-2 rounded text-xs font-bold">Cancel</button><button type="submit" id="saveProductBtn" class="bg-amber-500 py-2 rounded text-xs font-bold">Save Item</button></div>
    </form>
  </div>
</div>`;

function syncProductMasterLocalState(records) {
  var body = document.getElementById('productMasterTableBody'); if(!body) return; body.innerHTML = "";
  document.getElementById('pmTotalCountBadge').innerText = (records ? records.length : 0) + " Items";
  var viewLimit = parseInt(document.getElementById('pmViewLimitSelect').value, 10), visibleCount = 0;
  records.forEach(function(item) {
    if (visibleCount >= viewLimit) return;
    var tr = document.createElement('tr'); tr.className = "border-b hover:bg-slate-50";
    tr.innerHTML = `<td class="px-4 py-2.5 font-mono">${item.barcode}</td><td class="px-4 py-2.5 font-mono font-bold">${item.skuCode}</td><td class="px-4 py-2.5 font-medium">${item.itemName}</td><td class="px-4 py-2.5">${item.uom}</td><td class="px-4 py-2.5 font-mono">${item.packSize}</td>`;
    body.appendChild(tr); visibleCount++;
  });
}

function filterProductMasterViewTable() {
  var q = document.getElementById('pmSearchQuery').value.toLowerCase().trim();
  var viewLimit = parseInt(document.getElementById('pmViewLimitSelect').value, 10);
  var body = document.getElementById('productMasterTableBody'); body.innerHTML = ""; var matches = 0;
  for(var i=0; i < globalProductMasterList.length; i++) {
    var item = globalProductMasterList[i];
    if(!q || (item.barcode + " " + item.skuCode + " " + item.itemName).toLowerCase().includes(q)) {
      if(matches < viewLimit) {
        var tr = document.createElement('tr'); tr.className = "border-b hover:bg-slate-50";
        tr.innerHTML = `<td class="px-4 py-2.5 font-mono">${item.barcode}</td><td class="px-4 py-2.5 font-mono font-bold">${item.skuCode}</td><td class="px-4 py-2.5 font-medium">${item.itemName}</td><td class="px-4 py-2.5">${item.uom}</td><td class="px-4 py-2.5 font-mono">${item.packSize}</td>`;
        body.appendChild(tr);
      }
      matches++;
    }
  }
}

function handleExcelCsvImport(inputEl) {
  var file = inputEl.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = async function(e) {
    var lines = e.target.result.split(/\r\n|\n/), parsed = [];
    for (var i = 1; i < lines.length; i++) {
      var col = lines[i].split(",");
      if (col.length >= 2 && col[1].trim()) {
        parsed.push({ barcode: col[0].replace(/"/g, ""), skuCode: col[1].replace(/"/g, ""), itemName: col[2].replace(/"/g, ""), uom: col[3] ? col[3].replace(/"/g, "") : "PCS", packSize: col[4] ? col[4].replace(/"/g, "") : "1" });
      }
    }
    if(confirm("Import " + parsed.length + " products?")) {
      const res = await callBackend("batchUploadProducts", { parsedRowsArray: parsed }); alert(res.message);
      if(res.success) { const pList = await callBackend("getProductMasterData"); if(Array.isArray(pList)) { globalProductMasterList = pList; syncProductMasterLocalState(pList); } }
    }
  };
  reader.readAsText(file); inputEl.value = "";
}

function downloadProductMasterAsCsv() {
  var content = "\uFEFFBarcode,SKU Code,Item Description Name,UOM,Pack Size\r\n";
  globalProductMasterList.forEach(function(item) { content += `"${item.barcode}","${item.skuCode}","${item.itemName}","${item.uom}","${item.packSize}"\r\n`; });
  var link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' })));
  link.setAttribute("download", "Product_Master.csv"); link.click();
}

function toggleAddProductModal(show) { document.getElementById('addProductModal').classList.toggle('hidden', !show); }

async function handleMasterProductSubmit(e) {
  e.preventDefault(); var btn = document.getElementById('saveProductBtn'); btn.disabled = true;
  var payload = { barcode: document.getElementById('pmBarcode').value.trim(), skuCode: document.getElementById('pmSkuCode').value.trim(), itemName: document.getElementById('pmItemName').value.trim(), uom: document.getElementById('pmUom').value.trim(), packSize: document.getElementById('pmPackSize').value.trim() };
  const res = await callBackend("addProductMasterItem", { itemPayload: payload }); btn.disabled = false; btn.innerText = "Save Item";
  if(res.success) { toggleAddProductModal(false); const pList = await callBackend("getProductMasterData"); if(Array.isArray(pList)) { globalProductMasterList = pList; syncProductMasterLocalState(pList); } }
}
