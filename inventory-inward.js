document.getElementById('inventoryFormPlaceholder').innerHTML = `
<div id="inventoryFormBlock" class="hidden">
  <h2 class="text-lg font-bold border-b pb-2 mb-4 text-slate-700">Inventory Operations Stream (Tab4)</h2>
  <form id="inventoryLogForm" onsubmit="handleInventorySubmit(event)" oninput="saveInventoryToCache()">
    <div class="bg-slate-100 p-4 rounded-xl border mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="invDateInput" required class="w-full p-2 border rounded-md text-sm bg-white"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">PO / Invoice No *</label><input type="text" id="invPoInvoiceNo" required class="w-full p-2 border rounded-md text-sm bg-white font-mono"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Customer Name *</label><input type="text" id="invCustomerName" required class="w-full p-2 border rounded-md text-sm bg-white"></div>
      <div>
        <label class="block text-xs font-bold text-gray-600 mb-1">Inward Incharge *</label>
        <select id="invInchargeSelect" required onchange="toggleOtherInput(this, 'invInchargeOtherContainer', 'invInchargeOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select</option></select>
        <div id="invInchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="invInchargeOtherInput" class="w-full p-1.5 border rounded-md text-sm bg-amber-50"></div>
      </div>
      <div>
        <label class="block text-xs font-bold text-gray-600 mb-1">Transporter *</label>
        <select id="invTransporterSelect" required onchange="toggleOtherInput(this, 'invTransporterOtherContainer', 'invTransporterOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select</option></select>
        <div id="invTransporterOtherContainer" class="mt-1.5 hidden"><input type="text" id="invTransporterOtherInput" class="w-full p-1.5 border rounded-md text-sm bg-amber-50"></div>
      </div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle No *</label><input type="text" id="invVehicleNo" required class="w-full p-2 border rounded-md text-sm uppercase bg-white font-mono"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Name *</label><input type="text" id="invDriverName" required class="w-full p-2 border rounded-md text-sm bg-white"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Number *</label><input type="tel" id="invDriverNumber" required pattern="[0-9]{10}" class="w-full p-2 border rounded-md text-sm bg-white font-mono"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">LR No *</label><input type="text" id="invLrNo" required class="w-full p-2 border rounded-md text-sm bg-white font-mono"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">PO Total Qty *</label><input type="number" id="invPoTotalQty" min="1" required class="w-full p-2 border rounded-md text-sm bg-white font-bold"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">PO Total Box Qty *</label><input type="number" id="invPoTotalBoxQty" min="1" required class="w-full p-2 border rounded-md text-sm bg-white font-bold"></div>
    </div>
    <div class="border-t border-b py-4 my-4 bg-slate-50 p-3 rounded-lg">
      <h3 class="text-sm font-bold text-slate-700 mb-3">Physical Inward Material Matrix</h3>
      <div id="inventoryItemsContainer" class="space-y-4"></div>
      <div class="flex justify-end mt-4"><button type="button" onclick="addInventoryItemRow()" class="bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded shadow-sm">+ Add Material Row</button></div>
    </div>
    <button type="submit" id="invSubmitBtn" class="w-full brand-bg text-white py-3 rounded-md font-bold text-sm shadow">Commit Material Logs to Tab4 Ledger</button>
  </form>
</div>`;

function populateDropdownsInv(dropdowns) {
  var transSelect = document.getElementById('invTransporterSelect');
  if(transSelect && transSelect.children.length <= 1) {
    dropdowns.transporters.forEach(item => { var opt = document.createElement('option'); opt.value = item; opt.innerText = item; transSelect.appendChild(opt); });
    var otherOpt = document.createElement('option'); otherOpt.value = "Other"; otherOpt.innerText = "Other (Type)"; transSelect.appendChild(otherOpt);
  }
  var inchSelect = document.getElementById('invInchargeSelect');
  if(inchSelect && inchSelect.children.length <= 1) {
    dropdowns.incharges.forEach(item => { var opt = document.createElement('option'); opt.value = item; opt.innerText = item; inchSelect.appendChild(opt); });
    var otherOpt2 = document.createElement('option'); otherOpt2.value = "Other"; otherOpt2.innerText = "Other (Type)"; inchSelect.appendChild(otherOpt2);
  }
}

function initInventorySearchableDropdownEngine() {
  var container = document.getElementById('inventoryItemsContainer'); if(container && container.children.length === 0) addInventoryItemRow();
  loadInventoryFromCache();
}

