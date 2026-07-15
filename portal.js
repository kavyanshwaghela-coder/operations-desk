// Global Runtime Configurations
var currentUserEmail = "System Admin";
var masterData = [];
var currentlyFilteredData = [];
var workflowDept = localStorage.getItem('active_workflow_dept') || "B2B Dispatch";
var currentViewTarget = localStorage.getItem('current_view_target') || "entry-view";
var isSubmissionHaltedForDuplicate = false;
var globalProductMasterList = [];
var currentActiveRtoWorkflowSubMode = "B2B";

// CHANGE THIS: Paste your Google Apps Script URL here!
const APPS_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbx9Ba3D5qrJFuwTkTGNLPSkfabeQedX0YQ9O8JoPmUfLear9OkzEjN_Pxz1cVlqjtHDWg/exec";

// Global Toast Status Message Handler
function showMessage(txt, isSuccess) {
  var msg = document.getElementById('statusMessage');
  if (!msg) return;
  msg.innerText = txt;
  msg.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'border-red-200', 'bg-green-50', 'text-green-700', 'border-green-200');
  if(isSuccess) {
    msg.classList.add('bg-green-50', 'text-green-700', 'border', 'border-green-200');
  } else {
    msg.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
  }
  msg.classList.remove('hidden');
}

// Core Fetch API Connector (Restored for Transparent Data Streams Reading)
async function apiFetch(action, payload = {}) {
  try {
    const response = await fetch(APPS_SCRIPT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // Simple request header prevents preflight OPTIONS blocks
      body: JSON.stringify({ action: action, payload: payload, userEmail: localStorage.getItem('logged_session_email') || "Admin" })
    });
    
    if (!response.ok) {
      throw new Error("HTTP status check failure: " + response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Connection Error:", error);
    return null;
  }
}

// Authentication Logic Engine Route Handlers
async function handleLogin(e) {
  e.preventDefault();
  var email = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value.trim();
  var btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.innerText = "Verifying...";
  
  const res = await apiFetch("checkLogin", { email: email, password: password });
  if (res && res.success) {
    localStorage.setItem('logged_session_email', res.email);
    localStorage.setItem('active_workflow_dept', 'B2B Dispatch');
    localStorage.setItem('current_view_target', 'entry-view');
    window.location.reload();
  } else { 
    showMessage(res ? res.message : "Authentication error. Verify script deployment access configuration.", false); 
    btn.disabled = false; 
    btn.innerText = "Access Workspace"; 
  }
}

var currentTrueOtpSeed = ""; var otpPurpose = "forgot";
async function handleOtpRequestFlow(purpose) {
  var email = document.getElementById('email').value.trim(); otpPurpose = purpose;
  if(!email) { showMessage("Type your Email ID first.", false); return; }
  showMessage("Querying... Please hold.", true);
  document.getElementById('passwordResetBlock').classList.add('hidden');
  document.getElementById('otpBlockTitle').innerText = otpPurpose === 'login' ? "Direct OTP Access" : "Password Recovery";
  const res = await apiFetch("requestPasswordOtp", { email: email });
  if(res && res.success) { currentTrueOtpSeed = res.trueOtpSeed; document.getElementById('otpVerificationBlock').classList.remove('hidden'); showMessage("OTP sent to inbox.", true); } else { showMessage(res ? res.message : "Failed to trigger OTP.", false); }
}

async function executePasswordOtpVerification() {
  var email = document.getElementById('email').value.trim();
  var token = document.getElementById('otpTokenInput').value.trim();
  const res = await apiFetch("verifyOtpAndRetrievePassword", { email: email, userEnteredOtp: token, trueOtp: currentTrueOtpSeed });
  if(res && res.success) {
    if (otpPurpose === 'login') { localStorage.setItem('logged_session_email', email); window.location.reload(); }
    else { document.getElementById('otpVerificationBlock').classList.add('hidden'); document.getElementById('passwordResetBlock').classList.remove('hidden'); showMessage("Token authorized! Set new password.", true); }
  } else { showMessage(res ? res.message : "Invalid verification code entry.", false); }
}

async function submitNewPasswordData() {
  var email = document.getElementById('email').value.trim();
  var newPass = document.getElementById('newPassInput').value.trim();
  if(newPass !== document.getElementById('confirmPassInput').value.trim()) { showMessage("Passwords do not match.", false); return; }
  const res = await apiFetch("updateUserPassword", { email: email, newPassword: newPass });
  if(res && res.success) { document.getElementById('password').value = newPass; document.getElementById('passwordResetBlock').classList.add('hidden'); showMessage("Password saved!", true); } else { showMessage(res ? res.message : "Write failure.", false); }
}

function cancelOtpVerificationFlow() { document.getElementById('otpVerificationBlock').classList.add('hidden'); }
function triggerLogout() { localStorage.clear(); window.location.reload(); }

// Dynamic Form Injections (Splitting HTML components programmatically)
async function loadWorkflowHtmlFiles() {
  const container = document.getElementById('dynamicFormContainer');
  const masterContainer = document.getElementById('view-product-master');
  if(!container) return;

  try {
    const [dispatchRes, invRes, rtoRes, masterRes] = await Promise.all([
      fetch('dispatch.html').then(r => r.text()),
      fetch('inventory.html').then(r => r.text()),
      fetch('rto.html').then(r => r.text()),
      fetch('master.html').then(r => r.text())
    ]);

    container.innerHTML = dispatchRes + invRes + rtoRes;
    masterContainer.innerHTML = masterRes;
    
    initFormInterceptorsAndDropdowns();
  } catch (err) {
    console.error("HTML Module Loading Failure:", err);
  }
}

async function initFormInterceptorsAndDropdowns() {
  if(document.getElementById('deptDisplayField')) document.getElementById('deptDisplayField').value = workflowDept;
  const dropdowns = await apiFetch("getDropdownData");
  if(dropdowns) { populateDropdownsB2b(dropdowns); populateDropdownsInv(dropdowns); populateDropdownsRto(dropdowns); }
  const products = await apiFetch("getProductMasterData");
  if(products) { globalProductMasterList = products; syncProductMasterLocalState(products); }
  evaluateActiveWorkflowViewState();
  fetchLiveDashboardDataRecords();
}

// Global Routing Switches View Engines
function switchView(viewKey) {
  currentViewTarget = viewKey; localStorage.setItem('current_view_target', viewKey);
  document.getElementById('printArea').classList.add('hidden');
  document.getElementById('statusMsg').classList.add('hidden');
  document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden'));
  
  if(viewKey === 'entry-view') document.getElementById('view-entry').classList.remove('hidden');
  else if(viewKey === 'product-master-view') document.getElementById('view-product-master').classList.remove('hidden');
  else if(viewKey === 'reprint-view') document.getElementById('view-reprint').classList.remove('hidden');
  else if(viewKey === 'correction-view') document.getElementById('view-correction').classList.remove('hidden');
  else if(viewKey === 'dashboard-view') document.getElementById('view-dashboard').classList.remove('hidden');
}

function toggleSidebar() { document.getElementById('sidebarMenu').classList.toggle('-translate-x-full'); document.getElementById('menuBackdrop').classList.toggle('hidden'); }
function toggleSubMenu(menuId, open = false) {
  var m = document.getElementById(menuId);
  if (m.style.maxHeight && m.style.maxHeight !== "0px" && !open) { m.style.maxHeight = "0px"; m.style.opacity = "0"; }
  else { m.style.maxHeight = "250px"; m.style.opacity = "1"; }
}

function activateModuleWorkflow(deptName, viewTarget) {
  workflowDept = deptName; currentViewTarget = viewTarget;
  localStorage.setItem('active_workflow_dept', deptName); localStorage.setItem('current_view_target', viewTarget);
  document.getElementById('moduleTitle').innerText = workflowDept + " Workspace";
  evaluateActiveWorkflowViewState(); switchView(viewTarget); fetchLiveDashboardDataRecords();
}

function evaluateActiveWorkflowViewState() {
  var b2b = document.getElementById('b2bDispatchFormBlock');
  var inv = document.getElementById('inventoryFormBlock');
  var rto = document.getElementById('rtoFormBlock');
  if(b2b) b2b.classList.add('hidden'); if(inv) inv.classList.add('hidden'); if(rto) rto.classList.add('hidden');
  if (workflowDept === "B2B Dispatch" && b2b) { b2b.classList.remove('hidden'); if(document.getElementById('invoiceContainer')?.children.length === 0) addInvoiceRow(); }
  else if (workflowDept === "Inventory Logging" && inv) { inv.classList.remove('hidden'); initInventorySearchableDropdownEngine(); }
  else if (workflowDept === "RTO (IN)" && rto) { rto.classList.remove('hidden'); }
}

// B2B Handling Logic Blocks
async function executeLiveDuplicateCheck(input) {
  var val = input.value.trim(); if (!val) return;
  const res = await apiFetch("checkInvoiceDuplicateLive", val);
  var box = document.getElementById('liveDuplicateWarningBox');
  if (res && res.isDuplicate) {
    input.classList.add('border-red-500', 'bg-red-50');
    document.getElementById('dupSeries').innerText = res.seriesNo; document.getElementById('dupLr').innerText = res.lrNo;
    document.getElementById('dupDate').innerText = res.date; document.getElementById('dupTrans').innerText = res.transporter;
    box.classList.remove('hidden'); isSubmissionHaltedForDuplicate = true;
    document.getElementById('submitBtn').disabled = true; document.getElementById('submitBtn').innerText = "LOCKED";
  } else { input.classList.remove('border-red-500', 'bg-red-50'); evaluateFormSubmissionSubmissionValidityState(); }
}

function evaluateFormSubmissionSubmissionValidityState() {
  var inputs = document.querySelectorAll('.invoice-num'); var found = false;
  for(var i=0; i<inputs.length; i++) { if(inputs[i].classList.contains('border-red-500')) { found = true; break; } }
  if(!found) { document.getElementById('liveDuplicateWarningBox').classList.add('hidden'); isSubmissionHaltedForDuplicate = false; document.getElementById('submitBtn').disabled = false; document.getElementById('submitBtn').innerText = "Submit & Generate Gatepass"; }
}

function addInvoiceRow(n='', b='', l='') {
  var container = document.getElementById('invoiceContainer'); if(!container) return;
  var id = 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="grid grid-cols-1 md:grid-cols-3 gap-2 bg-white p-2.5 border rounded shadow-xs relative">
      <div><label class="block text-[10px] font-bold text-gray-400">Invoice Num *</label><input type="text" maxlength="9" minlength="9" pattern="[0-9]{9}" value="${n}" required onblur="executeLiveDuplicateCheck(this)" class="invoice-num w-full p-1.5 border text-sm rounded"></div>
      <div><label class="block text-[10px] font-bold text-gray-400">Boxes *</label><input type="number" min="1" value="${b}" required class="box-count w-full p-1.5 border text-sm rounded"></div>
      <div class="flex items-end space-x-1"><div class="w-full"><label class="block text-[10px] font-bold text-gray-400">LR No *</label><input type="text" value="${l}" required class="lr-no w-full p-1.5 border text-sm rounded"></div>
      ${container.children.length > 0 ? `<button type="button" onclick="document.getElementById('${id}').remove(); saveToLocalStorage();" class="bg-red-500 text-white px-2 py-1.5 rounded text-sm font-bold">X</button>` : ''}</div>
    </div>`);
}

async function handleFormSubmit(e) {
  e.preventDefault(); if(isSubmissionHaltedForDuplicate) return;
  var rows = document.getElementById('invoiceContainer').children; var data = [];
  for(var i=0; i<rows.length; i++) { data.push({ invoiceNum: rows[i].querySelector('.invoice-num').value, boxCount: rows[i].querySelector('.box-count').value, lrNo: rows[i].querySelector('.lr-no').value }); }
  var btn = document.getElementById('submitBtn'); btn.disabled = true; btn.innerText = "Transmitting...";
  var payload = { date: document.getElementById('dateInput').value, time: document.getElementById('timeInput').value, department: "B2B Dispatch", transporter: document.getElementById('transporterSelect').value, vehicleNo: document.getElementById('vehicleNo').value, driverName: document.getElementById('driverName').value, driverMobile: document.getElementById('driverMobile').value, palletCount: document.getElementById('palletCount').value || 0, incharge: document.getElementById('inchargeSelect').value, invoices: data };
  const res = await apiFetch("submitEntries", payload); btn.disabled = false; btn.innerText = "Submit & Generate Gatepass";
  if(res && res.success) { renderPrintLayout(payload, res.seriesNo); localStorage.removeItem('cached_form_B2B_Dispatch'); document.getElementById('entryForm').reset(); document.getElementById('invoiceContainer').innerHTML = ''; addInvoiceRow(); fetchLiveDashboardDataRecords(); }
}

// Inventory Handling Logic Arrays
function addInventoryItemRow(item='', bar='', sku='', b='', q='', box='', st='Pending') {
  var container = document.getElementById('inventoryItemsContainer'); if(!container) return;
  var id = 'invRow_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="bg-white p-3 border rounded-lg shadow-xs space-y-2 relative" data-selected-item="${item}" data-selected-barcode="${bar}" data-selected-sku="${sku}">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><label class="text-[10px] font-bold text-gray-400">Barcode *</label><input type="text" value="${bar}" onfocus="showInvSearchDropdown('${id}', 'barcode')" onkeyup="filterInvSearchDropdown('${id}', 'barcode')" class="inv-barcode-search-input w-full p-1.5 border text-sm rounded"><div class="inv-barcode-dropdown-list hidden absolute max-h-40 overflow-y-auto bg-white border z-50 text-xs"></div></div>
        <div><label class="text-[10px] font-bold text-gray-400">Item Name *</label><input type="text" value="${item}" onfocus="showInvSearchDropdown('${id}', 'item')" onkeyup="filterInvSearchDropdown('${id}', 'item')" class="inv-item-search-input w-full p-1.5 border text-sm rounded"><div class="inv-item-dropdown-list hidden absolute max-h-40 overflow-y-auto bg-white border z-50 text-xs"></div></div>
        <div><label class="text-[10px] font-bold text-gray-400">SKU Code *</label><input type="text" value="${sku}" onfocus="showInvSearchDropdown('${id}', 'sku')" onkeyup="filterInvSearchDropdown('${id}', 'sku')" class="inv-sku-search-input w-full p-1.5 border text-sm rounded"><div class="inv-sku-dropdown-list hidden absolute max-h-40 overflow-y-auto bg-white border z-50 text-xs"></div></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div><label class="text-[10px] font-bold text-gray-400">Batch *</label><input type="text" value="${b}" required class="inv-batch-no w-full p-1.5 border text-sm font-mono"></div>
        <div><label class="text-[10px] font-bold text-gray-400">Qty *</label><input type="number" value="${q}" required class="inv-total-qty w-full p-1.5 border text-sm font-bold"></div>
        <div><label class="text-[10px] font-bold text-gray-400">Boxes *</label><input type="number" value="${box}" required class="inv-no-of-box w-full p-1.5 border text-sm"></div>
        <div><label class="text-[10px] font-bold text-gray-400">Status *</label><select class="inv-status w-full p-1.5 border text-sm"><option value="Pending" ${st==='Pending'?'selected':''}>Pending</option><option value="Closed" ${st==='Closed'?'selected':''}>Closed</option></select></div>
      </div>
    </div>`);
  buildDropdownDomTreeLists(id);
}

