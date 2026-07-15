// Global Runtime Configurations
var currentUserEmail = "System Admin";
var masterData = [];
var currentlyFilteredData = [];
var workflowDept = localStorage.getItem('active_workflow_dept') || "B2B Dispatch";
var currentViewTarget = localStorage.getItem('current_view_target') || "entry-view";
var isSubmissionHaltedForDuplicate = false;
var globalProductMasterList = [];
var currentActiveRtoWorkflowSubMode = "B2B";
var html5QrScanner = null;

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

// Mobile Camera Barcode Scanner Initialization Rule
function openMobileCameraScanner(targetInputId) {
  var container = document.getElementById('qr-reader-container');
  if (!container) return;
  container.classList.remove('hidden');
  window.scrollTo(0, 0);

  if (html5QrScanner) {
    html5QrScanner.clear();
  }

  html5QrScanner = new Html5Qrcode("qr-reader");
  
  html5QrScanner.start(
    { facingMode: "environment" }, 
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      var inputEl = document.getElementById(targetInputId);
      if (inputEl) {
        inputEl.value = decodedText.trim();
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('blur', { bubbles: true }));
      }
      closeGlobalCameraScanner();
    },
    (errorMessage) => { /* Silent tracking bypass */ }
  ).catch(err => {
    console.error("Camera Access Denied:", err);
    alert("Camera permission denied or camera device busy.");
    container.classList.add('hidden');
  });
}

