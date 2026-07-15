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

// Core Fetch API Connector
async function apiFetch(action, payload = {}) {
  try {
    const response = await fetch(APPS_SCRIPT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: action, payload: payload, userEmail: localStorage.getItem('logged_session_email') || "Admin" })
    });
    
    if (!response.ok) throw new Error("HTTP status check failure: " + response.status);
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
    btn.disabled = false; btn.innerText = "Access Workspace"; 
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

// Fail-Safe Layout Injector Engine (Switched to inline strings if separate file fetch parameters drop)
async function loadWorkflowHtmlFiles() {
  const container = document.getElementById('dynamicFormContainer');
  const masterContainer = document.getElementById('view-product-master');
  if(!container) return;

  const dispatchHtmlStr = `<div id="b2bDispatchFormBlock" class="hidden"><h2 class="text-lg font-bold border-b pb-2 mb-4 text-slate-700">Daily Execution Input Stream (Tab1)</h2><div id="liveDuplicateWarningBox" class="hidden mb-4 bg-red-100 border border-red-400 text-red-800 rounded-lg p-4 space-y-2"><strong class="text-sm font-bold">⚠️ DUPLICATE INVOICE DETECTED IN SYSTEM</strong><p class="text-xs">The invoice highlighted in red below already exists.</p><div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-red-200 rounded p-2.5 text-xs font-mono text-gray-700"><div><span class="block text-[10px] text-gray-400 font-sans uppercase font-bold">Series ID</span> <span id="dupSeries" class="font-bold text-red-600"></span></div><div><span class="block text-[10px] text-gray-400 font-sans uppercase font-bold">LR No.</span> <span id="dupLr"></span></div><div><span class="block text-[10px] text-gray-400 font-sans uppercase font-bold">Date</span> <span id="dupDate"></span></div><div><span class="block text-[10px] text-gray-400 font-sans uppercase font-bold">Transporter</span> <span id="dupTrans"></span></div></div></div><form id="entryForm" onsubmit="handleFormSubmit(event)" oninput="saveToLocalStorage()"><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="dateInput" required class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Time Input Stamp *</label><input type="time" id="timeInput" required class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Department (Locked) *</label><input type="text" id="deptDisplayField" readonly value="B2B Dispatch" class="w-full p-2 border rounded-md bg-slate-100 font-semibold text-sm text-slate-700"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Transporter *</label><select id="transporterSelect" required onchange="toggleOtherInput(this, 'transporterOtherContainer', 'transporterOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select Transporter</option></select><div id="transporterOtherContainer" class="mt-1.5 hidden"><input type="text" id="transporterOtherInput" placeholder="Type Transporter" class="w-full p-1.5 border border-amber-400 rounded-md bg-amber-50 text-sm"></div></div></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 border-t pt-3"><div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle Registration No. *</label><input type="text" id="vehicleNo" required placeholder="e.g. MH-12-XX-1234" class="w-full p-2 border rounded-md text-sm uppercase"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Full Name *</label><input type="text" id="driverName" required placeholder="Enter Driver Name" class="w-full p-2 border rounded-md text-sm"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Mobile Number *</label><input type="tel" id="driverMobile" required pattern="[0-9]{10}" placeholder="10-Digit Mobile" class="w-full p-2 border rounded-md text-sm"></div></div><div class="border-t border-b border-gray-200 py-4 my-4 bg-slate-50 p-3 rounded-lg"><h3 class="text-sm font-bold text-slate-700 mb-3">Invoices Breakdown Log</h3><div id="invoiceContainer" class="space-y-3"></div><div class="flex justify-end mt-4 pt-2 border-t border-slate-200"><button type="button" onclick="addInvoiceRow()" class="bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded shadow-sm transition">+ Add Invoice Row</button></div></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6"><div><label class="block text-xs font-bold text-gray-600 mb-1">Pallet Count</label><input type="number" id="palletCount" min="0" class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Loading Incharge *</label><select id="inchargeSelect" required onchange="toggleOtherInput(this, 'inchargeOtherContainer', 'inchargeOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select Incharge</option></select><div id="inchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="inchargeOtherInput" placeholder="Type Incharge Name" class="w-full p-1.5 border border-amber-400 rounded-md bg-amber-50 text-sm"></div></div></div><button type="submit" id="submitBtn" class="w-full brand-bg text-white py-3 rounded-md font-bold text-sm tracking-wide shadow">Submit & Generate Gatepass</button></form></div>`;
  const inventoryHtmlStr = `<div id="inventoryFormBlock" class="hidden"><h2 class="text-lg font-bold border-b pb-2 mb-4 text-slate-700">Inventory Operations Stream (Tab4)</h2><form id="inventoryLogForm" onsubmit="handleInventorySubmit(event)" oninput="saveInventoryToCache()"><div class="bg-slate-100 p-4 rounded-xl border mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"><div class="col-span-1 sm:col-span-2 md:col-span-4 border-b pb-1 mb-1"><h4 class="text-xs font-bold text-slate-600 uppercase">🔗 Inward Shipment Header Parameters</h4></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="invDateInput" required class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">PO / Invoice No *</label><input type="text" id="invPoInvoiceNo" required placeholder="Enter PO/Invoice ID" class="w-full p-2 border rounded-md text-sm bg-white font-mono"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Customer Name *</label><input type="text" id="invCustomerName" required placeholder="Enter Customer Name" class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Inward Incharge *</label><select id="invInchargeSelect" required onchange="toggleOtherInput(this, 'invInchargeOtherContainer', 'invInchargeOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select Incharge</option></select><div id="invInchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="invInchargeOtherInput" placeholder="Type Incharge Name" class="w-full p-1.5 border border-amber-400 rounded-md bg-amber-50 text-sm"></div></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Transporter *</label><select id="invTransporterSelect" required onchange="toggleOtherInput(this, 'invTransporterOtherContainer', 'invTransporterOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select Transporter</option></select><div id="invTransporterOtherContainer" class="mt-1.5 hidden"><input type="text" id="invTransporterOtherInput" placeholder="Type Transporter" class="w-full p-1.5 border border-amber-400 rounded-md bg-amber-50 text-sm"></div></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle No *</label><input type="text" id="invVehicleNo" required placeholder="MH-12-XX-1234" class="w-full p-2 border rounded-md text-sm uppercase font-mono"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Name *</label><input type="text" id="invDriverName" required placeholder="Driver Full Name" class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Number *</label><input type="tel" id="invDriverNumber" required pattern="[0-9]{10}" placeholder="10-Digit Mobile" class="w-full p-2 border rounded-md text-sm font-mono"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">LR No *</label><input type="text" id="invLrNo" required placeholder="Enter LR Number" class="w-full p-2 border rounded-md text-sm font-mono"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">PO Total Qty *</label><input type="number" id="invPoTotalQty" min="1" required class="w-full p-2 border rounded-md text-sm font-bold"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">PO Total Box Qty *</label><input type="number" id="invPoTotalBoxQty" min="1" required class="w-full p-2 border rounded-md text-sm font-bold"></div></div><div class="border-t border-b border-gray-200 py-4 my-4 bg-slate-50 p-3 rounded-lg"><h3 class="text-sm font-bold text-slate-700 mb-3">Physical Inward Material Row Matrix</h3><div id="inventoryItemsContainer" class="space-y-4"></div><div class="flex justify-end mt-4 pt-2"><button type="button" onclick="addInventoryItemRow()" class="bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded shadow-sm">+ Add Material Row</button></div></div><button type="submit" id="invSubmitBtn" class="w-full brand-bg text-white py-3 rounded-md font-bold text-sm tracking-wide shadow">Commit Material Logs to Tab4 Ledger</button></form></div>`;
  const rtoHtmlStr = `<div id="rtoFormBlock" class="hidden"><div class="flex border-b border-gray-200 mb-6 bg-slate-100 p-1 rounded-lg max-w-md"><button type="button" id="rtoB2bToggleTab" onclick="switchRtoSubWorkflow('B2B')" class="w-1/2 text-center py-2 px-4 rounded-md text-xs font-bold uppercase transition-all bg-amber-500 text-slate-950 shadow-sm">📦 B2B Return</button><button type="button" id="rtoB2cToggleTab" onclick="switchRtoSubWorkflow('B2C')" class="w-1/2 text-center py-2 px-4 rounded-md text-xs font-bold uppercase transition-all text-slate-600">🛵 B2C Courier Return</button></div><div id="rtoB2bLayoutSection"><h2 class="text-base font-bold text-slate-700 mb-1">B2B Return Log Matrix (Tab5)</h2><form id="rtoB2bForm" onsubmit="handleRtoB2bSubmit(event)"><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="rtoB2bDate" required class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Invoice No. *</label><input type="text" id="rtoB2bInvoice" required placeholder="Invoice No" class="w-full p-2 border rounded-md text-sm font-mono"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">LR No. *</label><input type="text" id="rtoB2bLrNo" required placeholder="LR Tracking" class="w-full p-2 border rounded-md text-sm font-mono"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Return Incharge *</label><select id="rtoB2bInchargeSelect" required onchange="toggleOtherInput(this, 'rtoB2bInchargeOtherContainer', 'rtoB2bInchargeOtherInput')" class="rto-inch-drop w-full p-2 border rounded-md text-sm"><option value="">Select Incharge</option></select><div id="rtoB2bInchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2bInchargeOtherInput" class="w-full p-1.5 border rounded-md text-sm bg-amber-50"></div></div></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"><div id="rtoTransDropDiv"><label class="block text-xs font-bold text-gray-600 mb-1">Transporter *</label><select id="rtoB2bTransporterSelect" required onchange="toggleOtherInput(this, 'rtoB2bTransporterOtherContainer', 'rtoB2bTransporterOtherInput')" class="rto-trans-drop w-full p-2 border rounded-md text-sm"><option value="">Select Transporter</option></select><div id="rtoB2bTransporterOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2bTransporterOtherInput" class="w-full p-1.5 border rounded-md text-sm bg-amber-50"></div></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Box Qty *</label><input type="number" id="rtoB2bBoxQty" min="1" required class="w-full p-2 border rounded-md text-sm"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle Registration No. *</label><input type="text" id="rtoB2bVehicle" required placeholder="e.g. MH-12-XX-1234" class="w-full p-2 border rounded-md text-sm uppercase font-mono"></div></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 border-t pt-3"><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Name *</label><input type="text" id="rtoB2bDriver" required placeholder="Driver Name" class="w-full p-2 border rounded-md text-sm"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Mobile No. *</label><input type="tel" id="rtoB2bMobile" required pattern="[0-9]{10}" placeholder="10-Digit Mobile" class="w-full p-2 border rounded-md text-sm font-mono"></div></div><div class="mb-6"><label class="block text-xs font-bold text-red-600 mb-1">Operational Remark *</label><input type="text" id="rtoB2bRemark" required placeholder="Describe damages..." class="w-full p-2 border rounded-md text-sm border-slate-300"></div><button type="submit" id="rtoB2bSubmitBtn" class="w-full brand-bg text-white py-3 rounded-md font-bold text-sm shadow">Log B2B Return Entry</button></form></div><div id="rtoB2cLayoutSection" class="hidden"><h2 class="text-base font-bold text-slate-700 mb-1">B2C Return Log Matrix (Tab6)</h2><form id="rtoB2cForm" onsubmit="handleRtoB2cSubmit(event)"><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="rtoB2cDate" required class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle Registration No. *</label><input type="text" id="rtoB2cVehicle" required placeholder="e.g. MH-12-XX-1234" class="w-full p-2 border rounded-md text-sm uppercase font-mono"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Courier / Transporter *</label><select id="rtoB2cCourierSelect" required onchange="toggleOtherInput(this, 'rtoB2cCourierOtherContainer', 'rtoB2cCourierOtherInput')" class="rto-trans-drop w-full p-2 border rounded-md text-sm"><option value="">Select Courier Engine</option></select><div id="rtoB2cCourierOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2cCourierOtherInput" class="w-full p-1.5 border rounded-md text-sm bg-amber-50"></div></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Return Incharge *</label><select id="rtoB2cInchargeSelect" required onchange="toggleOtherInput(this, 'rtoB2cInchargeOtherContainer', 'rtoB2cInchargeOtherInput')" class="rto-inch-drop w-full p-2 border rounded-md text-sm"><option value="">Select Incharge</option></select><div id="rtoB2cInchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2cInchargeOtherInput" class="w-full p-1.5 border rounded-md text-sm bg-amber-50"></div></div></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 border-t pt-3"><div id="rtoRiderNameDiv"><label class="block text-xs font-bold text-gray-600 mb-1">Delivery Rider Name *</label><input type="text" id="rtoB2cDriver" required placeholder="Rider Name" class="w-full p-2 border rounded-md text-sm"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Mobile No. *</label><input type="tel" id="rtoB2cMobile" required pattern="[0-9]{10}" placeholder="10-Digit Mobile" class="w-full p-2 border rounded-md text-sm font-mono"></div></div><div class="mb-4"><label class="block text-xs font-bold text-red-600 mb-1">Global Return Operational Remark *</label><input type="text" id="rtoB2cCommonRemark" required value="No Damage" class="w-full p-2 border rounded-md text-sm"></div><div class="border-t border-b py-4 my-4 bg-slate-50 p-3 rounded-lg"><h3 class="text-xs font-bold text-slate-700 mb-2 uppercase">AWB Shipping Records Breakdown Grid</h3><div id="rtoB2cAwbContainer" class="space-y-2.5"></div><div class="flex justify-end mt-3"><button type="button" onclick="addRtoB2cAwbRow()" class="bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded shadow-xs transition">+ Add AWB Code Row</button></div></div><button type="submit" id="rtoB2cSubmitBtn" class="w-full bg-amber-500 text-slate-950 py-3 rounded-md font-bold text-sm tracking-wide shadow">Log B2C Return Entries</button></form></div></div>`;
  const masterHtmlStr = `<div class="space-y-6"><div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-3"><div><h2 class="text-lg font-bold text-slate-700">Central Product Master Repository (Tab3) <span id="pmTotalCountBadge" class="ml-2 bg-amber-500 text-slate-950 font-mono text-xs px-2 py-0.5 rounded-full font-bold">0 Items</span></h2><p class="text-xs text-slate-400">View SKU catalogs and upload master logs.</p></div><div class="flex items-center space-x-2"><label class="bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded shadow transition cursor-pointer">📥 Upload Excel CSV<input type="file" id="excelCsvFileInput" accept=".csv" onchange="handleExcelCsvImport(this)" class="hidden"></label><button onclick="downloadProductMasterAsCsv()" class="bg-blue-600 text-white font-bold text-xs py-2 px-3 rounded shadow">📤 Download Catalog</button><button onclick="toggleAddProductModal(true)" class="bg-amber-500 text-slate-950 font-bold text-xs py-2 px-3 rounded shadow">+ Register Item</button></div></div><div class="flex flex-col sm:flex-row items-center gap-2"><div class="w-full"><input type="text" id="pmSearchQuery" onkeyup="filterProductMasterViewTable()" placeholder="Search Item Master by Name, SKU, or Barcode..." class="w-full p-2 border rounded text-sm font-medium bg-white"></div><div class="w-full sm:w-48 flex items-center space-x-1.5"><label class="text-xs font-bold text-slate-500 whitespace-nowrap">View Limit:</label><select id="pmViewLimitSelect" onchange="filterProductMasterViewTable()" class="w-full p-2 border rounded text-sm bg-white text-gray-700"><option value="50">50 Rows</option><option value="100">100 Rows</option><option value="200" selected>200 Rows</option><option value="500">500 Rows</option></select></div></div><div class="overflow-x-auto border rounded-lg shadow-xs"><table class="min-w-full divide-y text-xs text-left"><thead class="bg-slate-800 text-white font-semibold uppercase text-[10px]"><tr><th class="px-4 py-3">Item Barcode</th><th class="px-4 py-3">SKU Code</th><th class="px-4 py-3">Item Description Name</th><th class="px-4 py-3">UOM</th><th class="px-4 py-3">Pack Size</th></tr></thead><tbody id="productMasterTableBody" class="divide-y bg-white text-gray-600"></tbody></table></div></div>`;

  // Inject directly inside DOM to bypass case-sensitive file hosting path conflicts
  container.innerHTML = dispatchHtmlStr + inventoryHtmlStr + rtoHtmlStr;
  masterContainer.innerHTML = masterHtmlStr;
  
  initFormInterceptorsAndDropdowns();
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
  if (!m) return;
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

function initInventorySearchableDropdownEngine() {
  var container = document.getElementById('inventoryItemsContainer');
  if(container && container.children.length === 0) {
    addInventoryItemRow();
  }
}

async function handleInventorySubmit(e) {
  e.preventDefault(); var rows = document.getElementById('inventoryItemsContainer').children; var items = [];
  for (var i=0; i < rows.length; i++) { items.push({ itemName: rows[i].getAttribute('data-selected-item'), barcode: rows[i].getAttribute('data-selected-barcode'), skuCode: rows[i].getAttribute('data-selected-sku'), batchNo: rows[i].querySelector('.inv-batch-no').value, physicalQuantity: rows[i].querySelector('.inv-total-qty').value, boxCount: rows[i].querySelector('.inv-no-of-box').value, status: rows[i].querySelector('.inv-status').value }); }
  var payload = { date: document.getElementById('invDateInput').value, poInvoiceNo: document.getElementById('invPoInvoiceNo').value, customerName: document.getElementById('invCustomerName').value, poTotalQty: document.getElementById('invPoTotalQty').value, poTotalBoxQty: document.getElementById('invPoTotalBoxQty').value, vehicleNo: document.getElementById('invVehicleNo').value, transporter: document.getElementById('invTransporterSelect').value, driverName: document.getElementById('invDriverName').value, driverNumber: document.getElementById('invDriverNumber').value, lrNo: document.getElementById('invLrNo').value, incharge: document.getElementById('invInchargeSelect').value, items: items };
  const res = await apiFetch("submitInventoryLogs", payload);
  if(res && res.success) { localStorage.removeItem('cached_inventory_stream'); alert("Committed under No: " + res.seriesNo); window.location.reload(); }
}

// Dynamic Search Lists Controllers
function showInvSearchDropdown(id, type) { hideAllInvDropdownLists(); var r = document.getElementById(id); if(r) { var t = r.querySelector(`.inv-${type}-dropdown-list`); if(t) t.classList.remove('hidden'); } }
function hideAllInvDropdownLists() { document.querySelectorAll('.inv-barcode-dropdown-list, .inv-item-dropdown-list, .inv-sku-dropdown-list').forEach(el => el.classList.add('hidden')); }
function selectInvProductData(id, prod) {
  var r = document.getElementById(id); if(!r) return; r.querySelector('.inv-barcode-search-input').value = prod.barcode; r.querySelector('.inv-item-search-input').value = prod.itemName; r.querySelector('.inv-sku-search-input').value = prod.skuCode;
  r.setAttribute('data-selected-item', prod.itemName); r.setAttribute('data-selected-barcode', prod.barcode); r.setAttribute('data-selected-sku', prod.skuCode); hideAllInvDropdownLists();
}

function buildDropdownDomTreeLists(id) {
  var r = document.getElementById(id); if(!r) return;
  var bList = r.querySelector('.inv-barcode-dropdown-list'); var iList = r.querySelector('.inv-item-dropdown-list'); var sList = r.querySelector('.inv-sku-dropdown-list');
  if(!bList || !iList || !sList) return;
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
  var b = document.getElementById('dataTableBody'); if(!b) return; b.innerHTML = "";
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
var savedEmail = localStorage.getItem('logged_session_email');
if(savedEmail && savedEmail.includes('@')) {
  currentUserEmail = savedEmail;
  var uDisp = document.getElementById('userDisplay'); if(uDisp) uDisp.innerText = currentUserEmail;
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-portal').classList.remove('hidden');
  loadWorkflowHtmlFiles();
} else {
  document.getElementById('view-login').classList.remove('hidden');
  document.getElementById('view-portal').classList.add('hidden');
}