async function handleInventorySubmit(e) {
  e.preventDefault(); var rows = document.getElementById('inventoryItemsContainer').children; var items = [];
  for (var i=0; i < rows.length; i++) { items.push({ itemName: rows[i].getAttribute('data-selected-item'), barcode: rows[i].getAttribute('data-selected-barcode'), skuCode: rows[i].getAttribute('data-selected-sku'), batchNo: rows[i].querySelector('.inv-batch-no').value, physicalQuantity: rows[i].querySelector('.inv-total-qty').value, boxCount: rows[i].querySelector('.inv-no-of-box').value, status: rows[i].querySelector('.inv-status').value }); }
  var payload = { date: document.getElementById('invDateInput').value, poInvoiceNo: document.getElementById('invPoInvoiceNo').value, customerName: document.getElementById('invCustomerName').value, poTotalQty: document.getElementById('invPoTotalQty').value, poTotalBoxQty: document.getElementById('invPoTotalBoxQty').value, vehicleNo: document.getElementById('invVehicleNo').value, transporter: document.getElementById('invTransporterSelect').value, driverName: document.getElementById('invDriverName').value, driverNumber: document.getElementById('invDriverNumber').value, lrNo: document.getElementById('invLrNo').value, incharge: document.getElementById('invInchargeSelect').value, items: items };
  const res = await apiFetch("submitInventoryLogs", payload);
  if(res && res.success) { localStorage.removeItem('cached_inventory_stream'); alert("Committed under No: " + res.seriesNo); window.location.reload(); }
}