function closeGlobalCameraScanner() {
  var container = document.getElementById('qr-reader-container');
  if (container) container.classList.add('hidden');
  if (html5QrScanner) {
    html5QrScanner.stop().then(() => html5QrScanner.clear()).catch(e => console.log(e));
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
    if (otpPurpose === 'login') { 
      localStorage.setItem('logged_session_email', email); 
      // Force a delayed reload to ensure localStorage is committed
      setTimeout(function() { window.location.href = window.location.href; }, 500); 
    }
    else { 
      document.getElementById('otpVerificationBlock').classList.add('hidden'); 
      document.getElementById('passwordResetBlock').classList.remove('hidden'); 
      showMessage("Token authorized! Set new password.", true); 
    }
  } else { 
    showMessage(res ? res.message : "Invalid verification code entry.", false); 
  }
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

// Self-Contained Layout Injector Engine (No external file fetches to prevent 404 Layout Error)
function loadWorkflowHtmlFiles() {
  const container = document.getElementById('dynamicFormContainer');
  const masterContainer = document.getElementById('view-product-master');
  if(!container) return;

  const dispatchHtmlStr = `<div id="b2bDispatchFormBlock" class="hidden"><h2 class="text-lg font-bold border-b pb-2 mb-4 text-slate-700">Daily Execution Input Stream (Tab1)</h2><div id="liveDuplicateWarningBox" class="hidden mb-4 bg-red-100 border border-red-400 text-red-800 rounded-lg p-4 space-y-2"><strong class="text-sm font-bold">⚠️ DUPLICATE INVOICE DETECTED IN SYSTEM</strong><p class="text-xs text-red-700">The invoice highlighted in red below already exists. Historical record metadata:</p><div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-red-200 rounded p-2.5 text-xs font-mono text-gray-700"><div><span class="block text-[10px] text-gray-400 font-sans uppercase font-bold">SERIES ID</span> <span id="dupSeries" class="font-bold text-red-600"></span></div><div><span class="block text-[10px] text-gray-400 font-sans uppercase font-bold">LR NO.</span> <span id="dupLr"></span></div><div><span class="block text-[10px] text-gray-400 font-sans uppercase font-bold">DATE</span> <span id="dupDate"></span></div><div><span class="block text-[10px] text-gray-400 font-sans uppercase font-bold">TRANSPORTER</span> <span id="dupTrans"></span></div></div></div><form id="entryForm" onsubmit="handleFormSubmit(event)" oninput="saveToLocalStorage()"><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="dateInput" required class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Time Input Stamp *</label><input type="time" id="timeInput" required class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Department (Locked) *</label><input type="text" id="deptDisplayField" readonly value="B2B Dispatch" class="w-full p-2 border rounded-md bg-slate-100 font-semibold text-sm text-slate-700"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Transporter *</label><select id="transporterSelect" required onchange="toggleOtherInput(this, 'transporterOtherContainer', 'transporterOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select Transporter</option></select><div id="transporterOtherContainer" class="mt-1.5 hidden"><input type="text" id="transporterOtherInput" placeholder="Type Transporter" class="w-full p-1.5 border border-amber-400 rounded-md bg-amber-50 text-sm"></div></div></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 border-t pt-3"><div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle Registration No. *</label><input type="text" id="vehicleNo" required placeholder="e.g. MH-12-XX-1234" class="w-full p-2 border rounded-md text-sm uppercase"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Full Name *</label><input type="text" id="driverName" required placeholder="Enter Driver Name" class="w-full p-2 border rounded-md text-sm"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Mobile Number *</label><input type="tel" id="driverMobile" required pattern="[0-9]{10}" placeholder="10-Digit Mobile" class="w-full p-2 border rounded-md text-sm"></div></div><div class="border-t border-b border-gray-200 py-4 my-4 bg-slate-50 p-3 rounded-lg"><h3 class="text-sm font-bold text-slate-700 mb-3">Invoices Breakdown Log</h3><div id="invoiceContainer" class="space-y-3"></div><div class="flex justify-end mt-4 pt-2 border-t border-slate-200"><button type="button" onclick="addInvoiceRow()" class="bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded shadow-sm transition">+ Add Invoice Row</button></div></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6"><div><label class="block text-xs font-bold text-gray-600 mb-1">Pallet Count</label><input type="number" id="palletCount" min="0" class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Loading Incharge *</label><select id="inchargeSelect" required onchange="toggleOtherInput(this, 'inchargeOtherContainer', 'inchargeOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select Incharge</option></select><div id="inchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="inchargeOtherInput" placeholder="Type Incharge Name" class="w-full p-1.5 border border-amber-400 rounded-md bg-amber-50 text-sm"></div></div></div><button type="submit" id="submitBtn" class="w-full brand-bg text-white py-3 rounded-md font-bold text-sm tracking-wide shadow">Submit & Generate Gatepass</button></form></div>`;
  const inventoryHtmlStr = `<div id="inventoryFormBlock" class="hidden"><h2 class="text-lg font-bold border-b pb-2 mb-4 text-slate-700">Inventory Operations Stream (Tab4)</h2><form id="inventoryLogForm" onsubmit="handleInventorySubmit(event)" oninput="saveInventoryToCache()"><div class="bg-slate-100 p-4 rounded-xl border mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"><div class="col-span-1 sm:col-span-2 md:col-span-4 border-b pb-1 mb-1"><h4 class="text-xs font-bold text-slate-600 uppercase">🔗 Inward Shipment Header Parameters</h4></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="invDateInput" required class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">PO / Invoice No *</label><input type="text" id="invPoInvoiceNo" required placeholder="Enter PO/Invoice ID" class="w-full p-2 border rounded-md text-sm bg-white font-mono"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Customer Name *</label><input type="text" id="invCustomerName" required placeholder="Enter Customer Name" class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Inward Incharge *</label><select id="invInchargeSelect" required onchange="toggleOtherInput(this, 'invInchargeOtherContainer', 'invInchargeOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select Incharge</option></select><div id="invInchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="invInchargeOtherInput" placeholder="Type Incharge Name" class="w-full p-1.5 border border-amber-400 rounded-md bg-amber-50 text-sm"></div></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Transporter *</label><select id="invTransporterSelect" required onchange="toggleOtherInput(this, 'invTransporterOtherContainer', 'invTransporterOtherInput')" class="w-full p-2 border rounded-md bg-white text-sm"><option value="">Select Transporter</option></select><div id="invTransporterOtherContainer" class="mt-1.5 hidden"><input type="text" id="invTransporterOtherInput" placeholder="Type Transporter" class="w-full p-1.5 border border-amber-400 rounded-md bg-amber-50 text-sm"></div></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle No *</label><input type="text" id="invVehicleNo" required placeholder="MH-12-XX-1234" class="w-full p-2 border rounded-md text-sm uppercase font-mono"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Name *</label><input type="text" id="invDriverName" required placeholder="Driver Full Name" class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Number *</label><input type="tel" id="invDriverNumber" required pattern="[0-9]{10}" placeholder="10-Digit Mobile" class="w-full p-2 border rounded-md text-sm font-mono"></div><div class="relative"><label class="block text-xs font-bold text-gray-600 mb-1">LR No *</label><div class="flex space-x-1"><input type="text" id="invLrNo" required placeholder="LR Number" class="w-full p-2 border rounded-md text-sm font-mono"><button type="button" onclick="openMobileCameraScanner('invLrNo')" class="bg-amber-500 text-slate-950 px-2 text-xs rounded font-bold">📷 Scan</button></div></div><div><label class="block text-xs font-bold text-gray-600 mb-1">PO Total Qty *</label><input type="number" id="invPoTotalQty" min="1" required class="w-full p-2 border rounded-md text-sm font-bold"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">PO Total Box Qty *</label><input type="number" id="invPoTotalBoxQty" min="1" required class="w-full p-2 border rounded-md text-sm font-bold"></div></div><div class="border-t border-b border-gray-200 py-4 my-4 bg-slate-50 p-3 rounded-lg"><h3 class="text-sm font-bold text-slate-700 mb-3">Physical Inward Material Row Matrix</h3><div id="inventoryItemsContainer" class="space-y-4"></div><div class="flex justify-end mt-4 pt-2"><button type="button" onclick="addInventoryItemRow()" class="bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded shadow-sm transition">+ Add Material Row</button></div></div><button type="submit" id="invSubmitBtn" class="w-full brand-bg text-white py-3 rounded-md font-bold text-sm tracking-wide shadow">Commit Material Logs to Tab4 Ledger</button></form></div>`;
  const rtoHtmlStr = `<div id="rtoFormBlock" class="hidden"><div class="flex border-b border-gray-200 mb-6 bg-slate-100 p-1 rounded-lg max-w-md"><button type="button" id="rtoB2bToggleTab" onclick="switchRtoSubWorkflow('B2B')" class="w-1/2 text-center py-2 px-4 rounded-md text-xs font-bold uppercase transition-all bg-amber-500 text-slate-950 shadow-sm">📦 B2B Return</button><button type="button" id="rtoB2cToggleTab" onclick="switchRtoSubWorkflow('B2C')" class="w-1/2 text-center py-2 px-4 rounded-md text-xs font-bold uppercase transition-all text-slate-600">🛵 B2C Courier Return</button></div><div id="rtoB2bLayoutSection"><h2 class="text-base font-bold text-slate-700 mb-1">B2B Return Log Matrix (Tab5)</h2><form id="rtoB2bForm" onsubmit="handleRtoB2bSubmit(event)" oninput="saveRtoToCache()"><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="rtoB2bDate" required class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Invoice No. *</label><input type="text" id="rtoB2bInvoice" required placeholder="Invoice No" class="w-full p-2 border rounded-md text-sm font-mono"></div><div class="relative"><label class="block text-xs font-bold text-gray-600 mb-1">LR No. *</label><div class="flex space-x-1"><input type="text" id="rtoB2bLrNo" required placeholder="LR Tracking ID" class="w-full p-2 border rounded-md text-sm font-mono"><button type="button" onclick="openMobileCameraScanner('rtoB2bLrNo')" class="bg-amber-500 text-slate-950 px-2 text-xs rounded font-bold">📷 Scan</button></div></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Return Incharge *</label><select id="rtoB2bInchargeSelect" required onchange="toggleOtherInput(this, 'rtoB2bInchargeOtherContainer', 'rtoB2bInchargeOtherInput')" class="rto-inch-drop w-full p-2 border rounded-md text-sm"><option value="">Select Incharge</option></select><div id="rtoB2bInchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2bInchargeOtherInput" class="w-full p-1.5 border rounded-md text-sm bg-amber-50"></div></div></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"><div id="rtoTransDropDiv"><label class="block text-xs font-bold text-gray-600 mb-1">Transporter *</label><select id="rtoB2bTransporterSelect" required onchange="toggleOtherInput(this, 'rtoB2bTransporterOtherContainer', 'rtoB2bTransporterOtherInput')" class="rto-trans-drop w-full p-2 border rounded-md text-sm"><option value="">Select Transporter</option></select><div id="rtoB2bTransporterOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2bTransporterOtherInput" class="w-full p-1.5 border rounded-md text-sm bg-amber-50"></div></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Box Qty *</label><input type="number" id="rtoB2bBoxQty" min="1" required class="w-full p-2 border rounded-md text-sm"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle Registration No. *</label><input type="text" id="rtoB2bVehicle" required placeholder="e.g. MH-12-XX-1234" class="w-full p-2 border rounded-md text-sm uppercase font-mono"></div></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 border-t pt-3"><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Name *</label><input type="text" id="rtoB2bDriver" required placeholder="Driver Name" class="w-full p-2 border rounded-md text-sm"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Mobile No. *</label><input type="tel" id="rtoB2bMobile" required pattern="[0-9]{10}" placeholder="10-Digit Mobile" class="w-full p-2 border rounded-md text-sm font-mono"></div></div><div class="mb-6"><label class="block text-xs font-bold text-red-600 mb-1">Operational Remark *</label><input type="text" id="rtoB2bRemark" required placeholder="Describe damages..." class="w-full p-2 border rounded-md text-sm border-slate-300"></div><button type="submit" id="rtoB2bSubmitBtn" class="w-full brand-bg text-white py-3 rounded-md font-bold text-sm tracking-wide shadow">Log B2B Return Entry</button></form></div><div id="rtoB2cLayoutSection" class="hidden"><h2 class="text-base font-bold text-slate-700 mb-1">B2C Return Log Matrix (Tab6)</h2><form id="rtoB2cForm" onsubmit="handleRtoB2cSubmit(event)" oninput="saveRtoToCache()"><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4"><div><label class="block text-xs font-bold text-gray-600 mb-1">Date *</label><input type="date" id="rtoB2cDate" required class="w-full p-2 border rounded-md text-sm bg-white"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Vehicle Registration No. *</label><input type="text" id="rtoB2cVehicle" required placeholder="e.g. MH-12-XX-1234" class="w-full p-2 border rounded-md text-sm uppercase font-mono"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Courier / Transporter *</label><select id="rtoB2cCourierSelect" required onchange="toggleOtherInput(this, 'rtoB2cCourierOtherContainer', 'rtoB2cCourierOtherInput')" class="rto-trans-drop w-full p-2 border rounded-md text-sm"><option value="">Select Courier Engine</option></select><div id="rtoB2cCourierOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2cCourierOtherInput" class="w-full p-1.5 border rounded-md text-sm bg-amber-50"></div></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Return Incharge *</label><select id="rtoB2cInchargeSelect" required onchange="toggleOtherInput(this, 'rtoB2cInchargeOtherContainer', 'rtoB2cInchargeOtherInput')" class="rto-inch-drop w-full p-2 border rounded-md text-sm"><option value="">Select Incharge</option></select><div id="rtoB2cInchargeOtherContainer" class="mt-1.5 hidden"><input type="text" id="rtoB2cInchargeOtherInput" class="w-full p-1.5 border rounded-md text-sm bg-amber-50"></div></div></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 border-t pt-3"><div id="rtoRiderNameDiv"><label class="block text-xs font-bold text-gray-600 mb-1">Delivery Rider Name *</label><input type="text" id="rtoB2cDriver" required placeholder="Rider Name" class="w-full p-2 border rounded-md text-sm"></div><div><label class="block text-xs font-bold text-gray-600 mb-1">Driver Mobile No. *</label><input type="tel" id="rtoB2cMobile" required pattern="[0-9]{10}" placeholder="10-Digit Mobile" class="w-full p-2 border rounded-md text-sm font-mono"></div></div><div class="mb-4"><label class="block text-xs font-bold text-red-600 mb-1">Global Return Operational Remark *</label><input type="text" id="rtoB2cCommonRemark" required value="No Damage" class="w-full p-2 border rounded-md text-sm"></div><div class="border-t border-b py-4 my-4 bg-slate-50 p-3 rounded-lg"><h3 class="text-xs font-bold text-slate-700 mb-2 uppercase">AWB Shipping Records Breakdown Grid</h3><div id="rtoB2cAwbContainer" class="space-y-2.5"></div><div class="flex justify-end mt-3"><button type="button" onclick="addRtoB2cAwbRow()" class="bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded shadow-xs transition">+ Add AWB Code Row</button></div></div><button type="submit" id="rtoB2cSubmitBtn" class="w-full bg-amber-500 text-slate-950 py-3 rounded-md font-bold text-sm tracking-wide shadow">Log B2C Return Entries</button></form></div></div>`;
  const masterHtmlStr = `<div class="space-y-6"><div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-3"><div><h2 class="text-lg font-bold text-slate-700">Central Product Master Repository (Tab3) <span id="pmTotalCountBadge" class="ml-2 bg-amber-500 text-slate-950 font-mono text-xs px-2 py-0.5 rounded-full font-bold">0 Items</span></h2><p class="text-xs text-slate-400">View SKU catalogs and upload master logs.</p></div><div class="flex items-center space-x-2"><label class="bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded shadow transition cursor-pointer">📥 Upload Excel CSV<input type="file" id="excelCsvFileInput" accept=".csv" onchange="handleExcelCsvImport(this)" class="hidden"></label><button onclick="downloadProductMasterAsCsv()" class="bg-blue-600 text-white font-bold text-xs py-2 px-3 rounded shadow">📤 Download Catalog</button><button onclick="toggleAddProductModal(true)" class="bg-amber-500 text-slate-950 font-bold text-xs py-2 px-3 rounded shadow">+ Register Item</button></div></div><div class="flex flex-col sm:flex-row items-center gap-2"><div class="w-full"><input type="text" id="pmSearchQuery" onkeyup="filterProductMasterViewTable()" placeholder="Search Item Master by Name, SKU, or Barcode..." class="w-full p-2 border rounded text-sm font-medium bg-white"></div><div class="w-full sm:w-48 flex items-center space-x-1.5"><label class="text-xs font-bold text-slate-500 whitespace-nowrap">View Limit:</label><select id="pmViewLimitSelect" onchange="filterProductMasterViewTable()" class="w-full p-2 border rounded text-sm bg-white text-gray-700"><option value="50">50 Rows</option><option value="100">100 Rows</option><option value="200" selected>200 Rows</option><option value="500">500 Rows</option></select></div></div><div class="overflow-x-auto border rounded-lg shadow-xs"><table class="min-w-full divide-y text-xs text-left"><thead class="bg-slate-800 text-white font-semibold uppercase text-[10px]"><tr><th class="px-4 py-3">Item Barcode</th><th class="px-4 py-3">SKU Code</th><th class="px-4 py-3">Item Description Name</th><th class="px-4 py-3">UOM</th><th class="px-4 py-3">Pack Size</th></tr></thead><tbody id="productMasterTableBody" class="divide-y bg-white text-gray-600"></tbody></table></div></div>`;

  container.innerHTML = dispatchHtmlStr + inventoryHtmlStr + rtoHtmlStr;
  masterContainer.innerHTML = masterHtmlStr;
  
  // Triggers automated drafts state retention sequence
  loadB2bCacheData();
  loadInventoryCacheData();
  loadRtoCacheData();
  
  initFormInterceptorsAndDropdowns();
}

function initFormInterceptorsAndDropdowns() {
  if(document.getElementById('deptDisplayField')) document.getElementById('deptDisplayField').value = workflowDept;
  apiFetch("getDropdownData").then(dropdowns => {
    if(dropdowns) { populateDropdownsB2b(dropdowns); populateDropdownsInv(dropdowns); populateDropdownsRto(dropdowns); }
  });
  apiFetch("getProductMasterData").then(products => {
    if(products) { globalProductMasterList = products; syncProductMasterLocalState(products); }
  });
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

// 5. CORRECTED WORKSPACE CONTROLLER LINK: Resets date inputs to prevent dashboard data overlaps
function activateModuleWorkflow(deptName, viewTarget) {
  workflowDept = deptName; currentViewTarget = viewTarget;
  localStorage.setItem('active_workflow_dept', deptName); localStorage.setItem('current_view_target', viewTarget);
  
  // Wipes existing calendar cache buffers to prevent cross-contamination between workspaces
  var fDate = document.getElementById('filterFromDate'); if(fDate) fDate.value = "";
  var tDate = document.getElementById('filterToDate'); if(tDate) tDate.value = "";
  var sSeries = document.getElementById('searchSeries'); if(sSeries) sSeries.value = "";
  var sInvoice = document.getElementById('searchInvoice'); if(sInvoice) sInvoice.value = "";
  var sLr = document.getElementById('searchLr'); if(sLr) sLr.value = "";
  var sTrans = document.getElementById('searchTransporter'); if(sTrans) sTrans.value = "";

  document.getElementById('moduleTitle').innerText = workflowDept + " Workspace";
  evaluateActiveWorkflowViewState(); 
  switchView(viewTarget); 
  fetchLiveDashboardDataRecords();
  toggleSidebar();
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

// 4. FIXED CASE DICTIONARY REFERENCE: Maps duplicate past histories to upper case keys
async function executeLiveDuplicateCheck(input) {
  var val = input.value.trim(); if (!val) return;
  const res = await apiFetch("checkInvoiceDuplicateLive", val);
  var box = document.getElementById('liveDuplicateWarningBox');
  if (res && res.isDuplicate) {
    input.classList.add('border-red-500', 'bg-red-50');
    
    // Explicitly targets upper case tracking string fields matching your warning box design layout
    document.getElementById('dupSeries').innerText = res.seriesNo || "N/A"; 
    document.getElementById('dupLr').innerText = res.lrNo || "N/A";
    document.getElementById('dupDate').innerText = res.date || "N/A"; 
    document.getElementById('dupTrans').innerText = res.transporter || "N/A";
    
    box.classList.remove('hidden'); isSubmissionHaltedForDuplicate = true;
    document.getElementById('submitBtn').disabled = true; document.getElementById('submitBtn').innerText = "LOCKED";
  } else { input.classList.remove('border-red-500', 'bg-red-50'); evaluateFormSubmissionSubmissionValidityState(); }
}

function evaluateFormSubmissionSubmissionValidityState() {
  var inputs = document.querySelectorAll('.invoice-num'); var found = false;
  for(var i=0; i<inputs.length; i++) { if(inputs[i].classList.contains('border-red-500')) { found = true; break; } }
  if(!found) { 
    var box = document.getElementById('liveDuplicateWarningBox'); if(box) box.classList.add('hidden');
    isSubmissionHaltedForDuplicate = false; 
    var sBtn = document.getElementById('submitBtn'); if(sBtn) { sBtn.disabled = false; sBtn.innerText = "Submit & Generate Gatepass"; }
  }
}

function addInvoiceRow(n='', b='', l='', r='') {
  var container = document.getElementById('invoiceContainer'); if(!container) return;
  var rowCount = container.children.length + 1;
  var id = 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="grid grid-cols-1 md:grid-cols-4 gap-2 bg-white p-2.5 border rounded shadow-xs relative">
      <div><label class="block text-[10px] font-bold text-gray-400">Invoice Number (Strict 9 Digits) *</label><input type="text" value="${n}" required onblur="executeLiveDuplicateCheck(this)" class="invoice-num w-full p-1.5 border text-sm rounded"></div>
      <div><label class="block text-[10px] font-bold text-gray-400">Box Count *</label><input type="number" min="1" value="${b}" required class="box-count w-full p-1.5 border text-sm rounded"></div>
      <div>
        <label class="block text-[10px] font-bold text-gray-400">LR No *</label>
        <div class="flex space-x-1">
          <input type="text" id="input_lr_${id}" value="${l}" required class="lr-no w-full p-1.5 border text-sm rounded font-mono">
          <button type="button" onclick="openMobileCameraScanner('input_lr_${id}')" class="bg-amber-500 text-slate-950 px-2 text-xs rounded font-bold">📷 Scan</button>
        </div>
      </div>
      <div class="flex items-end space-x-1"><div class="w-full"><label class="block text-[10px] font-bold text-gray-400">Remark (Optional)</label><input type="text" value="${r}" class="row-remark w-full p-1.5 border text-sm rounded"></div>
      ${rowCount > 1 ? `<button type="button" onclick="document.getElementById('${id}').remove(); saveToLocalStorage();" class="bg-red-500 text-white px-2 py-1.5 rounded text-sm font-bold">X</button>` : ''}</div>
    </div>`);
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

function populateDropdownsB2b(dropdowns) {
  populateDropdown('transporterSelect', dropdowns.transporters);
  populateDropdown('inchargeSelect', dropdowns.incharges);
}

function populateDropdownsInv(dropdowns) {
  populateDropdown('invTransporterSelect', dropdowns.transporters);
  populateDropdown('invInchargeSelect', dropdowns.incharges);
}

// RESTORED COMPREHENSIVE MULTI-MODULE DROPDOWN POPULATOR HOOKS
function populateDropdownsRto(dropdowns) {
  populateDropdown('rtoB2bTransporterSelect', dropdowns.transporters);
  populateDropdown('rtoB2bInchargeSelect', dropdowns.incharges);
  populateDropdown('rtoB2cCourierSelect', dropdowns.transporters);
  populateDropdown('rtoB2cInchargeSelect', dropdowns.incharges);
}

function toggleOtherInput(selectElement, containerId, inputId) {
  var container = document.getElementById(containerId);
  var input = document.getElementById(inputId);
  if(!container || !input) return;
  if (selectElement.value === "Other") { container.classList.remove('hidden'); input.required = true; input.focus(); }
  else { container.classList.add('hidden'); input.required = false; input.value = ""; }
}

async function handleFormSubmit(e) {
  e.preventDefault(); if(isSubmissionHaltedForDuplicate) return;
  var rows = document.getElementById('invoiceContainer').children; var data = [];
  for(var i=0; i<rows.length; i++) { data.push({ invoiceNum: rows[i].querySelector('.invoice-num').value, boxCount: rows[i].querySelector('.box-count').value, lrNo: rows[i].querySelector('.lr-no').value, remark: rows[i].querySelector('.row-remark')?.value || "" }); }
  var btn = document.getElementById('submitBtn'); btn.disabled = true; btn.innerText = "Transmitting...";
  var payload = { date: document.getElementById('dateInput').value, time: document.getElementById('timeInput').value, department: "B2B Dispatch", transporter: document.getElementById('transporterSelect').value, vehicleNo: document.getElementById('vehicleNo').value, driverName: document.getElementById('driverName').value, driverMobile: document.getElementById('driverMobile').value, palletCount: document.getElementById('palletCount').value || 0, incharge: document.getElementById('inchargeSelect').value, invoices: data };
  const res = await apiFetch("submitEntries", payload); btn.disabled = false; btn.innerText = "Submit & Generate Gatepass";
  if(res && res.success) { renderPrintLayout(payload, res.seriesNo); localStorage.removeItem('draft_cache_b2b_dispatch'); document.getElementById('entryForm').reset(); document.getElementById('invoiceContainer').innerHTML = ''; addInvoiceRow(); fetchLiveDashboardDataRecords(); }
}

// Inventory Handling Logic Arrays
function addInventoryItemRow(item='', bar='', sku='', b='', q='', box='', st='Pending') {
  var container = document.getElementById('inventoryItemsContainer'); if(!container) return;
  var id = 'invRow_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="bg-white p-3 border rounded-lg shadow-xs space-y-2 relative" data-selected-item="${item}" data-selected-barcode="${bar}" data-selected-sku="${sku}">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><label class="text-[10px] font-bold text-gray-400">Barcode *</label><input type="text" value="${bar}" onfocus="showInvSearchDropdown('${id}', 'barcode')" onkeyup="filterInvSearchDropdown('${id}', 'barcode')" class="inv-barcode-search-input w-full p-1.5 border text-sm rounded"><div class="inv-barcode-dropdown-list hidden absolute max-h-40 overflow-y-auto bg-white border z-50 text-xs w-full"></div></div>
        <div><label class="text-[10px] font-bold text-gray-400">Item Name *</label><input type="text" value="${item}" onfocus="showInvSearchDropdown('${id}', 'item')" onkeyup="filterInvSearchDropdown('${id}', 'item')" class="inv-item-search-input w-full p-1.5 border text-sm rounded"><div class="inv-item-dropdown-list hidden absolute max-h-40 overflow-y-auto bg-white border z-50 text-xs w-full"></div></div>
        <div><label class="text-[10px] font-bold text-gray-400">SKU Code *</label><input type="text" value="${sku}" onfocus="showInvSearchDropdown('${id}', 'sku')" onkeyup="filterInvSearchDropdown('${id}', 'sku')" class="inv-sku-search-input w-full p-1.5 border text-sm rounded"><div class="inv-sku-dropdown-list hidden absolute max-h-40 overflow-y-auto bg-white border z-50 text-xs w-full"></div></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div><label class="text-[10px] font-bold text-gray-400">Batch *</label><input type="text" value="${b}" required class="inv-batch-no w-full p-1.5 border text-sm font-mono"></div>
        <div><label class="text-[10px] font-bold text-gray-400">Qty *</label><input type="number" value="${q}" required class="inv-total-qty w-full p-1.5 border text-sm font-bold"></div>
        <div><label class="text-[10px] font-bold text-gray-400">Boxes *</label><input type="number" value="${box}" required class="inv-no-of-box w-full p-1.5 border text-sm"></div>
        <div><label class="text-[10px] font-bold text-gray-400">Status *</label><select class="inv-status w-full p-1.5 border text-sm"><option value="Pending" ${st==='Pending'?'selected':''}>Pending</option><option value="Closed" ${st==='Closed'?'selected':''}>Closed</option></select></div>
      </div>
      ${container.children.length > 0 ? `<button type="button" onclick="document.getElementById('${id}').remove(); saveInventoryToCache();" class="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shadow-sm">✕</button>` : ''}
    </div>`);
  buildDropdownDomTreeLists(id);
}

function initInventorySearchableDropdownEngine() {
  var container = document.getElementById('inventoryItemsContainer');
  if(container && container.children.length === 0) { addInventoryItemRow(); }
}

async function handleInventorySubmit(e) {
  e.preventDefault(); var rows = document.getElementById('inventoryItemsContainer').children; var items = [];
  for (var i=0; i < rows.length; i++) { items.push({ itemName: rows[i].getAttribute('data-selected-item'), barcode: rows[i].getAttribute('data-selected-barcode'), skuCode: rows[i].getAttribute('data-selected-sku'), batchNo: rows[i].querySelector('.inv-batch-no').value, physicalQuantity: rows[i].querySelector('.inv-total-qty').value, boxCount: rows[i].querySelector('.inv-no-of-box').value, status: rows[i].querySelector('.inv-status').value }); }
  var payload = { date: document.getElementById('invDateInput').value, poInvoiceNo: document.getElementById('invPoInvoiceNo').value, customerName: document.getElementById('invCustomerName').value, poTotalQty: document.getElementById('invPoTotalQty').value, poTotalBoxQty: document.getElementById('invPoTotalBoxQty').value, vehicleNo: document.getElementById('invVehicleNo').value, transporter: document.getElementById('invTransporterSelect').value, driverName: document.getElementById('invDriverName').value, driverNumber: document.getElementById('invDriverNumber').value, lrNo: document.getElementById('invLrNo').value, incharge: document.getElementById('invInchargeSelect').value, items: items };
  const res = await apiFetch("submitInventoryLogs", payload);
  if(res && res.success) { localStorage.removeItem('draft_cache_inventory'); alert("Committed under No: " + res.seriesNo); window.location.reload(); }
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

// 2. CORRECTED MATERIAL AUTOCOMPLETION LOOKUPS VIEW FILTERS
function filterInvSearchDropdown(id, type) {
  var r = document.getElementById(id); if(!r) return;
  var inputVal = r.querySelector(`.inv-${type}-search-input`).value.toLowerCase().trim();
  var listContainer = r.querySelector(`.inv-${type}-dropdown-list`); if(!listContainer) return;
  listContainer.innerHTML = ""; listContainer.classList.remove('hidden');

  var matches = globalProductMasterList.filter(function(prod) {
    var checkField = (type === 'barcode') ? prod.barcode : (type === 'item' ? prod.itemName : prod.skuCode);
    return checkField.toLowerCase().includes(inputVal);
  });

  matches.slice(0, 30).forEach(prod => {
    var d = document.createElement('div'); d.className = "p-1.5 hover:bg-amber-100 cursor-pointer border-b border-slate-100 text-xs";
    d.innerText = (type === 'barcode') ? prod.barcode : (type === 'item' ? prod.itemName : prod.skuCode);
    d.onclick = () => selectInvProductData(id, prod);
    listContainer.appendChild(d);
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
  const res = await apiFetch("submitRtoB2bLog", payload); if(res && res.success) { localStorage.removeItem('draft_cache_rto'); alert("Logged B2B Return ID: " + res.seriesNo); window.location.reload(); }
}

function addRtoB2cAwbRow(awbVal='') {
  var c = document.getElementById('rtoB2cAwbContainer'); if(!c) return;
  var id = 'awb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  c.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="flex items-center space-x-2 bg-white p-2 border rounded">
      <div class="w-full">
        <label class="text-[9px] text-gray-400 font-bold">AWB Code / Invoice *</label>
        <div class="flex space-x-1">
          <input type="text" id="input_awb_${id}" value="${awbVal}" required class="b2c-awb-input w-full p-1.5 border text-xs font-mono font-bold">
          <button type="button" onclick="openMobileCameraScanner('input_awb_${id}')" class="bg-amber-500 text-slate-950 px-2.5 text-xs rounded font-bold">📷 Scan</button>
        </div>
      </div>
      <button type="button" onclick="document.getElementById('${id}').remove(); saveRtoToCache();" class="bg-red-500 text-white h-9 px-3 mt-4 rounded text-xs">✕</button>
    </div>`);
}

async function handleRtoB2cSubmit(e) {
  e.preventDefault(); var inputs = document.querySelectorAll('.b2c-awb-input'); var records = [];
  inputs.forEach(i => { if(i.value.trim()) records.push({ awbNo: i.value.trim(), status: "Pending" }); });
  var payload = { date: document.getElementById('rtoB2cDate').value, vehicleNo: document.getElementById('rtoB2cVehicle').value, courierOrTransporter: document.getElementById('rtoB2cCourierSelect').value, driverName: document.getElementById('rtoB2cDriver').value, driverMobile: document.getElementById('rtoB2cMobile').value, remark: document.getElementById('rtoB2cCommonRemark').value, incharge: document.getElementById('rtoB2cInchargeSelect').value, records: records };
  const res = await apiFetch("submitRtoB2cBulkMatrix", payload); if(res && res.success) { localStorage.removeItem('draft_cache_rto'); alert("Logged B2C Array Matrix Stack: " + res.seriesNo); window.location.reload(); }
}

// 2. CORRECTED PRODUCT MASTER VISUAL VIEW FILTER SEARCH ENGINE
function filterProductMasterViewTable() {
  var q = document.getElementById('pmSearchQuery').value.toLowerCase().trim();
  var limit = parseInt(document.getElementById('pmViewLimitSelect').value || 200, 10);
  var body = document.getElementById('productMasterTableBody'); if(!body) return;
  body.innerHTML = "";
  
  var filtered = globalProductMasterList.filter(function(item) {
    return !q || item.barcode.toLowerCase().includes(q) || item.skuCode.toLowerCase().includes(q) || item.itemName.toLowerCase().includes(q);
  });
  
  document.getElementById('pmTotalCountBadge').innerText = filtered.length + " Items";
  
  filtered.slice(0, limit).forEach(item => {
    body.insertAdjacentHTML('beforeend', `<tr class="hover:bg-slate-50"><td class="px-4 py-2 font-mono">${item.barcode}</td><td class="px-4 py-2 font-mono font-bold">${item.skuCode}</td><td class="px-4 py-2">${item.itemName}</td><td class="px-4 py-2">${item.uom}</td><td class="px-4 py-2 font-mono">${item.packSize}</td></tr>`);
  });
}

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
  
  var currentTabLabel = (workflowDept === "B2B Dispatch") ? "Tab1" : (workflowDept === "Inventory Logging" ? "Tab4" : "Tab5/Tab6");
  var dashTabTitle = document.getElementById('dashTabTitle'); if (dashTabTitle) dashTabTitle.innerText = currentTabLabel;
  var thSeriesId = document.getElementById('thSeriesId'); if (thSeriesId) thSeriesId.innerText = (workflowDept === "B2B Dispatch") ? "Gatepass ID" : "Gate Entry No";

  const data = await apiFetch("getDashboardDataByWorkspace", workflowDept);
  if(data && Array.isArray(data)) { masterData = data; applyFilters(); }
  else { body.innerHTML = `<tr><td colspan="11" class="text-center p-4 text-gray-400">No active operational logs inside ${currentTabLabel} database.</td></tr>`; }
}

// 1. CORRECTED CHRONOLOGICAL DATE MATRIX COMPILER ENGINE
function applyFilters() {
  var fromDate = document.getElementById('filterFromDate')?.value || "";
  var toDate = document.getElementById('filterToDate')?.value || "";
  var sF = document.getElementById('searchSeries')?.value.toLowerCase().trim() || "";
  var deF = document.getElementById('searchDept')?.value.toLowerCase().trim() || "";
  var iF = document.getElementById('searchInvoice')?.value.toLowerCase().trim() || "";
  var lF = document.getElementById('searchLr')?.value.toLowerCase().trim() || "";
  var tF = document.getElementById('searchTransporter')?.value.toLowerCase().trim() || "";

  currentlyFilteredData = masterData.filter(function(row) {
    if (fromDate && row.date && row.date < fromDate) return false;
    if (toDate && row.date && row.date > toDate) return false;
    
    return (!sF || (row.seriesNo && row.seriesNo.toString().toLowerCase().includes(sF))) &&
           (!deF || (row.dept && row.dept.toLowerCase().includes(deF))) &&
           (!iF || (row.invoice && row.invoice.toString().toLowerCase().includes(iF))) &&
           (!lF || (row.lr && row.lr.toLowerCase().includes(lF)) || (row.status && row.status.toLowerCase().includes(lF))) &&
           (!tF || (row.transporter && row.transporter.toLowerCase().includes(tF)));
  });
  renderTable(currentlyFilteredData);
}

function renderTable(data) {
  var b = document.getElementById('dataTableBody'); if(!b) return; b.innerHTML = "";
  if (!data || data.length === 0) { document.getElementById('rowCountLabel').innerText = "0"; b.innerHTML = `<tr><td colspan="11" class="text-center p-4 text-gray-400">No active records found matching criteria.</td></tr>`; return; }
  document.getElementById('rowCountLabel').innerText = data.length;
  data.forEach(r => {
    b.insertAdjacentHTML('beforeend', `<tr class="text-xs hover:bg-slate-50"><td class="px-3 py-2 font-bold font-mono ${r.seriesNo.startsWith('RB')?'text-blue-600':(r.seriesNo.startsWith('IN')?'text-emerald-600':'')}">${r.seriesNo}</td><td class="px-3 py-2">${r.date} @ ${r.time}</td><td class="px-3 py-2 text-amber-600 font-bold">${r.dept}</td><td class="px-3 py-2">${r.transporter}</td><td class="px-3 py-2 font-mono font-bold">${r.vehicleNo}</td><td class="px-3 py-2">${r.driverName} <br><span class="text-[10px] text-gray-400">${r.driverMobile || ''}</span></td><td class="px-3 py-2 font-mono">${r.invoice}</td><td class="px-3 py-2 text-center font-bold">${r.boxes}</td><td class="px-3 py-2 max-w-[120px] truncate" title="${r.remark || r.lr || ''}">${r.remark || r.lr}</td><td class="px-3 py-2 text-center font-bold">${r.pallets || r.status}</td><td class="px-3 py-2">${r.incharge}</td></tr>`);
  });
}

// 3. WORKING FILTERED EXCEL EXPORTER INTERFACE MODULE
function exportFilteredDataToExcel() {
  if(!currentlyFilteredData || currentlyFilteredData.length === 0) { alert("No filtered rows available to compile."); return; }
  var csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Series ID,Date Time,Department,Transporter,Vehicle No,Driver Profile,Invoice Number,Quantity Boxes,Tracking Remark,Status Pallets,Authorized Incharge\n";
  currentlyFilteredData.forEach(function(r) {
    csvContent += `"${r.seriesNo}","${r.date} @ ${r.time}","${r.dept}","${r.transporter}","${r.vehicleNo}","${r.driverName}","${r.invoice}","${r.boxes}","${r.remark || r.lr}","${r.pallets || r.status}","${r.incharge}"\n`;
  });
  var encodedUri = encodeURI(csvContent); var link = document.createElement("a"); link.setAttribute("href", encodedUri);
  link.setAttribute("download", `QuickShift_Filtered_Ledger_${workflowDept.replace(' ','_')}.csv`);
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// 3. PERSISTENT LOCAL STORAGE DRAFT RAM PERSISTENCE UTILITIES
function saveToLocalStorage() {
  if(workflowDept !== "B2B Dispatch") return;
  var rows = document.getElementById('invoiceContainer')?.children || []; var invoices = [];
  for(var i=0; i<rows.length; i++) {
    var n = rows[i].querySelector('.invoice-num')?.value; var b = rows[i].querySelector('.box-count')?.value; var l = rows[i].querySelector('.lr-no')?.value; var r = rows[i].querySelector('.row-remark')?.value || "";
    if(n || b || l) invoices.push({ num: n, box: b, lr: l, remark: r });
  }
  localStorage.setItem('draft_cache_b2b_dispatch', JSON.stringify({ date: document.getElementById('dateInput')?.value, time: document.getElementById('timeInput')?.value, transporter: document.getElementById('transporterSelect')?.value, vehicleNo: document.getElementById('vehicleNo')?.value, driverName: document.getElementById('driverName')?.value, driverMobile: document.getElementById('driverMobile')?.value, palletCount: document.getElementById('palletCount')?.value, incharge: document.getElementById('inchargeSelect')?.value, invoices: invoices }));
}

function loadB2bCacheData() {
  var raw = localStorage.getItem('draft_cache_b2b_dispatch'); if(!raw) return; var cache = JSON.parse(raw);
  if(document.getElementById('dateInput')) document.getElementById('dateInput').value = cache.date || "";
  if(document.getElementById('timeInput')) document.getElementById('timeInput').value = cache.time || "";
  if(document.getElementById('transporterSelect')) document.getElementById('transporterSelect').value = cache.transporter || "";
  if(document.getElementById('vehicleNo')) document.getElementById('vehicleNo').value = cache.vehicleNo || "";
  if(document.getElementById('driverName')) document.getElementById('driverName').value = cache.driverName || "";
  if(document.getElementById('driverMobile')) document.getElementById('driverMobile').value = cache.driverMobile || "";
  if(document.getElementById('palletCount')) document.getElementById('palletCount').value = cache.palletCount || "";
  if(document.getElementById('inchargeSelect')) document.getElementById('inchargeSelect').value = cache.incharge || "";
  if(cache.invoices && cache.invoices.length > 0) {
    var container = document.getElementById('invoiceContainer'); if(container) container.innerHTML = "";
    cache.invoices.forEach(inv => addInvoiceRow(inv.num, inv.box, inv.lr, inv.remark));
  }
}

function saveInventoryToCache() {
  var rows = document.getElementById('inventoryItemsContainer')?.children || []; var items = [];
  for(var i=0; i<rows.length; i++) { items.push({ item: rows[i].getAttribute('data-selected-item'), barcode: rows[i].getAttribute('data-selected-barcode'), sku: rows[i].getAttribute('data-selected-sku'), batch: rows[i].querySelector('.inv-batch-no')?.value, qty: rows[i].querySelector('.inv-total-qty')?.value, box: rows[i].querySelector('.inv-no-of-box')?.value, status: rows[i].querySelector('.inv-status')?.value }); }
  localStorage.setItem('draft_cache_inventory', JSON.stringify({ date: document.getElementById('invDateInput')?.value, poInvoiceNo: document.getElementById('invPoInvoiceNo')?.value, customerName: document.getElementById('invCustomerName')?.value, incharge: document.getElementById('invInchargeSelect')?.value, transporter: document.getElementById('invTransporterSelect')?.value, vehicleNo: document.getElementById('invVehicleNo')?.value, driverName: document.getElementById('invDriverName')?.value, driverNumber: document.getElementById('invDriverNumber')?.value, lrNo: document.getElementById('invLrNo')?.value, poTotalQty: document.getElementById('invPoTotalQty')?.value, poTotalBoxQty: document.getElementById('invPoTotalBoxQty')?.value, items: items }));
}

function loadInventoryCacheData() {
  var raw = localStorage.getItem('draft_cache_inventory'); if(!raw) return; var cache = JSON.parse(raw);
  if(document.getElementById('invDateInput')) document.getElementById('invDateInput').value = cache.date || "";
  if(document.getElementById('invPoInvoiceNo')) document.getElementById('invPoInvoiceNo').value = cache.poInvoiceNo || "";
  if(document.getElementById('invCustomerName')) document.getElementById('invCustomerName').value = cache.customerName || "";
  if(document.getElementById('invInchargeSelect')) document.getElementById('invInchargeSelect').value = cache.incharge || "";
  if(document.getElementById('invTransporterSelect')) document.getElementById('invTransporterSelect').value = cache.transporter || "";
  if(document.getElementById('invVehicleNo')) document.getElementById('invVehicleNo').value = cache.vehicleNo || "";
  if(document.getElementById('invDriverName')) document.getElementById('invDriverName').value = cache.driverName || "";
  if(document.getElementById('invDriverNumber')) document.getElementById('invDriverNumber').value = cache.driverNumber || "";
  if(document.getElementById('invLrNo')) document.getElementById('invLrNo').value = cache.lrNo || "";
  if(document.getElementById('invPoTotalQty')) document.getElementById('invPoTotalQty').value = cache.poTotalQty || "";
  if(document.getElementById('invPoTotalBoxQty')) document.getElementById('invPoTotalBoxQty').value = cache.poTotalBoxQty || "";
  if(cache.items && cache.items.length > 0) {
    var container = document.getElementById('inventoryItemsContainer'); if(container) container.innerHTML = "";
    cache.items.forEach(r => addInventoryItemRow(r.item, r.barcode, r.sku, r.batch, r.qty, r.box, r.status));
  }
}

function saveRtoToCache() {
  var awbInputs = document.querySelectorAll('.b2c-awb-input'); var awbArray = []; awbInputs.forEach(i => awbArray.push(i.value));
  localStorage.setItem('draft_cache_rto', JSON.stringify({ b2bDate: document.getElementById('rtoB2bDate')?.value, b2bInv: document.getElementById('rtoB2bInvoice')?.value, b2bLr: document.getElementById('rtoB2bLrNo')?.value, b2bTrans: document.getElementById('rtoB2bTransporterSelect')?.value, b2bBox: document.getElementById('rtoB2bBoxQty')?.value, b2bVeh: document.getElementById('rtoB2bVehicle')?.value, b2bDriver: document.getElementById('rtoB2bDriver')?.value, b2bMob: document.getElementById('rtoB2bMobile')?.value, b2bRemark: document.getElementById('rtoB2bRemark')?.value, b2bInch: document.getElementById('rtoB2bInchargeSelect')?.value, b2cDate: document.getElementById('rtoB2cDate')?.value, b2cVeh: document.getElementById('rtoB2cVehicle')?.value, b2cCourier: document.getElementById('rtoB2cCourierSelect')?.value, b2cInch: document.getElementById('rtoB2cInchargeSelect')?.value, b2cDriver: document.getElementById('rtoB2cDriver')?.value, b2cMob: document.getElementById('rtoB2cMobile')?.value, b2cRemark: document.getElementById('rtoB2cCommonRemark')?.value, b2cAwb: awbArray }));
}

function loadRtoCacheData() {
  var raw = localStorage.getItem('draft_cache_rto'); if(!raw) return; var cache = JSON.parse(raw);
  if(document.getElementById('rtoB2bDate')) document.getElementById('rtoB2bDate').value = cache.b2bDate || "";
  if(document.getElementById('rtoB2bInvoice')) document.getElementById('rtoB2bInvoice').value = cache.b2bInv || "";
  if(document.getElementById('rtoB2bLrNo')) document.getElementById('rtoB2bLrNo').value = cache.b2bLr || "";
  if(document.getElementById('rtoB2bTransporterSelect')) document.getElementById('rtoB2bTransporterSelect').value = cache.b2bTrans || "";
  if(document.getElementById('rtoB2bBoxQty')) document.getElementById('rtoB2bBoxQty').value = cache.b2bBox || "";
  if(document.getElementById('rtoB2bVehicle')) document.getElementById('rtoB2bVehicle').value = cache.b2bVeh || "";
  if(document.getElementById('rtoB2bDriver')) document.getElementById('rtoB2bDriver').value = cache.b2bDriver || "";
  if(document.getElementById('rtoB2bMobile')) document.getElementById('rtoB2bMobile').value = cache.b2bMob || "";
  if(document.getElementById('rtoB2bRemark')) document.getElementById('rtoB2bRemark').value = cache.b2bRemark || "";
  if(document.getElementById('rtoB2bInchargeSelect')) document.getElementById('rtoB2bInchargeSelect').value = cache.b2bInch || "";
  if(document.getElementById('rtoB2cDate')) document.getElementById('rtoB2cDate').value = cache.b2cDate || "";
  if(document.getElementById('rtoB2cVehicle')) document.getElementById('rtoB2cVehicle').value = cache.b2cVeh || "";
  if(document.getElementById('rtoB2cCourierSelect')) document.getElementById('rtoB2cCourierSelect').value = cache.b2cCourier || "";
  if(document.getElementById('rtoB2cInchargeSelect')) document.getElementById('rtoB2cInchargeSelect').value = cache.b2cInch || "";
  if(document.getElementById('rtoB2cDriver')) document.getElementById('rtoB2cDriver').value = cache.b2cDriver || "";
  if(document.getElementById('rtoB2cMobile')) document.getElementById('rtoB2cMobile').value = cache.b2cMob || "";
  if(document.getElementById('rtoB2cCommonRemark')) document.getElementById('rtoB2cCommonRemark').value = cache.b2cRemark || "";
  if(cache.b2cAwb && cache.b2cAwb.length > 0) { var c = document.getElementById('rtoB2cAwbContainer'); if(c) c.innerHTML = ""; cache.b2cAwb.forEach(code => addRtoB2cAwbRow(code)); }
}

// Slips Template Rendering Layout Engine Router
function renderPrintLayout(d, id) {
  document.getElementById('pdfSeries').innerText = id; document.getElementById('pdfDate').innerText = d.date || new Date().toISOString().split('T')[0]; document.getElementById('pdfTime').innerText = d.time || "--:--"; document.getElementById('pdfDept').innerText = d.department; document.getElementById('pdfTransporter').innerText = d.transporter || "N/A"; document.getElementById('pdfVehicle').innerText = d.vehicleNo || "N/A"; document.getElementById('pdfDriver').innerText = d.driverName ? d.driverName + " (" + (d.driverMobile || d.driverNumber || "") + ")" : "N/A"; document.getElementById('pdfIncharge').innerText = d.incharge || "Warehouse Team";
  var pdfTitle = document.getElementById('pdfTitle'); var pdfSeriesLabel = document.getElementById('pdfSeriesLabel'); var thEl = document.getElementById('pdfTableHeader'); var bEl = document.getElementById('pdfTableBody'); bEl.innerHTML = "";
  var palletCont = document.getElementById('pdfPalletContainer'); var invMetaCont = document.getElementById('pdfInvMetaContainer');

  if (d.department === "Inventory Inward" || d.department === "Inventory Logging") {
    pdfTitle.innerText = "QUICKSHIFT - INVENTORY INWARD GATE ENTRY"; pdfSeriesLabel.innerText = "Gate Entry No:"; if(palletCont) palletCont.classList.add('hidden');
    if(invMetaCont) { invMetaCont.classList.remove('hidden'); document.getElementById('pdfInvPo').innerText = d.poInvoiceNo || "N/A"; document.getElementById('pdfInvLr').innerText = d.lrNo || "N/A"; }
    thEl.innerHTML = `<tr class="bg-gray-100 border-b border-black font-bold"><th class="border border-black p-2 text-center">Sr No.</th><th class="border border-black p-2">Material Item Name Description</th><th class="border border-black p-2 font-mono">Barcode ID</th><th class="border border-black p-2 font-mono">SKU Code</th><th class="border border-black p-2 text-center">Qty Units</th><th class="border border-black p-2 text-center">Box Count</th></tr>`;
    var tQty = 0, tBox = 0;
    if (d.invoices) { d.invoices.forEach((inv, i) => { var q = parseInt(inv.physicalQuantity || inv.qty || 0, 10); var bx = parseInt(inv.boxCount || inv.box || 0, 10); tQty += q; tBox += bx; bEl.insertAdjacentHTML('beforeend', `<tr><td class="border border-black p-2 text-center">${i+1}</td><td class="border border-black p-2 font-medium">${inv.itemName || 'N/A'}</td><td class="border border-black p-2 font-mono">${inv.barcode || '—'}</td><td class="border border-black p-2 font-mono font-bold">${inv.skuCode || '—'}</td><td class="border border-black p-2 text-center font-bold">${q}</td><td class="border border-black p-2 text-center font-bold">${bx}</td></tr>`); }); }
    bEl.insertAdjacentHTML('beforeend', `<tr class="bg-gray-50 font-black"><td colspan="4" class="border border-black p-2 text-right uppercase">AGGREGATE TOTALS:</td><td class="border border-black p-2 text-center underline text-sm">${tQty}</td><td class="border border-black p-2 text-center underline text-sm">${tBox}</td></tr>`);
  } else if (d.department === "B2C Return") {
    pdfTitle.innerText = "QUICKSHIFT - B2C RETURN GATE ENTRY"; pdfSeriesLabel.innerText = "Gate Entry No:"; if(palletCont) { palletCont.classList.remove('hidden'); document.getElementById('pdfPallets').innerText = "0"; } if(invMetaCont) invMetaCont.classList.add('hidden');
    thEl.innerHTML = `<tr class="bg-gray-100 border-b border-black font-bold"><th class="border border-black p-2 w-12 text-center">Sr No.</th><th class="border border-black p-2">Invoice</th><th class="border border-black p-2 font-mono">AWB No.</th><th class="border border-black p-2">Remark</th></tr>`;
    if (d.invoices) { d.invoices.forEach((inv, i) => { bEl.insertAdjacentHTML('beforeend', `<tr><td class="border border-black p-2 text-center">${i+1}</td><td class="border border-black p-2 font-mono">${inv.invoiceNum}</td><td class="border border-black p-2 font-mono font-bold">${inv.invoiceNum}</td><td class="border border-black p-2 text-xs">${d.globalRemark || d.remark || "No Damage"}</td></tr>`); }); }
    bEl.insertAdjacentHTML('beforeend', `<tr class="bg-gray-50 font-black"><td colspan="2" class="border border-black p-2 text-right uppercase">TOTAL PACK COUNT:</td><td class="border border-black p-2 text-center underline text-sm">${d.invoices ? d.invoices.length : 0}</td><td class="border border-black p-2"></td></tr>`);
  } else if (d.department === "B2B Return") {
    pdfTitle.innerText = "QUICKSHIFT - B2B RETURN GATE ENTRY"; pdfSeriesLabel.innerText = "Gate Entry No:"; if(palletCont) { palletCont.classList.remove('hidden'); document.getElementById('pdfPallets').innerText = "0"; } if(invMetaCont) invMetaCont.classList.add('hidden');
    thEl.innerHTML = `<tr class="bg-gray-100 border-b border-black font-bold"><th class="border border-black p-2 w-12 text-center">Sr No.</th><th class="border border-black p-2">Invoice</th><th class="border border-black p-2 text-center">Box Count</th><th class="border border-black p-2 font-mono">LR / AWB</th><th class="border border-black p-2">Remark</th></tr>`;
    var totalBoxes = 0;
    if (d.invoices) { d.invoices.forEach((inv, i) => { var bx = parseInt(inv.boxCount || 0, 10); totalBoxes += bx; bEl.insertAdjacentHTML('beforeend', `<tr><td class="border border-black p-2 text-center">${i+1}</td><td class="border border-black p-2 font-mono">${inv.invoiceNum}</td><td class="border border-black p-2 text-center font-bold">${bx}</td><td class="border border-black p-2 font-mono">${inv.lrNo || 'N/A'}</td><td class="border border-black p-2 text-xs">${d.globalRemark || d.remark || "No Remark"}</td></tr>`); }); }
    bEl.insertAdjacentHTML('beforeend', `<tr class="bg-gray-50 font-black"><td colspan="2" class="border border-black p-2 text-right uppercase">TOTAL PACK COUNT:</td><td class="border border-black p-2 text-center underline text-sm">${totalBoxes}</td><td colspan="2" class="border border-black p-2"></td></tr>`);
  } else {
    pdfTitle.innerText = "QUICKSHIFT - B2B DISPATCH GATEPASS"; pdfSeriesLabel.innerText = "Series Token ID:"; if(palletCont) { palletCont.classList.remove('hidden'); document.getElementById('pdfPallets').innerText = d.palletCount || "0"; } if(invMetaCont) invMetaCont.classList.add('hidden');
    thEl.innerHTML = `<tr class="bg-gray-100 border-b border-black font-bold"><th class="border border-black p-2 w-12 text-center">Sr No.</th><th class="border border-black p-2">Invoice</th><th class="border border-black p-2 text-center">Box Count</th><th class="border border-black p-2 font-mono">LR / AWB</th><th class="border border-black p-2">Remark</th></tr>`;
    var totalBoxes = 0;
    if (d.invoices) { d.invoices.forEach((inv, i) => { var bx = parseInt(inv.boxCount || inv.box || 0, 10); totalBoxes += bx; bEl.insertAdjacentHTML('beforeend', `<tr><td class="border border-black p-2 text-center">${i+1}</td><td class="border border-black p-2 font-mono">${inv.invoiceNum}</td><td class="border border-black p-2 text-center font-bold">${bx}</td><td class="border border-black p-2 font-mono">${inv.lrNo || 'N/A'}</td><td class="border border-black p-2 text-xs">${inv.remark || ''}</td></tr>`); }); }
    bEl.insertAdjacentHTML('beforeend', `<tr class="bg-gray-50 font-black"><td colspan="2" class="border border-black p-2 text-right uppercase">TOTAL PACK COUNT:</td><td class="border border-black p-2 text-center underline text-sm">${totalBoxes}</td><td colspan="2" class="border border-black p-2"></td></tr>`);
  }
}

async function runDatabaseCorrectionRoutine() {
  var p = { type: document.getElementById('corrType').value, searchKey: document.getElementById('corrSearchKey').value.trim(), replacementValue: document.getElementById('corrNewValue').value.trim() };
  const res = await apiFetch("executeOperationalCorrection", p); if(res) alert(res.message); window.location.reload();
}

function adjustReprintLabelsText() {
  var source = document.getElementById('reprintSourceDept').value;
  var title = document.getElementById('reprintHeaderTitle'); var label = document.getElementById('reprintSeriesInputLabel');
  if (source === "B2B Dispatch") { title.innerText = "Reprint Historical Gatepass Slip"; label.innerText = "Enter Unique Gatepass ID *"; } 
  else { title.innerText = "Reprint Historical Gate Entry Slip"; label.innerText = "Enter Unique Gate Entry No *"; }
}

function updateCorrectionLabels() {
  var type = document.getElementById('corrType').value;
  var keyLbl = document.getElementById('searchKeyLabel'); var valLbl = document.getElementById('newValueLabel');
  if (type === "inv_against_lr") { keyLbl.innerText = "Enter Known LR Number *"; valLbl.innerText = "Enter New Corrected Invoice Number *"; } 
  else { keyLbl.innerText = "Enter Known Invoice Number *"; valLbl.innerText = "Enter New Corrected LR Number *"; }
}

window.addEventListener('pagehide', () => { saveToLocalStorage(); saveInventoryToCache(); saveRtoToCache(); });
