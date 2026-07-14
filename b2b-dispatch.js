// Append the raw HTML block structure string straight to the placeholder zone
document.getElementById('b2bFormPlaceholder').innerHTML = `
<div id="b2bDispatchFormBlock" class="hidden">
  <h2 class="text-lg font-bold border-b pb-2 mb-4 text-slate-700">Daily Execution Input Stream (Tab1)</h2>
  <div id="liveDuplicateWarningBox" class="hidden mb-4 bg-red-100 border border-red-400 text-red-800 rounded-lg p-4 space-y-2">
    <strong>⚠️ DUPLICATE INVOICE DETECTED IN SYSTEM</strong>
    <div class="grid grid-cols-4 gap-3 bg-white border rounded p-2.5 text-xs font-mono text-gray-700">
      <div><span>Series ID:</span> <span id="dupSeries" class="font-bold text-red-600"></span></div>
      <div><span>LR No:</span> <span id="dupLr"></span></div>
      <div><span>Date:</span> <span id="dupDate"></span></div>
      <div><span>Transporter:</span> <span id="dupTrans"></span></div>
    </div>
  </div>
  <form id="entryForm" onsubmit="handleFormSubmit(event)" oninput="saveToLocalStorage()">
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="dateInput" required class="w-full p-2 border rounded-md text-sm bg-white"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Time *</label><input type="time" id="timeInput" required class="w-full p-2 border rounded-md text-sm bg-white"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Department</label><input type="text" id="deptDisplayField" readonly class="w-full p-2 border rounded-md bg-slate-50 font-semibold text-sm text-slate-700"></div>
      <div>
        <label class="block text-xs font-bold text-gray-600 mb-1">Transporter *</label>
        <select id="transporterSelect" required onchange="toggleOtherInput(this, 'transporterOtherContainer', 'transporterOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select</option></select>
        <div id="transporterOtherContainer" class="mt-1.5 hidden"><input type="text" id="transporterOtherInput" placeholder="Type Transporter" class="w-full p-1.5 border rounded-md bg-amber-50 text-sm"></div>
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 border-t pt-3 border-slate-100">
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle Registration No. *</label><input type="text" id="vehicleNo" required placeholder="MH-12-XX-1234" class="w-full p-2 border rounded-md text-sm uppercase"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Full Name *</label><input type="text" id="driverName" required placeholder="Driver Name" class="w-full p-2 border rounded-md text-sm"></div>
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Mobile Number *</label><input type="tel" id="driverMobile" required pattern="[0-9]{10}" placeholder="10-Digit Mobile" class="w-full p-2 border rounded-md text-sm"></div>
    </div>
    <div class="border-t border-b border-gray-200 py-4 my-4 bg-slate-50 p-3 rounded-lg">
      <h3 class="text-sm font-bold text-slate-700 mb-3">Invoices Breakdown Log</h3>
      <div id="invoiceContainer" class="space-y-3"></div>
      <div class="flex justify-end mt-4"><button type="button" onclick="addInvoiceRow()" class="bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded shadow-sm">+ Add Invoice Row</button></div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      <div><label class="block text-xs font-bold text-gray-600 mb-1">Pallet Count</label><input type="number" id="palletCount" min="0" class="w-full p-2 border rounded-md text-sm"></div>
      <div>
        <label class="block text-xs font-bold text-gray-600 mb-1">Incharge Assigned *</label>
        <select id="inchargeSelect" required onchange="toggleOtherInput(this, 'inchargeOtherContainer', 'inchargeOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select</option></select>
        <div id="inchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="inchargeOtherInput" placeholder="Type Incharge" class="w-full p-1.5 border rounded-md bg-amber-50 text-sm"></div>
      </div>
    </div>
    <button type="submit" id="submitBtn" class="w-full brand-bg text-white py-3 rounded-md font-bold text-sm tracking-wide shadow">Submit & Generate Gatepass</button>
  </form>
</div>`;

function populateDropdownsB2b(dropdowns) {
  populateDropdown('transporterSelect', dropdowns.transporters);
  populateDropdown('inchargeSelect', dropdowns.incharges);
  initB2bFormCacheLoad();
}