// Dynamic Search Lists Controllers
function showInvSearchDropdown(id, type) { hideAllInvDropdownLists(); document.getElementById(id).querySelector(`.inv-${type}-dropdown-list`).classList.remove('hidden'); }
function hideAllInvDropdownLists() { document.querySelectorAll('.inv-barcode-dropdown-list, .inv-item-dropdown-list, .inv-sku-dropdown-list').forEach(el => el.classList.add('hidden')); }
function selectInvProductData(id, prod) {
  var r = document.getElementById(id); r.querySelector('.inv-barcode-search-input').value = prod.barcode; r.querySelector('.inv-item-search-input').value = prod.itemName; r.querySelector('.inv-sku-search-input').value = prod.skuCode;
  r.setAttribute('data-selected-item', prod.itemName); r.setAttribute('data-selected-barcode', prod.barcode); r.setAttribute('data-selected-sku', prod.skuCode); hideAllInvDropdownLists();
}

function buildDropdownDomTreeLists(id) {
  var r = document.getElementById(id); if(!r) return;
  var bList = r.querySelector('.inv-barcode-dropdown-list'); var iList = r.querySelector('.inv-item-dropdown-list'); var sList = r.querySelector('.inv-sku-dropdown-list');
  globalProductMasterList.forEach(prod => {
    var d1 = document.createElement('div'); d1.className = "p-1 hover:bg-amber-100 cursor-pointer"; d1.innerText = prod.barcode; d1.onclick = () => selectInvProductData(id, prod); bList.appendChild(d1);
    var d2 = document.createElement('div'); d2.className = "p-1 hover:bg-amber-100 cursor-pointer"; d2.innerText = prod.itemName; d2.onclick = () => selectInvProductData(id, prod); iList.appendChild(d2);
    var d3 = document.createElement('div'); d3.className = "p-1 hover:bg-amber-100 cursor-pointer font-bold"; d3.innerText = prod.skuCode; d3.onclick = () => selectInvProductData(id, prod); sList.appendChild(d3);
  });
}

