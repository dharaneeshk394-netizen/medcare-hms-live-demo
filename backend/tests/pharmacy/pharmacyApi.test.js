const { describe, test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const express = require("express");

const pharmacyRoutes = require("../../src/routes/pharmacyRoutes");
const pharmacyService = require("../../src/services/pharmacyService");
const auditService = require("../../src/services/auditService");

/**
 * Isolated, Database-Independent Pharmacy API & RBAC Test Suite
 *
 * Mocks the service layer to verify router registrations, authentication guards,
 * role-based access control (RBAC), status code mappings, and error envelopes.
 */

// Mock auditService to avoid DB pool attempts during 403 test assertions
auditService.logAuditEvent = async () => {};

// Helper to construct a test Express application with simulated auth state
function createTestApp(user = null) {
  const app = express();
  app.use(express.json());

  // Attach mock user context if authenticated
  app.use((req, res, next) => {
    if (user) {
      req.user = { ...user };
    }
    next();
  });

  app.use("/api/v1/pharmacy", pharmacyRoutes);

  // Error handler
  app.use((err, req, res, _next) => {
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  });

  return app;
}

describe("Pharmacy API: Database-Independent Route & RBAC Suite", () => {
  const unauthApp = createTestApp(null);
  const adminApp = createTestApp({ id: 1, role: "admin", username: "admin_user" });
  const doctorApp = createTestApp({ id: 2, role: "doctor", username: "doctor_user" });
  const receptionistApp = createTestApp({ id: 3, role: "receptionist", username: "recep_user" });

  // Store original service functions to restore after tests
  const originalService = { ...pharmacyService };

  beforeEach(() => {
    // Reset service mocks to default successful stubs
    pharmacyService.listMedicines = async () => [
      { id: 1, medicineCode: "MED-000001", name: "Amoxicillin 500mg", totalStock: 100, isLowStock: false },
    ];
    pharmacyService.getMedicineById = async (id) => {
      if (Number(id) === 999) return null;
      return { id: Number(id), medicineCode: "MED-000001", name: "Amoxicillin 500mg", totalStock: 100, batches: [] };
    };
    pharmacyService.createMedicine = async (data) => ({
      id: 10,
      medicineCode: "MED-000010",
      ...data,
      totalStock: 0,
    });
    pharmacyService.updateMedicine = async (id, data) => ({
      id: Number(id),
      medicineCode: "MED-000001",
      ...data,
    });
    pharmacyService.listLowStock = async () => [
      { id: 2, medicineCode: "MED-000002", name: "Paracetamol 500mg", totalStock: 2, reorderLevel: 10, deficit: 8 },
    ];
    pharmacyService.addBatch = async (data) => ({
      id: 101,
      batchNumber: data.batchNumber || "B001",
      medicineId: data.medicineId || 1,
      quantityInStock: data.quantity || 100,
    });
    pharmacyService.adjustStock = async (data) => ({
      batchId: data.batchId || 1,
      previousQuantity: 50,
      newQuantity: 40,
      changeQuantity: -10,
      reason: data.reason || "Expired disposal",
    });
    pharmacyService.listDispensations = async () => [
      { id: 1, dispensationNumber: "DSP-000001", patientName: "John Doe", quantityDispensed: 10 },
    ];
    pharmacyService.dispenseMedicine = async (data) => ({
      id: 1,
      dispensationNumber: "DSP-000001",
      ...data,
      totalPrice: 100,
    });
  });

  describe("1. Authentication Requirements (Unauthenticated Requests → 401)", () => {
    test("GET /api/v1/pharmacy/medicines requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/pharmacy/medicines");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test("GET /api/v1/pharmacy/medicines/:id requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/pharmacy/medicines/1");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test("GET /api/v1/pharmacy/low-stock requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/pharmacy/low-stock");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test("GET /api/v1/pharmacy/dispensations requires authentication", async () => {
      const res = await request(unauthApp).get("/api/v1/pharmacy/dispensations");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test("POST /api/v1/pharmacy/medicines requires authentication", async () => {
      const res = await request(unauthApp).post("/api/v1/pharmacy/medicines").send({ name: "Drug" });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test("PUT /api/v1/pharmacy/medicines/:id requires authentication", async () => {
      const res = await request(unauthApp).put("/api/v1/pharmacy/medicines/1").send({ name: "Drug" });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test("POST /api/v1/pharmacy/batches requires authentication", async () => {
      const res = await request(unauthApp).post("/api/v1/pharmacy/batches").send({ batchNumber: "B1" });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test("POST /api/v1/pharmacy/stock-adjust requires authentication", async () => {
      const res = await request(unauthApp).post("/api/v1/pharmacy/stock-adjust").send({ batchId: 1 });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });
  });

  describe("2. Receptionist RBAC (Read Allowed, Admin-Only Operations Forbidden → 403)", () => {
    test("receptionist can view medicines list", async () => {
      const res = await request(receptionistApp).get("/api/v1/pharmacy/medicines");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.count, 1);
    });

    test("receptionist can view medicine details", async () => {
      const res = await request(receptionistApp).get("/api/v1/pharmacy/medicines/1");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, 1);
    });

    test("receptionist can view low stock medicines", async () => {
      const res = await request(receptionistApp).get("/api/v1/pharmacy/low-stock");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    test("receptionist is rejected from creating medicine (403)", async () => {
      const res = await request(receptionistApp).post("/api/v1/pharmacy/medicines").send({ name: "Drug" });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test("receptionist is rejected from updating medicine (403)", async () => {
      const res = await request(receptionistApp).put("/api/v1/pharmacy/medicines/1").send({ name: "Drug" });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test("receptionist is rejected from adding batch (403)", async () => {
      const res = await request(receptionistApp).post("/api/v1/pharmacy/batches").send({ batchNumber: "B1" });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test("receptionist is rejected from adjusting stock (403)", async () => {
      const res = await request(receptionistApp).post("/api/v1/pharmacy/stock-adjust").send({ batchId: 1 });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });
  });

  describe("3. Doctor RBAC (Read Allowed, Admin-Only Operations Forbidden → 403)", () => {
    test("doctor can view medicines list", async () => {
      const res = await request(doctorApp).get("/api/v1/pharmacy/medicines");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    test("doctor can view medicine details", async () => {
      const res = await request(doctorApp).get("/api/v1/pharmacy/medicines/1");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    test("doctor can view low stock medicines", async () => {
      const res = await request(doctorApp).get("/api/v1/pharmacy/low-stock");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    test("doctor is rejected from creating medicine (403)", async () => {
      const res = await request(doctorApp).post("/api/v1/pharmacy/medicines").send({ name: "Drug" });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test("doctor is rejected from updating medicine (403)", async () => {
      const res = await request(doctorApp).put("/api/v1/pharmacy/medicines/1").send({ name: "Drug" });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test("doctor is rejected from adding batch (403)", async () => {
      const res = await request(doctorApp).post("/api/v1/pharmacy/batches").send({ batchNumber: "B1" });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test("doctor is rejected from adjusting stock (403)", async () => {
      const res = await request(doctorApp).post("/api/v1/pharmacy/stock-adjust").send({ batchId: 1 });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });
  });

  describe("4. Admin RBAC (Full Access)", () => {
    test("admin can view medicines list (200)", async () => {
      const res = await request(adminApp).get("/api/v1/pharmacy/medicines");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    test("admin can view single medicine (200)", async () => {
      const res = await request(adminApp).get("/api/v1/pharmacy/medicines/1");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    test("admin can view low stock medicines (200)", async () => {
      const res = await request(adminApp).get("/api/v1/pharmacy/low-stock");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    test("admin can create medicine (201)", async () => {
      const res = await request(adminApp)
        .post("/api/v1/pharmacy/medicines")
        .send({ name: "Amoxicillin", category: "Antibiotic", dosageForm: "Tablet", unitPrice: 15 });
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, "Amoxicillin");
    });

    test("admin can update medicine (200)", async () => {
      const res = await request(adminApp)
        .put("/api/v1/pharmacy/medicines/1")
        .send({ name: "Amoxicillin Updated", unitPrice: 20 });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, "Amoxicillin Updated");
    });

    test("admin can add batch (201)", async () => {
      const res = await request(adminApp)
        .post("/api/v1/pharmacy/batches")
        .send({ medicineId: 1, batchNumber: "B100", quantity: 50, expiryDate: "2027-12-31" });
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.batchNumber, "B100");
    });

    test("admin can adjust stock (200)", async () => {
      const res = await request(adminApp)
        .post("/api/v1/pharmacy/stock-adjust")
        .send({ batchId: 1, changeQuantity: -10, reason: "Damaged packaging" });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.newQuantity, 40);
    });
  });

  describe("5. Dispensation Endpoint Status (GET /dispensations → 200)", () => {
    test("GET /api/v1/pharmacy/dispensations returns 200 for admin", async () => {
      const res = await request(adminApp).get("/api/v1/pharmacy/dispensations");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    test("GET /api/v1/pharmacy/dispensations returns 200 for doctor", async () => {
      const res = await request(doctorApp).get("/api/v1/pharmacy/dispensations");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });
  });

  describe("6. Controller Error Mapping & Status Codes", () => {
    test("returns 404 when medicine is not found", async () => {
      const res = await request(adminApp).get("/api/v1/pharmacy/medicines/999");
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Medicine not found/i);
    });

    test("maps service 400 validation errors cleanly", async () => {
      pharmacyService.createMedicine = async () => {
        const error = new Error("Medicine name is required");
        error.statusCode = 400;
        throw error;
      };

      const res = await request(adminApp).post("/api/v1/pharmacy/medicines").send({});
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, "Medicine name is required");
    });

    test("maps unexpected internal service errors to 500", async () => {
      pharmacyService.listMedicines = async () => {
        throw new Error("Unexpected database connection crash");
      };

      const res = await request(adminApp).get("/api/v1/pharmacy/medicines");
      assert.equal(res.status, 500);
      assert.equal(res.body.success, false);
    });
  });
});
