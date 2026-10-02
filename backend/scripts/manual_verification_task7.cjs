const http = require("http");

const BASE_URL = "http://localhost:3000";

function parseCookies(response) {
  const setCookie = response.headers["set-cookie"] || [];
  const cookies = {};
  setCookie.forEach((str) => {
    const parts = str.split(";")[0].split("=");
    const name = parts[0].trim();
    const val = parts.slice(1).join("=").trim();
    cookies[name] = val;
  });
  return cookies;
}

function cookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function request(method, path, body = null, cookies = {}, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      ...customHeaders,
    };

    if (Object.keys(cookies).length > 0) {
      headers["Cookie"] = cookieHeader(cookies);
    }

    let payload = null;
    if (body) {
      payload = typeof body === "string" ? body : JSON.stringify(body);
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          const responseCookies = parseCookies(res);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            cookies: responseCookies,
            data: json,
            rawText: data,
          });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTask7ManualVerification() {
  console.log("=== STARTING TASK 7 MANUAL VERIFICATION ===");
  const results = {};

  // 1. ADMIN LOGIN & EXPORTS
  console.log("\n--- 1. ADMIN LOGIN & EXPORT VERIFICATION ---");
  const adminLogin = await request("POST", "/api/v1/auth/login", {
    username: "admin",
    password: "Demo@1234",
  });
  if (adminLogin.status !== 200) throw new Error("Admin login failed");
  const adminCookies = { ...adminLogin.cookies };
  console.log("✓ Admin logged in successfully. Role:", adminLogin.data.data?.role);

  // A. Financial Report Export (Admin only)
  const finExport = await request("GET", "/api/v1/reports/export/financial", null, adminCookies);
  console.log("✓ Financial Report Export Status:", finExport.status);
  console.log("  Content-Type:", finExport.headers["content-type"]);
  console.log("  Content-Disposition:", finExport.headers["content-disposition"]);
  const finValid = finExport.status === 200 && finExport.rawText.startsWith("\uFEFF") && finExport.rawText.includes("FINANCIAL OVERVIEW");
  console.log("  CSV content validated:", finValid);
  results.adminFinancialExport = finValid;

  // B. Patients Export
  const patExport = await request("GET", "/api/v1/reports/export/patients?status=Active", null, adminCookies);
  console.log("✓ Patients Report Export Status:", patExport.status);
  const patValid = patExport.status === 200 && patExport.rawText.startsWith("\uFEFF") && patExport.rawText.includes("Patient Code,Full Name");
  console.log("  CSV content validated:", patValid);
  results.adminPatientsExport = patValid;

  // C. Appointments Export
  const apptExport = await request("GET", "/api/v1/reports/export/appointments", null, adminCookies);
  console.log("✓ Appointments Report Export Status:", apptExport.status);
  const apptValid = apptExport.status === 200 && apptExport.rawText.startsWith("\uFEFF") && apptExport.rawText.includes("Appointment Code,Patient Name");
  console.log("  CSV content validated:", apptValid);
  results.adminAppointmentsExport = apptValid;

  // D. Admissions Export
  const admExport = await request("GET", "/api/v1/reports/export/admissions", null, adminCookies);
  console.log("✓ Admissions Report Export Status:", admExport.status);
  const admValid = admExport.status === 200 && admExport.rawText.startsWith("\uFEFF") && admExport.rawText.includes("Admission Code,Patient Name");
  console.log("  CSV content validated:", admValid);
  results.adminAdmissionsExport = admValid;

  // E. Pharmacy Inventory Export
  const pharmExport = await request("GET", "/api/v1/pharmacy/export", null, adminCookies);
  console.log("✓ Pharmacy Inventory Export Status:", pharmExport.status);
  const pharmValid = pharmExport.status === 200 && pharmExport.rawText.startsWith("\uFEFF") && pharmExport.rawText.includes("Medicine Code,Brand Name");
  console.log("  CSV content validated:", pharmValid);
  results.adminPharmacyExport = pharmValid;

  // F. Laboratory Orders Export
  const labExport = await request("GET", "/api/v1/lab/export", null, adminCookies);
  console.log("✓ Laboratory Orders Export Status:", labExport.status);
  const labValid = labExport.status === 200 && labExport.rawText.startsWith("\uFEFF") && labExport.rawText.includes("Lab Order #,Patient Name");
  console.log("  CSV content validated:", labValid);
  results.adminLaboratoryExport = labValid;

  // G. Billing Invoices Export
  const billExport = await request("GET", "/api/v1/billing/export", null, adminCookies);
  console.log("✓ Billing Invoices Export Status:", billExport.status);
  const billValid = billExport.status === 200 && billExport.rawText.startsWith("\uFEFF") && billExport.rawText.includes("Invoice Number,Patient Name");
  console.log("  CSV content validated:", billValid);
  results.adminBillingExport = billValid;

  // 2. DOCTOR RBAC & PERMITTED EXPORTS
  console.log("\n--- 2. DOCTOR RBAC & CLINICAL EXPORT VERIFICATION ---");
  const docLogin = await request("POST", "/api/v1/auth/login", {
    username: "dr.sarah",
    password: "Demo@1234",
  });
  if (docLogin.status !== 200) throw new Error("Doctor login failed");
  const docCookies = { ...docLogin.cookies };

  // Doctor attempt financial export -> MUST BE 403 FORBIDDEN
  const docFinExport = await request("GET", "/api/v1/reports/export/financial", null, docCookies);
  console.log("✓ Doctor GET /api/v1/reports/export/financial Status:", docFinExport.status, "(Expected: 403 Forbidden)");
  results.doctorFinancialBlocked = docFinExport.status === 403;

  // Doctor attempt permitted patient/clinical exports -> 200 OK
  const docPatExport = await request("GET", "/api/v1/reports/export/patients", null, docCookies);
  console.log("✓ Doctor GET /api/v1/reports/export/patients Status:", docPatExport.status, "(Expected: 200 OK)");

  const docLabExport = await request("GET", "/api/v1/lab/export", null, docCookies);
  console.log("✓ Doctor GET /api/v1/lab/export Status:", docLabExport.status, "(Expected: 200 OK)");
  results.doctorClinicalAllowed = docPatExport.status === 200 && docLabExport.status === 200;

  // 3. RECEPTIONIST RBAC & OPERATIONAL EXPORTS
  console.log("\n--- 3. RECEPTIONIST RBAC & BILLING EXPORT VERIFICATION ---");
  const recepLogin = await request("POST", "/api/v1/auth/login", {
    username: "receptionist",
    password: "Demo@1234",
  });
  if (recepLogin.status !== 200) throw new Error("Receptionist login failed");
  const recepCookies = { ...recepLogin.cookies };

  // Receptionist attempt billing export -> 200 OK
  const recepBillExport = await request("GET", "/api/v1/billing/export", null, recepCookies);
  console.log("✓ Receptionist GET /api/v1/billing/export Status:", recepBillExport.status, "(Expected: 200 OK)");
  results.receptionistBillingAllowed = recepBillExport.status === 200;

  // Receptionist attempt executive financial report -> MUST BE 403 FORBIDDEN
  const recepFinExport = await request("GET", "/api/v1/reports/export/financial", null, recepCookies);
  console.log("✓ Receptionist GET /api/v1/reports/export/financial Status:", recepFinExport.status, "(Expected: 403 Forbidden)");
  results.receptionistFinancialBlocked = recepFinExport.status === 403;

  // 4. UNAUTHENTICATED ACCESS
  console.log("\n--- 4. UNAUTHENTICATED EXPORT ATTEMPTS ---");
  const unauthExport = await request("GET", "/api/v1/reports/export/patients");
  console.log("✓ Unauthenticated GET /api/v1/reports/export/patients Status:", unauthExport.status, "(Expected: 401 Unauthorized)");
  results.unauthenticatedBlocked = unauthExport.status === 401;

  // 5. PRINT / PDF INTEGRATION CHECK
  console.log("\n--- 5. PRINTABLE INVOICE / RX / LAB REPORT CHECK ---");
  const invRes = await request("GET", "/api/v1/billing/invoices/1", null, adminCookies);
  const rxRes = await request("GET", "/api/v1/prescriptions/1", null, adminCookies);
  const labRes = await request("GET", "/api/v1/lab/orders/1", null, adminCookies);
  results.printableDocumentsIntact = invRes.status === 200 && rxRes.status === 200 && labRes.status === 200;
  console.log("✓ Existing printable invoices, prescriptions, and lab reports accessible:", results.printableDocumentsIntact);

  console.log("\n=== TASK 7 MANUAL VERIFICATION SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));

  const allPassed = Object.values(results).every(Boolean);
  console.log("\nOVERALL TASK 7 STATUS:", allPassed ? "ALL PASS" : "SOME FAILED");
}

runTask7ManualVerification().catch((err) => {
  console.error("Task 7 verification failed with error:", err);
  process.exit(1);
});
