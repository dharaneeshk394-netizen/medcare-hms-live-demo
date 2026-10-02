const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const express = require("express");

const labRoutes = require("../../src/routes/labRoutes");
const labService = require("../../src/services/labService");
const auditService = require("../../src/services/auditService");

// Mock auditService to avoid DB pool attempts during assertions
auditService.logAuditEvent = async () => {};

// Helper to construct a test Express application with simulated auth state
function createTestApp(user = null) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    if (user) {
      req.user = { ...user };
    }
    next();
  });

  app.use("/api/v1/lab", labRoutes);

  // Error handler
  app.use((err, req, res, _next) => {
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  return app;
}

describe("Laboratory / LIS API: Route & RBAC Suite", () => {
  const unauthApp = createTestApp(null);
  const adminApp = createTestApp({ id: 1, role: "admin", username: "admin_user" });
  const doctorApp = createTestApp({ id: 2, role: "doctor", username: "doctor_user" });
  const receptionistApp = createTestApp({ id: 3, role: "receptionist", username: "recep_user" });

  beforeEach(() => {
    // Reset service mocks to default successful stubs
    labService.listTests = async () => [
      { id: 1, testCode: "LAB-000001", name: "Complete Blood Count", category: "Hematology", price: 25.0 },
    ];
    labService.getTestById = async (id) => {
      if (Number(id) === 999) return null;
      return { id: Number(id), testCode: "LAB-000001", name: "Complete Blood Count", category: "Hematology", price: 25.0 };
    };
    labService.createTest = async (data) => ({
      id: 10,
      testCode: "LAB-000010",
      ...data,
      price: parseFloat(data.price || 0),
    });
    labService.listOrders = async () => [
      { id: 1, orderNumber: "ORD-LAB-000001", patientName: "Arun Kumar", priority: "Routine", status: "PENDING" },
    ];
    labService.getOrderById = async (id) => {
      if (Number(id) === 999) return null;
      return {
        id: Number(id),
        orderNumber: "ORD-LAB-000001",
        patientName: "Arun Kumar",
        status: "PENDING",
        items: [{ id: 1, testName: "Complete Blood Count", price: 25.0 }],
      };
    };
    labService.createOrder = async (data) => ({
      id: 5,
      orderNumber: "ORD-LAB-000005",
      patientId: data.patientId,
      status: "PENDING",
      items: [{ id: 10, testId: 1, price: 25.0 }],
    });
    labService.recordSpecimen = async (id) => ({
      id: Number(id),
      orderNumber: "ORD-LAB-000001",
      status: "SAMPLE_COLLECTED",
    });
    labService.recordResults = async (id, data) => ({
      id: Number(id),
      orderNumber: "ORD-LAB-000001",
      status: "COMPLETED",
      items: [{ id: 1, resultValue: "14.2", resultFlag: "NORMAL" }],
    });
    labService.cancelOrder = async (id, reason) => ({
      id: Number(id),
      orderNumber: "ORD-LAB-000001",
      status: "CANCELLED",
    });
  });

  describe("1. Authentication Guards (Unauthenticated → 401)", () => {
    test("GET /api/v1/lab/tests requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/lab/tests");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test("GET /api/v1/lab/orders requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/lab/orders");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test("POST /api/v1/lab/orders requires authentication", async () => {
      const res = await request(unauthApp).post("/api/v1/lab/orders").send({ patientId: 1, items: [{ testId: 1 }] });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });
  });

  describe("2. RBAC Access Control", () => {
    test("receptionist can view tests and orders (200)", async () => {
      const resTests = await request(receptionistApp).get("/api/v1/lab/tests");
      assert.equal(resTests.status, 200);
      assert.equal(resTests.body.success, true);

      const resOrders = await request(receptionistApp).get("/api/v1/lab/orders");
      assert.equal(resOrders.status, 200);
      assert.equal(resOrders.body.success, true);
    });

    test("receptionist cannot create catalog tests (403)", async () => {
      const res = await request(receptionistApp)
        .post("/api/v1/lab/tests")
        .send({ name: "Blood Sugar", category: "Biochemistry", sampleType: "Blood", price: 20 });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test("receptionist cannot create lab orders (403)", async () => {
      const res = await request(receptionistApp)
        .post("/api/v1/lab/orders")
        .send({ patientId: 1, items: [{ testId: 1 }] });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test("doctor can view tests and create lab orders (200, 201)", async () => {
      const resGet = await request(doctorApp).get("/api/v1/lab/tests");
      assert.equal(resGet.status, 200);

      const resPost = await request(doctorApp)
        .post("/api/v1/lab/orders")
        .send({ patientId: 1, priority: "Urgent", items: [{ testId: 1 }] });
      assert.equal(resPost.status, 201);
      assert.equal(resPost.body.success, true);
      assert.equal(resPost.body.data.status, "PENDING");
    });

    test("admin can create catalog test (201)", async () => {
      const res = await request(adminApp)
        .post("/api/v1/lab/tests")
        .send({ name: "Lipid Profile", category: "Biochemistry", sampleType: "Blood", price: 35 });
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
    });
  });

  describe("3. Order Lifecycle Operations", () => {
    test("receptionist/doctor/admin can record specimen (200)", async () => {
      const res = await request(receptionistApp).put("/api/v1/lab/orders/1/sample");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, "SAMPLE_COLLECTED");
    });

    test("doctor/admin can record results (200)", async () => {
      const res = await request(doctorApp)
        .post("/api/v1/lab/orders/1/results")
        .send({ items: [{ itemId: 1, resultValue: "14.2", resultFlag: "NORMAL" }] });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, "COMPLETED");
    });

    test("doctor/admin can cancel order (200)", async () => {
      const res = await request(doctorApp)
        .put("/api/v1/lab/orders/1/cancel")
        .send({ reason: "Patient declined procedure" });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, "CANCELLED");
    });
  });
});