// RTO Returns Loop Managers
function switchRtoSubWorkflow(m) {
  currentActiveRtoWorkflowSubMode = m;
  if(m === "B2B") { document.getElementById('rtoB2bLayoutSection').classList.remove('hidden'); document.getElementById('rtoB2cLayoutSection').classList.add('hidden'); }
  else { document.getElementById('rtoB2bLayoutSection').classList.add('hidden'); document.getElementById('rtoB2cLayoutSection').classList.remove('hidden'); }
}

async function handleRtoB2bSubmit(e) {
  e.preventDefault();
  var payload = { date: document.getElementById('rtoB2bDate').value, invoiceNo: document.getElementById('rtoB2bInvoice').value, lrNo: document.getElementById('rtoB2bLrNo').value, transporter: document.getElementById('rtoB2bTransporterSelect').value, boxQty: document.getElementById('rtoB2bBoxQty').value, vehicleNo: document.getElementById('rtoB2bVehicle').value, driverName: document.getElementById('rtoB2bDriver').value, driverMobile: document.getElementById('rtoB2bMobile').value, remark: document.getElementById('rtoB2bRemark').value, incharge: document.getElementById('rtoB2bInchargeSelect').value, status: "Pending" };
  const res = await apiFetch("submitRtoB2bLog", payload); if(res && res.success) { alert("Logged B2B Return ID: " + res.seriesNo); window.location.reload(); }
}

