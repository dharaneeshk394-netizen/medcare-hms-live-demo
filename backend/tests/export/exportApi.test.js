const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const express = require("express");

const { generateCsv, escapeCsvValue } = require("../../src/utils/csvHelper");
const reportRoutes = require("../../src/routes/reportRoutes");
const billingRoutes = require("../../src/routes/billingRoutes");
const patientRoutes = require("../../src/routes/patientRoutes");
const appointmentRoutes = require("../../src/routes/appointmentRoutes");
const pharmacyRoutes = require("../../src/routes/pharmacyRoutes");
const labRoutes = require("../../src/routes/labRoutes");

function createTestApp(user = null) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    if (user) {
      req.user = { ...user };
      req.session = { user: { ...user } };
    }
    next();
  });

  app.use("/api/v1/reports", reportRoutes);
  app.use("/api/v1/billing", billingRoutes);
  app.use("/api/v1/patients", patientRoutes);
  app.use("/api/v1/appointments", appointmentRoutes);
  app.use("/api/v1/pharmacy", pharmacyRoutes);
  app.use("/api/v1/lab", labRoutes);

  app.use((err, req, res, _next) => {
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  return app;
}

describe("Professional Export & Download System Suite", () => {
  const unauthApp = createTestApp(null);
  const adminApp = createTestApp({ id: 1, role: "admin", username: "admin_user" });
  const doctorApp = createTestApp({ id: 2, role: "doctor", username: "doc_user" });
  const receptionistApp = createTestApp({ id: 3, role: "receptionist", username: "recep_user" });

  describe("1. CSV Helper & Security Encoding Unit Tests", () => {
    test("generates valid CSV with UTF-8 BOM prefix", () => {
      const columns = [
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
      ];
      const rows = [{ code: "PAT-001", name: "John Doe" }];
      const csv = generateCsv(columns, rows);

      assert.ok(csv.startsWith("\uFEFF"), "CSV must begin with UTF-8 BOM for Excel compatibility");
      assert.ok(csv.includes("Code,Name"));
      assert.ok(csv.includes("PAT-001,John Doe"));
    });

    test("escapes values with commas, double quotes, and newlines safely (RFC 4180)", () => {
      const columns = [
        { key: "item", label: "Item" },
        { key: "desc", label: "Description" },
      ];
      const rows = [
        { item: 'Syringe 5ml "Sterile"', desc: "Plastic, disposable\nSingle use only" },
      ];
      const csv = generateCsv(columns, rows);

      assert.ok(csv.includes('"Syringe 5ml ""Sterile"""'), "Double quotes must be escaped by doubling");
      assert.ok(csv.includes('"Plastic, disposable\nSingle use only"'), "Commas and newlines must be enclosed in quotes");
    });

    test("mitigates CSV Formula Injection (DDE) vulnerabilities", () => {
      assert.strictEqual(escapeCsvValue("=SUM(A1:A10)"), `"'=SUM(A1:A10)"`);
      assert.strictEqual(escapeCsvValue("+cmd|' /C calc'!A0"), `"'+cmd|' /C calc'!A0"`);
      assert.strictEqual(escapeCsvValue("-2+3*4"), `"'-2+3*4"`);
      assert.strictEqual(escapeCsvValue("@calc"), `"'@calc"`);
    });

    test("handles null and undefined values cleanly without crashing", () => {
      const columns = [
        { key: "id", label: "ID" },
        { key: "note", label: "Note" },
      ];
      const rows = [{ id: 1, note: null }, { id: 2, note: undefined }];
      const csv = generateCsv(columns, rows);

      assert.ok(csv.includes("1,"));
      assert.ok(csv.includes("2,"));
    });
  });

  describe("2. Authentication & RBAC Enforcement on Export APIs", () => {
    test("unauthenticated requests to all export endpoints return 401 Unauthorized", async () => {
      const endpoints = [
        "/api/v1/reports/export/financial",
        "/api/v1/reports/export/patients",
        "/api/v1/reports/export/appointments",
        "/api/v1/reports/export/admissions",
        "/api/v1/reports/export/pharmacy",
        "/api/v1/reports/export/laboratory",
        "/api/v1/billing/export",
        "/api/v1/patients/export",
        "/api/v1/appointments/export",
        "/api/v1/pharmacy/export",
        "/api/v1/lab/export",
      ];

      for (const endpoint of endpoints) {
        const res = await request(unauthApp).get(endpoint);
        assert.strictEqual(res.status, 401, `Expected 401 for unauthenticated ${endpoint}`);
      }
    });

    test("Admin can access and download all export reports (200 OK with CSV headers)", async () => {
      const res = await request(adminApp).get("/api/v1/reports/export/financial");
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers["content-type"].includes("text/csv"));
      assert.ok(res.headers["content-disposition"].includes("attachment; filename="));
      assert.ok(res.text.startsWith("\uFEFF"));
    });

    test("Doctor cannot access financial report export (403 Forbidden)", async () => {
      const res = await request(doctorApp).get("/api/v1/reports/export/financial");
      assert.strictEqual(res.status, 403, "Doctor must not have access to financial summary export");
    });

    test("Doctor can access permitted clinical and diagnostic exports (200 OK)", async () => {
      const clinicalEndpoints = [
        "/api/v1/reports/export/patients",
        "/api/v1/reports/export/appointments",
        "/api/v1/reports/export/laboratory",
        "/api/v1/reports/export/pharmacy",
        "/api/v1/patients/export",
        "/api/v1/appointments/export",
        "/api/v1/lab/export",
        "/api/v1/pharmacy/export",
      ];

      for (const ep of clinicalEndpoints) {
        const res = await request(doctorApp).get(ep);
        assert.strictEqual(res.status, 200, `Doctor should have access to ${ep}`);
        assert.ok(res.headers["content-type"].includes("text/csv"));
      }
    });

    test("Receptionist can access billing invoices and appointments exports (200 OK)", async () => {
      const billingRes = await request(receptionistApp).get("/api/v1/billing/export");
      assert.strictEqual(billingRes.status, 200);
      assert.ok(billingRes.headers["content-type"].includes("text/csv"));

      const apptRes = await request(receptionistApp).get("/api/v1/appointments/export");
      assert.strictEqual(apptRes.status, 200);
    });

    test("Receptionist cannot access executive financial analytics export (403 Forbidden)", async () => {
      const res = await request(receptionistApp).get("/api/v1/reports/export/financial");
      assert.strictEqual(res.status, 403);
    });
  });

  describe("3. Filter Query Parameters & Security", () => {
    test("Patient export respects search and status filters", async () => {
      const res = await request(adminApp).get("/api/v1/patients/export?status=Active&search=John");
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers["content-disposition"].includes("medcare-patients-"));
    });

    test("Billing export respects status and date range query parameters", async () => {
      const res = await request(adminApp).get("/api/v1/billing/export?status=PAID&startDate=2026-01-01&endDate=2026-12-31");
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers["content-disposition"].includes("medcare-invoices-"));
    });

    test("Laboratory export respects priority and status query filters", async () => {
      const res = await request(adminApp).get("/api/v1/lab/export?priority=Urgent&status=COMPLETED");
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers["content-disposition"].includes("medcare-laboratory-orders-"));
    });

    test("Pharmacy export respects category and search filters", async () => {
      const res = await request(adminApp).get("/api/v1/pharmacy/export?category=Antibiotics&search=Amox");
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers["content-disposition"].includes("medcare-pharmacy-inventory-"));
    });
  });
});
