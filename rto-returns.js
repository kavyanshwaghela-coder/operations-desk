document.getElementById('rtoFormPlaceholder').innerHTML = `
<div id="rtoFormBlock" class="hidden">
  <div class="flex border-b mb-6 bg-slate-100 p-1 rounded-lg max-w-md">
    <button type="button" id="rtoB2bToggleTab" onclick="switchRtoSubWorkflow('B2B')" class="w-1/2 py-2 rounded-md text-xs font-bold uppercase transition-all bg-slate-900 text-amber-400">📦 B2B Return</button>
    <button type="button" id="rtoB2cToggleTab" onclick="switchRtoSubWorkflow('B2C')" class="w-1/2 py-2 rounded-md text-xs font-bold uppercase transition-all text-slate-600 hover:text-slate-900">🛵 B2C Courier Return</button>
  </div>
  <!-- B2B WORKSPACE SUB-FORM LAYER -->
  <div id="rtoB2bLayoutSection">
    <h2 class="text-base font-bold text-slate-700 mb-4">B2B Return Log Matrix (Tab5)</h2>
    <form id="rtoB2bForm" onsubmit="handleRtoB2bSubmit(event)">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="rtoB2bDate" required class="w-full p-2 border rounded-md text-sm bg-white"></div>
        <div><label class="block text-xs font-bold text-gray-600 mb-1">Invoice No *</label><input type="text" id="rtoB2bInvoice" required class="w-full p-2 border rounded-md text-sm font-mono bg-white"></div>
        <div><label class="block text-xs font-bold text-gray-600 mb-1">LR No *</label><input type="text" id="rtoB2bLrNo" required class="w-full p-2 border rounded-md text-sm font-mono bg-white"></div>
        <div>
          <label class="block text-xs font-bold text-gray-600 mb-1">Return Incharge *</label>
          <select id="rtoB2bInchargeSelect" required onchange="toggleOtherInput(this, 'rtoB2bInchargeOtherContainer', 'rtoB2bInchargeOtherInput')" class="rto-inch-drop w-full p-2 border rounded-md bg-white text-sm"><option value="">Select</option></select>
          <div id="rtoB2bInchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2bInchargeOtherInput" class="w-full p-1.5 border rounded-md bg-amber-50 text-sm"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label class="block text-xs font-bold text-gray-600 mb-1">Transporter *</label>
          <select id="rtoB2bTransporterSelect" required onchange="toggleOtherInput(this, 'rtoB2bTransporterOtherContainer', 'rtoB2bTransporterOtherInput')" class="rto-trans-drop w-full p-2 border rounded-md bg-white text-sm"><option value="">Select</option></select>
          <div id="rtoB2bTransporterOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2bTransporterOtherInput" class="w-full p-1.5 border rounded-md bg-amber-50 text-sm"></div>
        </div>
        <div><label class="block text-xs font-bold text-gray-600 mb-1">Box Qty *</label><input type="number" id="rtoB2bBoxQty" min="1" required class="w-full p-2 border rounded-md text-sm bg-white"></div>
        <div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle No *</label><input type="text" id="rtoB2bVehicle" required class="w-full p-2 border rounded-md text-sm uppercase font-mono bg-white"></div>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-4 border-t pt-3"><input type="text" id="rtoB2bDriver" placeholder="Driver Name" required class="p-2 border rounded text-sm"><input type="tel" id="rtoB2bMobile" pattern="[0-9]{10}" placeholder="Driver Mobile" required class="p-2 border rounded text-sm font-mono"></div>
      <div class="mb-6"><label class="block text-xs font-bold text-red-600 mb-1">Damage Remark *</label><input type="text" id="rtoB2bRemark" required placeholder="Describe item damages..." class="w-full p-2 border rounded-md text-sm bg-white"></div>
      <button type="submit" id="rtoB2bSubmitBtn" class="w-full brand-bg text-white py-3 rounded-md font-bold text-sm shadow">Log B2B Return Entry</button>
    </form>
  </div>
  <!-- B2C COURIER WORKSPACE SUB-FORM LAYER -->
  <div id="rtoB2cLayoutSection" class="hidden">
    <h2 class="text-base font-bold text-slate-700 mb-4">B2C Return Log Matrix (Tab6)</h2>
    <form id="rtoB2cForm" onsubmit="handleRtoB2cSubmit(event)">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="rtoB2cDate" required class="w-full p-2 border rounded bg-white text-sm"></div>
        <div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle No *</label><input type="text" id="rtoB2cVehicle" required class="w-full p-2 border rounded font-mono uppercase text-sm"></div>
        <div>
          <label class="block text-xs font-bold text-gray-600 mb-1">Courier *</label>
          <select id="rtoB2cCourierSelect" required onchange="toggleOtherInput(this, 'rtoB2cCourierOtherContainer', 'rtoB2cCourierOtherInput')" class="rto-trans-drop w-full p-2 border rounded bg-white text-sm"><option value="">Select</option></select>
          <div id="rtoB2cCourierOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2cCourierOtherInput" class="w-full p-1.5 border rounded text-sm bg-amber-50"></div>
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-600 mb-1">Incharge *</label>
          <select id="rtoB2cInchargeSelect" required onchange="toggleOtherInput(this, 'rtoB2cInchargeOtherContainer', 'rtoB2cInchargeOtherInput')" class="rto-inch-drop w-full p-2 border rounded bg-white text-sm"><option value="">Select</option></select>
          <div id="rtoB2cInchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2cInchargeOtherInput" class="w-full p-1.5 border rounded text-sm bg-amber-50"></div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-4 pt-2 border-t"><input type="text" id="rtoB2cDriver" placeholder="Rider Name" required class="p-2 border rounded text-sm"><input type="tel" id="rtoB2cMobile" pattern="[0-9]{10}" placeholder="Rider Mobile" required class="p-2 border rounded text-sm font-mono"></div>
      <div class="mb-4"><label class="block text-xs font-bold text-red-600 mb-1">Global Return Remark *</label><input type="text" id="rtoB2cCommonRemark" required value="No Damage" class="w-full p-2 border rounded text-sm bg-white"></div>
      <div class="border p-3 rounded-lg mb-4 bg-slate-50">
        <h3 class="text-xs font-bold text-slate-700 mb-2 uppercase">AWB Dynamic Grid Matrix</h3>
        <div id="rtoB2cAwbContainer" class="space-y-2"></div>
        <div class="flex justify-end mt-2"><button type="button" onclick="addRtoB2cAwbRow()" class="bg-emerald-600 text-white text-xs py-1.5 px-3 rounded shadow-xs">+ Add AWB Code</button></div>
      </div>
      <button type="submit" id="rtoB2cSubmitBtn" class="w-full bg-amber-500 text-slate-950 py-3 rounded-md font-bold text-sm shadow">Log B2C Return Entries</button>
    </form>
  </div>
</div>`;