function addRtoB2cAwbRow() {
  var c = document.getElementById('rtoB2cAwbContainer'); if(!c) return;
  var id = 'awb_' + Date.now();
  c.insertAdjacentHTML('beforeend', `<div id="${id}" class="flex items-center space-x-2 bg-white p-2 border rounded"><div class="w-full"><label class="text-[9px] text-gray-400 font-bold">AWB Code *</label><input type="text" required class="b2c-awb-input w-full p-1 border text-xs font-mono font-bold"></div><button type="button" onclick="document.getElementById('${id}').remove();" class="bg-red-500 text-white h-8 px-2 mt-3 rounded text-xs">✕</button></div>`);
}

async function handleRtoB2cSubmit(e) {
  e.preventDefault(); var inputs = document.querySelectorAll('.b2c-awb-input'); var records = [];
  inputs.forEach(i => { if(i.value.trim()) records.push({ awbNo: i.value.trim(), status: "Pending" }); });
  var payload = { date: document.getElementById('rtoB2cDate').value, vehicleNo: document.getElementById('rtoB2cVehicle').value, courierOrTransporter: document.getElementById('rtoB2cCourierSelect').value, driverName: document.getElementById('rtoB2cDriver').value, driverMobile: document.getElementById('rtoB2cMobile').value, remark: document.getElementById('rtoB2cCommonRemark').value, incharge: document.getElementById('rtoB2cInchargeSelect').value, records: records };
  const res = await apiFetch("submitRtoB2cBulkMatrix", payload); if(res && res.success) { alert("Logged B2C Array Matrix Stack: " + res.seriesNo); window.location.reload(); }
}

