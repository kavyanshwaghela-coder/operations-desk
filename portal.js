// Global Configuration
var currentUserEmail = "System Admin";
var masterData = [];
var currentlyFilteredData = [];
var workflowDept = localStorage.getItem('active_workflow_dept') || "B2B Dispatch";
var globalProductMasterList = [];
var html5QrScanner = null;
const APPS_SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbx9Ba3D5qrJFuwTkTGNLPSkfabeQedX0YQ9O8JoPmUfLear9OkzEjN_Pxz1cVlqjtHDWg/exec";

// --- 1. Global Navigation & Binding fix (Preserved) ---
window.toggleSidebar = function() {
  document.getElementById('sidebarMenu').classList.toggle('-translate-x-full');
  document.getElementById('menuBackdrop').classList.toggle('hidden');
};

window.toggleSubMenu = function(menuId, open = false) {
  var m = document.getElementById(menuId);
  if (!m) return;
  m.style.maxHeight = (m.style.maxHeight && m.style.maxHeight !== "0px" && !open) ? "0px" : "250px";
  m.style.opacity = (m.style.maxHeight === "0px") ? "0" : "1";
};

window.activateModuleWorkflow = function(deptName, viewTarget) {
  workflowDept = deptName;
  localStorage.setItem('active_workflow_dept', deptName);
  document.getElementById('moduleTitle').innerText = deptName + " Workspace";
  
  // Clear filters when switching workspace to prevent contamination
  document.getElementById('filterFromDate').value = "";
  document.getElementById('filterToDate').value = "";
  
  toggleSidebar();
  evaluateActiveWorkflowViewState();
  switchView(viewTarget);
  fetchLiveDashboardDataRecords();
};

// --- 2. Data & Fetch Logic (Preserved) ---
async function apiFetch(action, payload = {}) {
  try {
    const response = await fetch(APPS_SCRIPT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: action, payload: payload, userEmail: localStorage.getItem('logged_session_email') || "Admin" })
    });
    return await response.json();
  } catch (error) { return null; }
}

// --- 3. Dashboard, Filters, Export (Fixed & Preserved) ---
async function fetchLiveDashboardDataRecords() {
  var body = document.getElementById('dataTableBody');
  if(!body) return;
  body.innerHTML = `<tr><td colspan="11" class="text-center p-4">Syncing...</td></tr>`;
  
  const data = await apiFetch("getDashboardDataByWorkspace", workflowDept);
  if(data && Array.isArray(data)) {
    masterData = data;
    applyFilters();
  } else {
    body.innerHTML = `<tr><td colspan="11" class="text-center p-4">No records.</td></tr>`;
  }
}

function applyFilters() {
  var from = document.getElementById('filterFromDate')?.value || "";
  var to = document.getElementById('filterToDate')?.value || "";
  var s = document.getElementById('searchSeries')?.value.toLowerCase().trim() || "";
  var i = document.getElementById('searchInvoice')?.value.toLowerCase().trim() || "";
  
  currentlyFilteredData = masterData.filter(r => 
    (!from || r.date >= from) && (!to || r.date <= to) &&
    (!s || r.seriesNo.toString().toLowerCase().includes(s)) &&
    (!i || r.invoice.toString().toLowerCase().includes(i))
  );
  renderTable(currentlyFilteredData);
}

function renderTable(data) {
  var b = document.getElementById('dataTableBody'); if(!b) return; b.innerHTML = "";
  document.getElementById('rowCountLabel').innerText = data.length;
  data.forEach(r => {
    b.insertAdjacentHTML('beforeend', `<tr><td class="px-3 py-2 font-bold">${r.seriesNo}</td><td>${r.date}</td><td>${r.dept}</td><td>${r.transporter}</td><td>${r.vehicleNo}</td><td>${r.driverName}</td><td>${r.invoice}</td><td>${r.boxes}</td><td>${r.lr || r.remark}</td><td>${r.pallets || r.status}</td><td>${r.incharge}</td></tr>`);
  });
}

function exportFilteredDataToExcel() {
  if(!currentlyFilteredData.length) return alert("No data to export");
  let csv = "Series ID,Date,Dept,Transporter,Vehicle,Driver,Invoice,Boxes,Remark,Pallets,Incharge\n";
  currentlyFilteredData.forEach(r => csv += `"${r.seriesNo}","${r.date}","${r.dept}","${r.transporter}","${r.vehicleNo}","${r.driverName}","${r.invoice}","${r.boxes}","${r.remark}","${r.pallets}","${r.incharge}"\n`);
  let link = document.createElement("a"); link.href = "data:text/csv;charset=utf-8," + encodeURI(csv); link.download = "export.csv"; link.click();
}

// --- 4. Initialization (Preserved & Fixed) ---
function loadWorkflowHtmlFiles() {
  // ... (Your existing HTML Injection Logic remains here) ...
  // Ensure initFormInterceptorsAndDropdowns is called last
  initFormInterceptorsAndDropdowns();
}

window.addEventListener('DOMContentLoaded', () => {
  if(localStorage.getItem('logged_session_email')) {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-portal').classList.remove('hidden');
    loadWorkflowHtmlFiles();
  }
});