function initB2bFormCacheLoad() {
  if(document.getElementById('invoiceContainer').children.length === 0) addInvoiceRow();
  try {
    var rawCache = localStorage.getItem('cached_form_B2B_Dispatch');
    if (rawCache && workflowDept === "B2B Dispatch") loadFromLocalStorage(JSON.parse(rawCache));
  } catch (e) {}
}

function populateDropdown(id, items) {
  var select = document.getElementById(id);
  if(!select || select.children.length > 1) return;
  items.forEach(function(item) {
    var opt = document.createElement('option'); opt.value = item; opt.innerText = item;
    select.appendChild(opt);
  });
  var otherOpt = document.createElement('option'); otherOpt.value = "Other"; otherOpt.innerText = "Other (Type Input)";
  select.appendChild(otherOpt);
}

async function executeLiveDuplicateCheck(inputElement) {
  var val = inputElement.value.trim();
  if (!val) return;
  const res = await callBackend("checkInvoiceDuplicateLive", { invoiceNum: val });
  var warnBox = document.getElementById('liveDuplicateWarningBox');
  if (res.isDuplicate) {
    inputElement.classList.add('border-red-500', 'bg-red-50');
    document.getElementById('dupSeries').innerText = res.seriesNo;
    document.getElementById('dupLr').innerText = res.lrNo;
    document.getElementById('dupDate').innerText = res.date;
    document.getElementById('dupTrans').innerText = res.transporter;
    warnBox.classList.remove('hidden');
    isSubmissionHaltedForDuplicate = true;
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitBtn').innerText = "LOCKED: DUPLICATE FOUND";
  } else {
    inputElement.classList.remove('border-red-500', 'bg-red-50');
    evaluateFormSubmissionSubmissionValidityState();
  }
}

function evaluateFormSubmissionSubmissionValidityState() {
  var inputs = document.querySelectorAll('.invoice-num');
  var foundDupInForm = false;
  for(var i=0; i<inputs.length; i++) {
    if(inputs[i].classList.contains('border-red-500')) { foundDupInForm = true; break; }
  }
  var warnBox = document.getElementById('liveDuplicateWarningBox');
  var submitBtn = document.getElementById('submitBtn');
  if(!foundDupInForm && submitBtn) {
    warnBox.classList.add('hidden'); isSubmissionHaltedForDuplicate = false;
    submitBtn.disabled = false; submitBtn.innerText = "Submit & Generate Gatepass";
  }
}

function toggleOtherInput(selectElement, containerId, inputId) {
  var container = document.getElementById(containerId);
  var input = document.getElementById(inputId);
  if (selectElement.value === "Other") {
    container.classList.remove('hidden'); input.required = true; input.focus();
  } else {
    container.classList.add('hidden'); input.required = false; input.value = "";
  }
  saveToLocalStorage();
}