function initRtoWorkflowSettings() {
  var d1 = document.getElementById('rtoB2bDate'), d2 = document.getElementById('rtoB2cDate');
  if(d1) d1.value = new Date().toISOString().split('T')[0]; if(d2) d2.value = new Date().toISOString().split('T')[0];
}

function populateDropdownsRto(dropdowns) {
  document.querySelectorAll('.rto-trans-drop').forEach(select => {
    if(!select || select.children.length > 1) return;
    dropdowns.transporters.forEach(item => { var opt = document.createElement('option'); opt.value = item; opt.innerText = item; select.appendChild(opt); });
    var otherOpt = document.createElement('option'); otherOpt.value = "Other"; otherOpt.innerText = "Other (Type)"; select.appendChild(otherOpt);
  });
  document.querySelectorAll('.rto-inch-drop').forEach(select => {
    if(!select || select.children.length > 1) return;
    dropdowns.incharges.forEach(item => { var opt = document.createElement('option'); opt.value = item; opt.innerText = item; select.appendChild(opt); });
    var otherOpt2 = document.createElement('option'); otherOpt2.value = "Other"; otherOpt2.innerText = "Other (Type)"; select.appendChild(otherOpt2);
  });
  if(document.getElementById('rtoB2cAwbContainer').children.length === 0) addRtoB2cAwbRow();
}

function addRtoB2cAwbRow() {
  var container = document.getElementById('rtoB2cAwbContainer'); if (!container) return;
  var rowId = 'b2cAwb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  var html = `
    <div id="${rowId}" class="flex items-center space-x-2 bg-white p-2 border rounded shadow-xs relative">
      <div class="w-full"><label class="block text-[9px] uppercase font-bold text-gray-400">AWB Number *</label><input type="text" required class="b2c-awb-input w-full p-1.5 border text-xs rounded font-mono font-bold bg-white"></div>
      ${container.children.length > 0 ? `<button type="button" onclick="document.getElementById('${rowId}').remove();" class="bg-red-500 text-white h-9 px-3 mt-4 rounded font-bold">✕</button>` : ''}
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
}

function switchRtoSubWorkflow(mode) {
  currentActiveRtoWorkflowSubMode = mode;
  var b2bTab = document.getElementById('rtoB2bToggleTab'), b2cTab = document.getElementById('rtoB2cToggleTab');
  var b2bBlock = document.getElementById('rtoB2bLayoutSection'), b2cBlock = document.getElementById('rtoB2cLayoutSection');
  if(mode === "B2B") {
    b2bBlock.classList.remove('hidden'); b2cBlock.classList.add('hidden');
    b2bTab.className = "w-1/2 text-center py-2 px-4 rounded-md text-xs font-bold uppercase bg-slate-900 text-amber-400 shadow-sm";
    b2cTab.className = "w-1/2 text-center py-2 px-4 rounded-md text-xs font-bold uppercase text-slate-600 hover:text-slate-900";
  } else {
    b2bBlock.classList.add('hidden'); b2cBlock.classList.remove('hidden');
    b2cTab.className = "w-1/2 text-center py-2 px-4 rounded-md text-xs font-bold uppercase bg-amber-500 text-slate-950 shadow-sm";
    b2bTab.className = "w-1/2 text-center py-2 px-4 rounded-md text-xs font-bold uppercase text-slate-600 hover:text-slate-900";
  }
}