function addInventoryItemRow(savedItem='', savedBarcode='', savedSku='', savedBatch='', savedQty='', savedBox='', savedStatus='Pending') {
  var container = document.getElementById('inventoryItemsContainer'); if (!container) return;
  var uniqueRowId = 'invRow_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  var html = `
    <div id="${uniqueRowId}" class="bg-white p-3 border rounded-lg shadow-xs space-y-2 relative" data-selected-item="${savedItem}" data-selected-barcode="${savedBarcode}" data-selected-sku="${savedSku}">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="relative"><label class="block text-[10px] uppercase font-bold text-gray-400">Barcode ID *</label><input type="text" value="${savedBarcode}" onfocus="showInvSearchDropdown('${uniqueRowId}', 'barcode')" onkeyup="filterInvSearchDropdown('${uniqueRowId}', 'barcode')" class="inv-barcode-search-input w-full p-1.5 border text-sm rounded bg-white font-mono"><div class="inv-barcode-dropdown-list hidden absolute left-0 right-0 max-h-40 overflow-y-auto bg-white border rounded shadow-lg z-50 mt-1 divide-y text-xs"></div></div>
        <div class="relative"><label class="block text-[10px] uppercase font-bold text-gray-400">Item Name *</label><input type="text" value="${savedItem}" onfocus="showInvSearchDropdown('${uniqueRowId}', 'item')" onkeyup="filterInvSearchDropdown('${uniqueRowId}', 'item')" class="inv-item-search-input w-full p-1.5 border text-sm rounded bg-white"><div class="inv-item-dropdown-list hidden absolute left-0 right-0 max-h-40 overflow-y-auto bg-white border rounded shadow-lg z-50 mt-1 divide-y text-xs"></div></div>
        <div class="relative"><label class="block text-[10px] uppercase font-bold text-gray-400">SKU Code *</label><input type="text" value="${savedSku}" onfocus="showInvSearchDropdown('${uniqueRowId}', 'sku')" onkeyup="filterInvSearchDropdown('${uniqueRowId}', 'sku')" class="inv-sku-search-input w-full p-1.5 border text-sm rounded bg-white font-mono font-bold"><div class="inv-sku-dropdown-list hidden absolute left-0 right-0 max-h-40 overflow-y-auto bg-white border rounded shadow-lg z-50 mt-1 divide-y text-xs"></div></div>
      </div>
      <div class="grid grid-cols-4 gap-2 pt-1">
        <div><label class="block text-[10px] uppercase font-bold text-gray-400">Batch No *</label><input type="text" value="${savedBatch}" required class="inv-batch-no w-full p-1.5 border text-sm rounded font-mono bg-white"></div>
        <div><label class="block text-[10px] uppercase font-bold text-gray-400">Physical Qty *</label><input type="number" value="${savedQty}" min="1" required class="inv-total-qty w-full p-1.5 border text-sm rounded font-bold bg-white"></div>
        <div><label class="block text-[10px] uppercase font-bold text-gray-400">No of Box *</label><input type="number" value="${savedBox}" min="1" required class="inv-no-of-box w-full p-1.5 border text-sm rounded bg-white"></div>
        <div><label class="block text-[10px] uppercase font-bold text-gray-400">Status *</label><select class="inv-status w-full p-1.5 border text-sm rounded bg-white font-semibold text-slate-700"><option value="Pending" ${savedStatus === 'Pending' ? 'selected' : ''}>Pending</option><option value="Closed" ${savedStatus === 'Closed' ? 'selected' : ''}>Closed</option></select></div>
      </div>
      ${container.children.length > 0 ? `<button type="button" onclick="document.getElementById('${uniqueRowId}').remove(); saveInventoryToCache();" class="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">✕</button>` : ''}
    </div>`;
  container.insertAdjacentHTML('beforeend', html); buildDropdownDomTreeLists(uniqueRowId);
}

function saveInventoryToCache() {
  if(workflowDept !== "Inventory Logging") return;
  var rows = document.getElementById('inventoryItemsContainer').children, items = [];
  for(var i=0; i<rows.length; i++) {
    items.push({
      item: rows[i].getAttribute('data-selected-item') || rows[i].querySelector('.inv-item-search-input').value,
      barcode: rows[i].getAttribute('data-selected-barcode') || rows[i].querySelector('.inv-barcode-search-input').value,
      sku: rows[i].getAttribute('data-selected-sku') || rows[i].querySelector('.inv-sku-search-input').value,
      batch: rows[i].querySelector('.inv-batch-no').value, qty: rows[i].querySelector('.inv-total-qty').value,
      box: rows[i].querySelector('.inv-no-of-box').value, status: rows[i].querySelector('.inv-status').value
    });
  }
  var cache = { date: document.getElementById('invDateInput').value, poInvoiceNo: document.getElementById('invPoInvoiceNo').value, customerName: document.getElementById('invCustomerName').value, incharge: document.getElementById('invInchargeSelect').value, inchargeOther: document.getElementById('invInchargeOtherInput').value, transporter: document.getElementById('invTransporterSelect').value, transporterOther: document.getElementById('invTransporterOtherInput').value, vehicleNo: document.getElementById('invVehicleNo').value, driverName: document.getElementById('invDriverName').value, driverNumber: document.getElementById('invDriverNumber').value, lrNo: document.getElementById('invLrNo').value, poTotalQty: document.getElementById('invPoTotalQty').value, poTotalBoxQty: document.getElementById('invPoTotalBoxQty').value, items: items };
  localStorage.setItem('cached_inventory_stream', JSON.stringify(cache));
}

function loadInventoryFromCache() {
  try {
    var raw = localStorage.getItem('cached_inventory_stream'); if (!raw) return; var cache = JSON.parse(raw);
    document.getElementById('invDateInput').value = cache.date || ""; document.getElementById('invPoInvoiceNo').value = cache.poInvoiceNo || "";
    document.getElementById('invCustomerName').value = cache.customerName || ""; document.getElementById('invInchargeSelect').value = cache.incharge || "";
    document.getElementById('invInchargeOtherInput').value = cache.inchargeOther || ""; if(cache.incharge === "Other") document.getElementById('invInchargeOtherContainer').classList.remove('hidden');
    document.getElementById('invTransporterSelect').value = cache.transporter || ""; document.getElementById('invTransporterOtherInput').value = cache.transporterOther || "";
    if(cache.transporter === "Other") document.getElementById('invTransporterOtherContainer').classList.remove('hidden');
    document.getElementById('invVehicleNo').value = cache.vehicleNo || ""; document.getElementById('invDriverName').value = cache.driverName || "";
    document.getElementById('invDriverNumber').value = cache.driverNumber || ""; document.getElementById('invLrNo').value = cache.lrNo || "";
    document.getElementById('invPoTotalQty').value = cache.poTotalQty || ""; document.getElementById('invPoTotalBoxQty').value = cache.poTotalBoxQty || "";
    if(cache.items && cache.items.length > 0) { document.getElementById('inventoryItemsContainer').innerHTML = ""; cache.items.forEach(r => addInventoryItemRow(r.item, r.barcode, r.sku, r.batch, r.qty, r.box, r.status)); }
  } catch(e){}
}

function buildDropdownDomTreeLists(rowId) {
  var row = document.getElementById(rowId);
  var barList = row.querySelector('.inv-barcode-dropdown-list'), itemList = row.querySelector('.inv-item-dropdown-list'), skuList = row.querySelector('.inv-sku-dropdown-list');
  barList.innerHTML = ""; itemList.innerHTML = ""; skuList.innerHTML = "";
  globalProductMasterList.forEach(function(prod) {
    var d1 = document.createElement('div'); d1.className = "p-2 hover:bg-amber-50 cursor-pointer"; d1.innerText = prod.barcode + " (" + prod.itemName + ")"; d1.onclick = function() { selectInvProductData(rowId, prod); saveInventoryToCache(); }; barList.appendChild(d1);
    var d2 = document.createElement('div'); d2.className = "p-2 hover:bg-amber-50 cursor-pointer"; d2.innerText = prod.itemName; d2.onclick = function() { selectInvProductData(rowId, prod); saveInventoryToCache(); }; itemList.appendChild(d2);
    var d3 = document.createElement('div'); d3.className = "p-2 hover:bg-amber-50 cursor-pointer font-bold"; d3.innerText = prod.skuCode; d3.onclick = function() { selectInvProductData(rowId, prod); saveInventoryToCache(); }; skuList.appendChild(d3);
  });
}

function showInvSearchDropdown(rowId, type) { hideAllInvDropdownLists(); var row = document.getElementById(rowId); row.querySelector('.inv-' + type + '-dropdown-list').classList.remove('hidden'); }
function filterInvSearchDropdown(rowId, type) { var row = document.getElementById(rowId); var val = row.querySelector('.inv-' + type + '-search-input').value.toLowerCase(); var opt = row.querySelector('.inv-' + type + '-dropdown-list').children; for(var i=0; i<opt.length; i++) opt[i].className = opt[i].textContent.toLowerCase().includes(val) ? "p-2 hover:bg-amber-50 cursor-pointer" : "hidden"; }
function selectInvProductData(rowId, prod) { var row = document.getElementById(rowId); row.querySelector('.inv-barcode-search-input').value = prod.barcode; row.querySelector('.inv-item-search-input').value = prod.itemName; row.querySelector('.inv-sku-search-input').value = prod.skuCode; row.setAttribute('data-selected-item', prod.itemName); row.setAttribute('data-selected-barcode', prod.barcode); row.setAttribute('data-selected-sku', prod.skuCode); hideAllInvDropdownLists(); }
function hideAllInvDropdownLists() { document.querySelectorAll('.inv-barcode-dropdown-list, .inv-item-dropdown-list, .inv-sku-dropdown-list').forEach(el => el.classList.add('hidden')); }
document.addEventListener('click', e => { if(!e.target.closest('.inv-item-search-input') && !e.target.closest('.inv-sku-search-input') && !e.target.closest('.inv-barcode-search-input')) hideAllInvDropdownLists(); });

async function handleInventorySubmit(e) {
  e.preventDefault(); var sBtn = document.getElementById('invSubmitBtn'); var rows = document.getElementById('inventoryItemsContainer').children, items = [];
  for (var i=0; i<rows.length; i++) {
    items.push({ itemName: rows[i].getAttribute('data-selected-item'), barcode: rows[i].getAttribute('data-selected-barcode'), skuCode: rows[i].getAttribute('data-selected-sku'), batchNo: rows[i].querySelector('.inv-batch-no').value.trim(), physicalQuantity: rows[i].querySelector('.inv-total-qty').value.trim(), boxCount: rows[i].querySelector('.inv-no-of-box').value.trim(), status: rows[i].querySelector('.inv-status').value });
  }
  var finalTransporter = document.getElementById('invTransporterSelect').value === "Other" ? document.getElementById('invTransporterOtherInput').value : document.getElementById('invTransporterSelect').value;
  var finalIncharge = document.getElementById('invInchargeSelect').value === "Other" ? document.getElementById('invInchargeOtherInput').value : document.getElementById('invInchargeSelect').value;
  sBtn.disabled = true; sBtn.innerText = "Transmitting...";
  var parentPayload = { date: document.getElementById('invDateInput').value, poInvoiceNo: document.getElementById('invPoInvoiceNo').value.trim(), customerName: document.getElementById('invCustomerName').value.trim(), poTotalQty: document.getElementById('invPoTotalQty').value, poTotalBoxQty: document.getElementById('invPoTotalBoxQty').value, vehicleNo: document.getElementById('invVehicleNo').value.trim(), transporter: finalTransporter, driverName: document.getElementById('invDriverName').value.trim(), driverNumber: document.getElementById('invDriverNumber').value.trim(), lrNo: document.getElementById('invLrNo').value.trim(), incharge: finalIncharge, items: items };

  const res = await callBackend("submitInventoryLogs", { inventoryData: parentPayload }); sBtn.disabled = false; sBtn.innerText = "Commit Material Logs";
  if(res.success) {
    localStorage.removeItem('cached_inventory_stream');
    var pPayload = { date: parentPayload.date, time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), department: "Inventory Inward", transporter: parentPayload.transporter, vehicleNo: parentPayload.vehicleNo, driverName: parentPayload.driverName, driverMobile: parentPayload.driverNumber, palletCount: "0", incharge: parentPayload.incharge, poInvoiceNo: parentPayload.poInvoiceNo, lrNo: parentPayload.lrNo, invoices: parentPayload.items };
    renderPrintLayout(pPayload, res.seriesNo); document.getElementById('inventoryLogForm').reset();
    document.getElementById('inventoryItemsContainer').innerHTML = ""; addInventoryItemRow(); alert("Logged under No: " + res.seriesNo); fetchLiveDashboardDataRecords();
  } else alert(res.message);
}
