const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const express = require("express");

const settingsRoutes = require("../../src/routes/settingsRoutes");
const settingsService = require("../../src/services/settingsService");

function createTestApp(user = null) {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.use((req, res, next) => {
    if (user) {
      req.user = { ...user };
    }
    next();
  });

  app.use("/api/v1/settings", settingsRoutes);

  app.use((err, req, res, _next) => {
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  return app;
}

describe("System Settings API: Route & RBAC Suite", () => {
  const unauthApp = createTestApp(null);
  const adminApp = createTestApp({ id: 1, role: "admin", username: "admin_user" });
  const doctorApp = createTestApp({ id: 2, role: "doctor", username: "doc_user" });
  const receptionistApp = createTestApp({ id: 3, role: "receptionist", username: "recep_user" });

  let mockSettingsData = {
    id: 1,
    hospitalName: "MedCare Hospital",
    hospitalLogo: null,
    addressLine1: "100 Medical Center Parkway",
    addressLine2: "Suite 400",
    city: "Metropolis",
    state: "NY",
    postalCode: "10001",
    country: "United States",
    phone: "+1 (555) 019-2834",
    email: "info@medcare-hospital.org",
    website: "https://medcare-hospital.org",
    currencyCode: "USD",
    currencySymbol: "$",
    taxEnabled: true,
    taxName: "Tax",
    taxRate: 5.0,
    invoiceFooter: "Thank you for choosing MedCare Hospital.",
    prescriptionHeader: "Outpatient & Clinical Care Department",
    reportHeader: "Diagnostic Laboratory Department",
  };

  beforeEach(() => {
    mockSettingsData = {
      id: 1,
      hospitalName: "MedCare Hospital",
      hospitalLogo: null,
      addressLine1: "100 Medical Center Parkway",
      addressLine2: "Suite 400",
      city: "Metropolis",
      state: "NY",
      postalCode: "10001",
      country: "United States",
      phone: "+1 (555) 019-2834",
      email: "info@medcare-hospital.org",
      website: "https://medcare-hospital.org",
      currencyCode: "USD",
      currencySymbol: "$",
      taxEnabled: true,
      taxName: "Tax",
      taxRate: 5.0,
      invoiceFooter: "Thank you for choosing MedCare Hospital.",
      prescriptionHeader: "Outpatient & Clinical Care Department",
      reportHeader: "Diagnostic Laboratory Department",
    };

    settingsService.getSettings = async () => ({ ...mockSettingsData });
    settingsService.updateSettings = async (data, userId) => {
      mockSettingsData = { ...mockSettingsData, ...data, updatedBy: userId };
      return { ...mockSettingsData };
    };
  });

  describe("1. GET /api/v1/settings (View Hospital Profile)", () => {
    test("unauthenticated access returns 401 Unauthorized", async () => {
      const res = await request(unauthApp).get("/api/v1/settings");
      assert.strictEqual(res.status, 401);
    });

    test("Admin can view settings", async () => {
      const res = await request(adminApp).get("/api/v1/settings");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.hospitalName, "MedCare Hospital");
    });

    test("Doctor can view settings", async () => {
      const res = await request(doctorApp).get("/api/v1/settings");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.hospitalName, "MedCare Hospital");
    });

    test("Receptionist can view settings", async () => {
      const res = await request(receptionistApp).get("/api/v1/settings");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.hospitalName, "MedCare Hospital");
    });
  });

  describe("2. PUT /api/v1/settings (Update Hospital Profile & RBAC)", () => {
    const validPayload = {
      hospitalName: "City General Hospital",
      hospitalLogo: "https://example.com/logo.png",
      addressLine1: "500 Healthcare Blvd",
      addressLine2: "Suite 100",
      city: "New York",
      state: "NY",
      postalCode: "10002",
      country: "USA",
      phone: "+1 (555) 999-8888",
      email: "contact@citygeneral.org",
      website: "https://citygeneral.org",
      currencyCode: "EUR",
      currencySymbol: "€",
      taxEnabled: true,
      taxName: "VAT",
      taxRate: 10.0,
      invoiceFooter: "Official Tax Invoice - City General",
      prescriptionHeader: "City General Clinical Outpatient",
      reportHeader: "City General Pathology Lab",
    };

    test("unauthenticated update returns 401 Unauthorized", async () => {
      const res = await request(unauthApp).put("/api/v1/settings").send(validPayload);
      assert.strictEqual(res.status, 401);
    });

    test("Doctor update returns 403 Forbidden", async () => {
      const res = await request(doctorApp).put("/api/v1/settings").send(validPayload);
      assert.strictEqual(res.status, 403);
    });

    test("Receptionist update returns 403 Forbidden", async () => {
      const res = await request(receptionistApp).put("/api/v1/settings").send(validPayload);
      assert.strictEqual(res.status, 403);
    });

    test("Admin can successfully update settings and persist changes", async () => {
      const res = await request(adminApp).put("/api/v1/settings").send(validPayload);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.hospitalName, "City General Hospital");
      assert.strictEqual(res.body.data.currencyCode, "EUR");
      assert.strictEqual(res.body.data.currencySymbol, "€");
      assert.strictEqual(res.body.data.taxRate, 10.0);

      // Verify persistence via GET
      const getRes = await request(adminApp).get("/api/v1/settings");
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.body.data.hospitalName, "City General Hospital");
      assert.strictEqual(getRes.body.data.currencySymbol, "€");
    });

    test("Reject missing or empty hospital name with 400 Bad Request", async () => {
      const invalidPayload = { ...validPayload, hospitalName: "   " };
      const res = await request(adminApp).put("/api/v1/settings").send(invalidPayload);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /Hospital name is required/i);
    });

    test("Reject invalid tax rate (>100 or <0) with 400 Bad Request", async () => {
      const invalidPayload = { ...validPayload, taxRate: 150 };
      const res = await request(adminApp).put("/api/v1/settings").send(invalidPayload);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /Tax rate must be/i);
    });

    test("Reject invalid contact email format with 400 Bad Request", async () => {
      const invalidPayload = { ...validPayload, email: "invalid-email-address" };
      const res = await request(adminApp).put("/api/v1/settings").send(invalidPayload);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /valid contact email/i);
    });

    test("Reject invalid website URL with 400 Bad Request", async () => {
      const invalidPayload = { ...validPayload, website: "not-a-valid-url" };
      const res = await request(adminApp).put("/api/v1/settings").send(invalidPayload);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /Website URL must start with http/i);
    });

    test("Reject invalid logo scheme (XSS vector javascript:) with 400 Bad Request", async () => {
      const invalidPayload = { ...validPayload, hospitalLogo: "javascript:alert(1)" };
      const res = await request(adminApp).put("/api/v1/settings").send(invalidPayload);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /valid HTTP\/HTTPS URL or a safe image data URI/i);
    });

    test("Reject oversized logo payload (>500KB) with 400 Bad Request", async () => {
      const hugeLogo = "data:image/png;base64," + "a".repeat(510000);
      const invalidPayload = { ...validPayload, hospitalLogo: hugeLogo };
      const res = await request(adminApp).put("/api/v1/settings").send(invalidPayload);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /Logo payload is too large/i);
    });
  });
});