// Master SKU Catalog Functions
function syncProductMasterLocalState(recs) {
  var body = document.getElementById('productMasterTableBody'); if(!body) return; body.innerHTML = "";
  if (!recs) return;
  document.getElementById('pmTotalCountBadge').innerText = recs.length + " Items";
  recs.slice(0, 100).forEach(item => {
    body.insertAdjacentHTML('beforeend', `<tr class="hover:bg-slate-50"><td class="px-4 py-2 font-mono">${item.barcode}</td><td class="px-4 py-2 font-mono font-bold">${item.skuCode}</td><td class="px-4 py-2">${item.itemName}</td><td class="px-4 py-2">${item.uom}</td><td class="px-4 py-2 font-mono">${item.packSize}</td></tr>`);
  });
}

// Central Ledger Archives Visualizations
async function fetchLiveDashboardDataRecords() {
  var body = document.getElementById('dataTableBody'); if(!body) return;
  body.innerHTML = `<tr><td colspan="11" class="text-center p-4">Syncing workspace records...</td></tr>`;
  const data = await apiFetch("getDashboardDataByWorkspace", workflowDept);
  if(data && Array.isArray(data)) { masterData = data; renderTable(data); }
}

function renderTable(data) {
  var b = document.getElementById('dataTableBody'); b.innerHTML = "";
  if (!data) return;
  document.getElementById('rowCountLabel').innerText = data.length;
  data.forEach(r => {
    b.insertAdjacentHTML('beforeend', `<tr class="text-xs hover:bg-slate-50"><td class="px-3 py-2 font-bold font-mono">${r.seriesNo}</td><td class="px-3 py-2">${r.date} @ ${r.time}</td><td class="px-3 py-2 text-amber-600 font-bold">${r.dept}</td><td class="px-3 py-2">${r.transporter}</td><td class="px-3 py-2 font-mono font-bold">${r.vehicleNo}</td><td class="px-3 py-2">${r.driverName}</td><td class="px-3 py-2 font-mono">${r.invoice}</td><td class="px-3 py-2 text-center font-bold">${r.boxes}</td><td class="px-3 py-2 max-w-[120px] truncate">${r.remark || r.lr}</td><td class="px-3 py-2 text-center font-bold">${r.pallets || r.status}</td><td class="px-3 py-2">${r.incharge}</td></tr>`);
  });
}