async function handleRtoB2bSubmit(e) {
  e.preventDefault(); var sBtn = document.getElementById('rtoB2bSubmitBtn');
  var finalTransporter = document.getElementById('rtoB2bTransporterSelect').value === "Other" ? document.getElementById('rtoB2bTransporterOtherInput').value : document.getElementById('rtoB2bTransporterSelect').value;
  var finalIncharge = document.getElementById('rtoB2bInchargeSelect').value === "Other" ? document.getElementById('rtoB2bInchargeOtherInput').value : document.getElementById('rtoB2bInchargeSelect').value;
  sBtn.disabled = true; sBtn.innerText = "Transmitting...";
  var payload = { date: document.getElementById('rtoB2bDate').value, invoiceNo: document.getElementById('rtoB2bInvoice').value.trim(), lrNo: document.getElementById('rtoB2bLrNo').value.trim(), transporter: finalTransporter, boxQty: document.getElementById('rtoB2bBoxQty').value, vehicleNo: document.getElementById('rtoB2bVehicle').value.trim(), driverName: document.getElementById('rtoB2bDriver').value.trim(), driverMobile: document.getElementById('rtoB2bMobile').value.trim(), remark: document.getElementById('rtoB2bRemark').value.trim(), incharge: finalIncharge, status: "Pending" };

  const res = await callBackend("submitRtoB2bLog", { rtoB2bPayload: payload }); sBtn.disabled = false; sBtn.innerText = "Log B2B Return Entry";
  if(res.success) {
    var pPayload = { date: payload.date, time: "--:--", department: "B2B Return", transporter: payload.transporter, vehicleNo: payload.vehicleNo, driverName: payload.driverName, driverMobile: payload.driverMobile, palletCount: "0", incharge: payload.incharge, globalRemark: payload.remark, invoices: [{ invoiceNum: payload.invoiceNo, boxCount: payload.boxQty, lrNo: payload.lrNo }] };
    renderPrintLayout(pPayload, res.seriesNo); document.getElementById('rtoB2bForm').reset(); initRtoWorkflowSettings(); alert("Logged under ID: " + res.seriesNo); fetchLiveDashboardDataRecords();
  } else alert(res.message);
}

async function handleRtoB2cSubmit(e) {
  e.preventDefault(); var sBtn = document.getElementById('rtoB2cSubmitBtn'); var rows = document.getElementById('rtoB2cAwbContainer').children, records = [], commonRemark = document.getElementById('rtoB2cCommonRemark').value.trim();
  for (var i = 0; i < rows.length; i++) { var awb = rows[i].querySelector('.b2c-awb-input').value.trim(); if (awb) records.push({ awbNo: awb, status: "Pending" }); }
  if(records.length === 0) { alert("Provide an entry row."); return; }
  var finalCourier = document.getElementById('rtoB2cCourierSelect').value === "Other" ? document.getElementById('rtoB2cCourierOtherInput').value : document.getElementById('rtoB2cCourierSelect').value;
  var finalIncharge = document.getElementById('rtoB2cInchargeSelect').value === "Other" ? document.getElementById('rtoB2cInchargeOtherInput').value : document.getElementById('rtoB2cInchargeSelect').value;
  sBtn.disabled = true; sBtn.innerText = "Transmitting...";
  var payload = { date: document.getElementById('rtoB2cDate').value, vehicleNo: document.getElementById('rtoB2cVehicle').value.trim(), courierOrTransporter: finalCourier, driverName: document.getElementById('rtoB2cDriver').value.trim(), driverMobile: document.getElementById('rtoB2cMobile').value.trim(), remark: commonRemark, incharge: finalIncharge, records: records };

  const res = await callBackend("submitRtoB2cBulkMatrix", { rtoB2cPayload: payload }); sBtn.disabled = false; sBtn.innerText = "Log B2C Return Entries";
  if(res.success) {
    var printInvoices = payload.records.map(item => { return { invoiceNum: item.awbNo, boxCount: "1", lrNo: "" }; });
    var pPayload = { date: payload.date, time: "--:--", department: "B2C Return", transporter: payload.courierOrTransporter, vehicleNo: payload.vehicleNo, driverName: payload.driverName, driverMobile: payload.driverMobile, palletCount: "0", incharge: payload.incharge, globalRemark: commonRemark, invoices: printInvoices };
    renderPrintLayout(pPayload, res.seriesNo); document.getElementById('rtoB2cForm').reset();
    document.getElementById('rtoB2cAwbContainer').innerHTML = ""; addRtoB2cAwbRow(); initRtoWorkflowSettings(); document.getElementById('rtoB2cCommonRemark').value = "No Damage"; alert("Logged under token: " + res.seriesNo); fetchLiveDashboardDataRecords();
  } else alert(res.message);
}