function addInvoiceRow(savedNum = '', savedBox = '', savedLr = '') {
  var container = document.getElementById('invoiceContainer');
  var rowId = 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  var html = `
    <div id="${rowId}" class="grid grid-cols-1 md:grid-cols-3 gap-2 bg-white p-2.5 border border-slate-200 rounded shadow-xs relative">
      <div><label class="block text-[10px] uppercase font-bold text-gray-400">Invoice Number *</label><input type="text" maxlength="9" minlength="9" pattern="[0-9]{9}" value="${savedNum}" required onblur="executeLiveDuplicateCheck(this)" class="invoice-num w-full p-1.5 border text-sm rounded bg-white"></div>
      <div><label class="block text-[10px] uppercase font-bold text-gray-400">Box Count *</label><input type="number" min="1" value="${savedBox}" required class="box-count w-full p-1.5 border text-sm rounded bg-white"></div>
      <div class="flex items-end space-x-1">
        <div class="w-full"><label class="block text-[10px] uppercase font-bold text-gray-400">LR No *</label><input type="text" value="${savedLr}" required class="lr-no w-full p-1.5 border text-sm rounded bg-white"></div>
        ${container.children.length > 0 ? `<button type="button" onclick="document.getElementById('${rowId}').remove(); saveToLocalStorage();" class="bg-red-500 text-white px-2 py-1.5 rounded font-bold">X</button>` : ''}
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', html);
}

function saveToLocalStorage() {
  if(workflowDept !== "B2B Dispatch") return;
  var invoiceRows = document.getElementById('invoiceContainer').children;
  var invoices = [];
  for(var i=0; i<invoiceRows.length; i++) {
    var numEl = invoiceRows[i].querySelector('.invoice-num');
    var boxEl = invoiceRows[i].querySelector('.box-count');
    var lrEl = invoiceRows[i].querySelector('.lr-no');
    if(numEl && boxEl && lrEl) invoices.push({ num: numEl.value, box: boxEl.value, lr: lrEl.value });
  }
  var cache = {
    date: document.getElementById('dateInput').value, time: document.getElementById('timeInput').value,
    transporter: document.getElementById('transporterSelect').value, transporterOther: document.getElementById('transporterOtherInput').value,
    vehicleNo: document.getElementById('vehicleNo').value, driverName: document.getElementById('driverName').value,
    driverMobile: document.getElementById('driverMobile').value, palletCount: document.getElementById('palletCount').value,
    incharge: document.getElementById('inchargeSelect').value, inchargeOther: document.getElementById('inchargeOtherInput').value,
    invoices: invoices
  };
  localStorage.setItem('cached_form_B2B_Dispatch', JSON.stringify(cache));
}

function loadFromLocalStorage(cache) {
  if(!cache) return;
  document.getElementById('dateInput').value = cache.date || "";
  document.getElementById('timeInput').value = cache.time || "";
  document.getElementById('transporterSelect').value = cache.transporter || "";
  document.getElementById('transporterOtherInput').value = cache.transporterOther || "";
  if(cache.transporter === "Other") document.getElementById('transporterOtherContainer').classList.remove('hidden');
  document.getElementById('vehicleNo').value = cache.vehicleNo || "";
  document.getElementById('driverName').value = cache.driverName || "";
  document.getElementById('driverMobile').value = cache.driverMobile || "";
  document.getElementById('palletCount').value = cache.palletCount || "";
  document.getElementById('inchargeSelect').value = cache.incharge || "";
  document.getElementById('inchargeOtherInput').value = cache.inchargeOther || "";
  if(cache.incharge === "Other") document.getElementById('inchargeOtherContainer').classList.remove('hidden');
  if(cache.invoices && cache.invoices.length > 0) {
    document.getElementById('invoiceContainer').innerHTML = '';
    cache.invoices.forEach(function(inv) { addInvoiceRow(inv.num, inv.box, inv.lr); });
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  if(isSubmissionHaltedForDuplicate) { alert("Clear out the duplicate row errors first."); return; }
  var invoiceRows = document.getElementById('invoiceContainer').children;
  var invoicesData = [];
  for(var i=0; i<invoiceRows.length; i++) {
    var invNum = invoiceRows[i].querySelector('.invoice-num').value.trim();
    invoicesData.push({ invoiceNum: invNum, boxCount: invoiceRows[i].querySelector('.box-count').value, lrNo: invoiceRows[i].querySelector('.lr-no').value });
  }
  var btn = document.getElementById('submitBtn'); btn.disabled = true; btn.innerText = "Transmitting...";
  var finalTransporter = document.getElementById('transporterSelect').value === "Other" ? document.getElementById('transporterOtherInput').value : document.getElementById('transporterSelect').value;
  var finalIncharge = document.getElementById('inchargeSelect').value === "Other" ? document.getElementById('inchargeOtherInput').value : document.getElementById('inchargeSelect').value;

  var payload = {
    date: document.getElementById('dateInput').value, time: document.getElementById('timeInput').value,
    department: "B2B Dispatch", transporter: finalTransporter, vehicleNo: document.getElementById('vehicleNo').value,
    driverName: document.getElementById('driverName').value, driverMobile: document.getElementById('driverMobile').value,
    palletCount: document.getElementById('palletCount').value || 0, incharge: finalIncharge, invoices: invoicesData
  };

  const res = await callBackend("submitEntries", { formData: payload });
  btn.disabled = false; btn.innerText = "Submit & Generate Gatepass";
  if(res.success) {
    renderPrintLayout(payload, res.seriesNo);
    localStorage.removeItem('cached_form_B2B_Dispatch');
    document.getElementById('entryForm').reset();
    document.getElementById('invoiceContainer').innerHTML = ''; addInvoiceRow();
    fetchLiveDashboardDataRecords();
  } else alert(res.message);
}