function applyFilters() {
  var s = document.getElementById('searchSeries').value.toLowerCase().trim();
  var i = document.getElementById('searchInvoice').value.toLowerCase().trim();
  currentlyFilteredData = masterData.filter(r => (!s || r.seriesNo.toString().toLowerCase().includes(s)) && (!i || r.invoice.toString().toLowerCase().includes(i)));
  renderTable(currentlyFilteredData);
}

// Dynamic Hard-Copy Slips & Core Data Modifiers
async function runDatabaseCorrectionRoutine() {
  var p = { type: document.getElementById('corrType').value, searchKey: document.getElementById('corrSearchKey').value.trim(), replacementValue: document.getElementById('corrNewValue').value.trim() };
  const res = await apiFetch("executeOperationalCorrection", p); if(res) alert(res.message); window.location.reload();
}

async function executeReprintQuery() {
  const res = await apiFetch("fetchUniversalGatepassRecord", { seriesId: document.getElementById('searchSeriesId').value.trim(), currentWorkspace: document.getElementById('reprintSourceDept').value });
  if(res && res.success) renderPrintLayout(res.record, res.record.seriesNo);
}

function renderPrintLayout(d, id) {
  document.getElementById('pdfSeries').innerText = id; document.getElementById('pdfDate').innerText = d.date; document.getElementById('pdfTime').innerText = d.time; document.getElementById('pdfDept').innerText = d.department; document.getElementById('pdfTransporter').innerText = d.transporter; document.getElementById('pdfVehicle').innerText = d.vehicleNo; document.getElementById('pdfDriver').innerText = d.driverName || "N/A"; document.getElementById('pdfMobile').innerText = d.driverMobile || "N/A"; document.getElementById('pdfIncharge').innerText = d.incharge;
  var b = document.getElementById('pdfTableBody'); b.innerHTML = "";
  d.invoices.forEach((inv, i) => { b.insertAdjacentHTML('beforeend', `<tr><td class="border p-1 text-center">${i+1}</td><td class="border p-1">${inv.itemName || "Commercial Goods Cargo Load Logistics"}</td><td class="border p-1 font-mono">${inv.invoiceNum}</td><td class="border p-1 text-center font-bold">${inv.boxCount || d.boxes || 1}</td><td class="border p-1 font-mono">${inv.lrNo || "N/A"}</td></tr>`); });
  document.getElementById('printArea').classList.remove('hidden'); window.scrollTo(0, document.getElementById('printArea').offsetTop);
}

// Check session authentication state on boot
(function() {
  var savedEmail = localStorage.getItem('logged_session_email');
  if(savedEmail && savedEmail.includes('@')) {
    currentUserEmail = savedEmail;
    document.getElementById('userDisplay').innerText = currentUserEmail;
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-portal').classList.remove('hidden');
    loadWorkflowHtmlFiles();
  } else {
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-portal').classList.add('hidden');
  }
})();
