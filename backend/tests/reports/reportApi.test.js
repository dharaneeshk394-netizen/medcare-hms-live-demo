const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const express = require("express");

const reportRoutes = require("../../src/routes/reportRoutes");
const reportService = require("../../src/services/reportService");

function createTestApp(user = null) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    if (user) {
      req.user = { ...user };
    }
    next();
  });

  app.use("/api/v1/reports", reportRoutes);

  app.use((err, req, res, _next) => {
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  return app;
}

describe("Reports & Analytics API: Route & RBAC Suite", () => {
  const unauthApp = createTestApp(null);
  const adminApp = createTestApp({ id: 1, role: "admin", username: "admin_user" });
  const doctorApp = createTestApp({ id: 2, role: "doctor", username: "doc_user" });
  const receptionistApp = createTestApp({ id: 3, role: "receptionist", username: "recep_user" });

  const originalService = { ...reportService };

  beforeEach(() => {
    reportService.getSummary = async () => ({
      totalPatients: 10,
      totalDoctors: 2,
      totalAppointments: 5,
      totalInvoices: 3,
      totalRevenue: 500.0,
      totalLabOrders: 4,
      totalPrescriptions: 6,
      totalAdmissions: 1,
    });
    reportService.getFinancialReport = async () => ({
      totalInvoices: 3,
      totalBilled: 500.0,
      totalCollected: 400.0,
      totalOutstanding: 100.0,
      revenueByCategory: [],
    });
    reportService.getClinicalReport = async () => ({
      appointmentsByStatus: { Scheduled: 5 },
      admissionsByStatus: { Admitted: 1 },
    });
    reportService.getPharmacyReport = async () => ({
      totalMedicines: 20,
      activeMedicines: 18,
      lowStockMedicines: 2,
      totalDispensations: 15,
      totalUnitsDispensed: 45,
      totalDispensationValue: 350.0,
    });
    reportService.getLaboratoryReport = async () => ({
      totalOrders: 4,
      ordersByStatus: { COMPLETED: 3, PENDING: 1 },
      ordersByPriority: { ROUTINE: 4 },
    });
  });

  describe("1. Authentication Guards (Unauthenticated → 401)", () => {
    test("GET /api/v1/reports/summary requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/reports/summary");
      assert.strictEqual(res.status, 401);
    });

    test("GET /api/v1/reports/financial requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/reports/financial");
      assert.strictEqual(res.status, 401);
    });

    test("GET /api/v1/reports/clinical requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/reports/clinical");
      assert.strictEqual(res.status, 401);
    });

    test("GET /api/v1/reports/pharmacy requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/reports/pharmacy");
      assert.strictEqual(res.status, 401);
    });

    test("GET /api/v1/reports/laboratory requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/reports/laboratory");
      assert.strictEqual(res.status, 401);
    });
  });

  describe("2. RBAC Permissions (Admin & Doctor Allowed, Receptionist Forbidden)", () => {
    test("receptionist cannot access summary report (403)", async () => {
      const res = await request(receptionistApp).get("/api/v1/reports/summary");
      assert.strictEqual(res.status, 403);
    });

    test("receptionist cannot access financial report (403)", async () => {
      const res = await request(receptionistApp).get("/api/v1/reports/financial");
      assert.strictEqual(res.status, 403);
    });

    test("receptionist cannot access clinical report (403)", async () => {
      const res = await request(receptionistApp).get("/api/v1/reports/clinical");
      assert.strictEqual(res.status, 403);
    });

    test("doctor can access summary and clinical reports (200)", async () => {
      const sumRes = await request(doctorApp).get("/api/v1/reports/summary");
      assert.strictEqual(sumRes.status, 200);
      assert.strictEqual(sumRes.body.success, true);
      assert.strictEqual(sumRes.body.data.totalPatients, 10);

      const clinRes = await request(doctorApp).get("/api/v1/reports/clinical");
      assert.strictEqual(clinRes.status, 200);
      assert.strictEqual(clinRes.body.success, true);
    });

    test("admin can access all report endpoints (200)", async () => {
      const finRes = await request(adminApp).get("/api/v1/reports/financial?startDate=2026-01-01&endDate=2026-12-31");
      assert.strictEqual(finRes.status, 200);
      assert.strictEqual(finRes.body.success, true);
      assert.strictEqual(finRes.body.data.totalBilled, 500.0);

      const pharmRes = await request(adminApp).get("/api/v1/reports/pharmacy");
      assert.strictEqual(pharmRes.status, 200);
      assert.strictEqual(pharmRes.body.data.totalMedicines, 20);

      const labRes = await request(adminApp).get("/api/v1/reports/laboratory");
      assert.strictEqual(labRes.status, 200);
      assert.strictEqual(labRes.body.data.totalOrders, 4);
    });
  });
});
