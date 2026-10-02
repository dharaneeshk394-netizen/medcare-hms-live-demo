const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const { getTestPool, isTestDbConfigured, closeTestDb, closeAppDb } = require("../helpers/testDb");
const { loginTestUser, createTestUser, deleteTestUsersByPrefix } = require("../helpers/authHelper");

describe("Prescription API Automated Integration Suite", () => {
  const TEST_PREFIX = "test_rx_api_";
  let pool;

  let adminUser = null;
  let adminCookie = null;
  let adminCsrf = null;

  let receptionistUser = null;
  let receptionistCookie = null;
  let receptionistCsrf = null;

  let doctorUser = null;
  let doctorCookie = null;
  let doctorCsrf = null;

  let testPatient = null;
  let testDoctor = null;
  let testDept = null;

  const testPassword = "Password123!";
  const createdRxIds = [];
  const createdPatientIds = [];
  const createdDoctorIds = [];
  const createdDeptIds = [];

  before(async () => {
    if (!isTestDbConfigured()) {
      return;
    }
    pool = getTestPool();

    // 1. Cleanup previous test users
    await deleteTestUsersByPrefix(TEST_PREFIX);

    // 2. Create Admin user
    adminUser = await createTestUser({
      fullName: "Rx API Admin",
      username: `${TEST_PREFIX}admin_${Date.now()}`,
      email: `${TEST_PREFIX}admin_${Date.now()}@test.local`,
      password: testPassword,
      role: "admin",
      isActive: true,
    });
    const adminLogin = await loginTestUser(adminUser.username, testPassword);
    adminCookie = adminLogin.cookie;
    adminCsrf = adminLogin.csrfToken;

    // 3. Create Receptionist user
    receptionistUser = await createTestUser({
      fullName: "Rx API Receptionist",
      username: `${TEST_PREFIX}recep_${Date.now()}`,
      email: `${TEST_PREFIX}recep_${Date.now()}@test.local`,
      password: testPassword,
      role: "receptionist",
      isActive: true,
    });
    const recepLogin = await loginTestUser(receptionistUser.username, testPassword);
    receptionistCookie = recepLogin.cookie;
    receptionistCsrf = recepLogin.csrfToken;

    // 4. Create Doctor user
    doctorUser = await createTestUser({
      fullName: "Rx API Doctor",
      username: `${TEST_PREFIX}doc_${Date.now()}`,
      email: `${TEST_PREFIX}doc_${Date.now()}@test.local`,
      password: testPassword,
      role: "doctor",
      isActive: true,
    });
    const docLogin = await loginTestUser(doctorUser.username, testPassword);
    doctorCookie = docLogin.cookie;
    doctorCsrf = docLogin.csrfToken;

    // 5. Seed test department & doctor
    const ts = Date.now().toString().slice(-8);
    const deptName = `API Rx Dept ${ts}`;
    const deptRes = await pool.query(
      `INSERT INTO departments (department_id, name, description, status)
       VALUES ($1, $2, 'Dept for Rx API tests', 'Active')
       RETURNING id`,
      [`D_${ts}`, deptName]
    );
    testDept = deptRes.rows[0];
    createdDeptIds.push(testDept.id);

    const docRes = await pool.query(
      `INSERT INTO doctors (doctor_id, name, specialization, phone, email, department, status)
       VALUES ($1, 'Dr. Rx Test', 'Cardiology', '555-9001', 'dr.rx@test.local', $2, 'Active')
       RETURNING id`,
      [`DOC_${ts}`, deptName]
    );
    testDoctor = docRes.rows[0];
    createdDoctorIds.push(testDoctor.id);

    // 6. Seed test patient
    const patRes = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, phone, blood_group, status)
       VALUES ($1, 'RxPat Tester', 35, 'Male', '555-9002', 'O+', 'Active')
       RETURNING id`,
      [`P_${ts}`]
    );
    testPatient = patRes.rows[0];
    createdPatientIds.push(testPatient.id);
  });

  after(async () => {
    if (!isTestDbConfigured() || !pool) {
      return;
    }

    try {
      if (createdRxIds.length > 0) {
        await pool.query(`DELETE FROM prescription_items WHERE prescription_id = ANY($1::int[])`, [createdRxIds]);
        await pool.query(`DELETE FROM prescriptions WHERE id = ANY($1::int[])`, [createdRxIds]);
      }
      if (createdPatientIds.length > 0) {
        await pool.query(`DELETE FROM patients WHERE id = ANY($1::int[])`, [createdPatientIds]);
      }
      if (createdDoctorIds.length > 0) {
        await pool.query(`DELETE FROM doctors WHERE id = ANY($1::int[])`, [createdDoctorIds]);
      }
      if (createdDeptIds.length > 0) {
        await pool.query(`DELETE FROM departments WHERE id = ANY($1::int[])`, [createdDeptIds]);
      }
      await deleteTestUsersByPrefix(TEST_PREFIX);
    } catch (err) {
      console.error("Cleanup error in prescriptionApi.test.js:", err);
    } finally {
      await closeAppDb();
      await closeTestDb();
    }
  });

  // --- AUTHENTICATION & SECURITY ---

  test("GET /api/v1/prescriptions should require authentication (401)", async () => {
    if (!isTestDbConfigured()) return;

    const res = await request(app).get("/api/v1/prescriptions");
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // --- CREATE PRESCRIPTION (POST /api/v1/prescriptions) ---

  test("POST /api/v1/prescriptions should forbid receptionist role (403)", async () => {
    if (!isTestDbConfigured()) return;

    const res = await request(app)
      .post("/api/v1/prescriptions")
      .set("Cookie", receptionistCookie)
      .set("X-CSRF-Token", receptionistCsrf)
      .send({
        patientId: testPatient.id,
        doctorId: testDoctor.id,
        diagnosisNotes: "Test diagnosis",
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test("POST /api/v1/prescriptions should validate required fields (400)", async () => {
    if (!isTestDbConfigured()) return;

    const res = await request(app)
      .post("/api/v1/prescriptions")
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(Array.isArray(res.body.errors));
  });

  test("POST /api/v1/prescriptions should allow admin to create prescription with items (201)", async () => {
    if (!isTestDbConfigured()) return;

    const res = await request(app)
      .post("/api/v1/prescriptions")
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({
        patientId: testPatient.id,
        doctorId: testDoctor.id,
        diagnosisNotes: "Hypertension Stage 1",
        items: [
          {
            medicineName: "Amoxicillin",
            dosage: "500mg",
            frequency: "3x daily",
            duration: "7 days",
            quantity: 21,
            instructions: "Take after meals",
          },
        ],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.patientId, testPatient.id);
    assert.equal(res.body.data.doctorId, testDoctor.id);
    assert.equal(res.body.data.status, "ACTIVE");
    assert.equal(res.body.data.items.length, 1);
    assert.equal(res.body.data.items[0].medicineName, "Amoxicillin");

    createdRxIds.push(res.body.data.id);
  });

  test("POST /api/v1/prescriptions should allow doctor to create prescription (201)", async () => {
    if (!isTestDbConfigured()) return;

    const res = await request(app)
      .post("/api/v1/prescriptions")
      .set("Cookie", doctorCookie)
      .set("X-CSRF-Token", doctorCsrf)
      .send({
        patientId: testPatient.id,
        doctorId: testDoctor.id,
        diagnosisNotes: "Mild fever",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);

    createdRxIds.push(res.body.data.id);
  });

  // --- READ PRESCRIPTIONS (GET /api/v1/prescriptions & GET /api/v1/prescriptions/:id) ---

  test("GET /api/v1/prescriptions should return prescription list for authorized roles (200)", async () => {
    if (!isTestDbConfigured()) return;

    // Test for admin
    const adminRes = await request(app)
      .get("/api/v1/prescriptions")
      .set("Cookie", adminCookie);

    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.body.success, true);
    assert.ok(Array.isArray(adminRes.body.data));
    assert.ok(adminRes.body.pagination);

    // Test for receptionist
    const recepRes = await request(app)
      .get("/api/v1/prescriptions")
      .set("Cookie", receptionistCookie);

    assert.equal(recepRes.status, 200);
    assert.equal(recepRes.body.success, true);
  });

  test("GET /api/v1/prescriptions/:id should return single prescription with items (200)", async () => {
    if (!isTestDbConfigured() || createdRxIds.length === 0) return;

    const rxId = createdRxIds[0];
    const res = await request(app)
      .get(`/api/v1/prescriptions/${rxId}`)
      .set("Cookie", receptionistCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, rxId);
    assert.ok(Array.isArray(res.body.data.items));
  });

  test("GET /api/v1/prescriptions/:id should return 404 for non-existent ID", async () => {
    if (!isTestDbConfigured()) return;

    const res = await request(app)
      .get("/api/v1/prescriptions/999999")
      .set("Cookie", adminCookie);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test("GET /api/v1/prescriptions/:id should return 400 for invalid ID param", async () => {
    if (!isTestDbConfigured()) return;

    const res = await request(app)
      .get("/api/v1/prescriptions/invalid-id")
      .set("Cookie", adminCookie);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  // --- UPDATE PRESCRIPTION (PUT /api/v1/prescriptions/:id) ---

  test("PUT /api/v1/prescriptions/:id should forbid receptionist role (403)", async () => {
    if (!isTestDbConfigured() || createdRxIds.length === 0) return;

    const rxId = createdRxIds[0];
    const res = await request(app)
      .put(`/api/v1/prescriptions/${rxId}`)
      .set("Cookie", receptionistCookie)
      .send({ diagnosisNotes: "Updated notes" });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  test("PUT /api/v1/prescriptions/:id should update prescription details for admin (200)", async () => {
    if (!isTestDbConfigured() || createdRxIds.length === 0) return;

    const rxId = createdRxIds[0];
    const res = await request(app)
      .put(`/api/v1/prescriptions/${rxId}`)
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({ diagnosisNotes: "Updated diagnosis notes by Admin" });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.diagnosisNotes, "Updated diagnosis notes by Admin");
  });

  // --- PRESCRIPTION ITEM MANAGEMENT ---

  test("POST /api/v1/prescriptions/:id/items should add an item (201)", async () => {
    if (!isTestDbConfigured() || createdRxIds.length === 0) return;

    const rxId = createdRxIds[0];
    const res = await request(app)
      .post(`/api/v1/prescriptions/${rxId}/items`)
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({
        medicineName: "Ibuprofen",
        dosage: "400mg",
        frequency: "2x daily",
        duration: "5 days",
        quantity: 10,
        instructions: "Take with food",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const addedItem = res.body.data.items.find((i) => i.medicineName === "Ibuprofen");
    assert.ok(addedItem);
  });

  test("PUT /api/v1/prescriptions/items/:itemId should update an item (200)", async () => {
    if (!isTestDbConfigured() || createdRxIds.length === 0) return;

    const rxId = createdRxIds[0];
    const getRes = await request(app)
      .get(`/api/v1/prescriptions/${rxId}`)
      .set("Cookie", adminCookie);

    const item = getRes.body.data.items[0];
    assert.ok(item);

    const res = await request(app)
      .put(`/api/v1/prescriptions/items/${item.id}`)
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({ dosage: "1000mg" });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const updatedItem = res.body.data.items.find((i) => i.id === item.id);
    assert.equal(updatedItem.dosage, "1000mg");
  });

  test("DELETE /api/v1/prescriptions/items/:itemId should delete an item (200)", async () => {
    if (!isTestDbConfigured() || createdRxIds.length === 0) return;

    const rxId = createdRxIds[0];
    const getRes = await request(app)
      .get(`/api/v1/prescriptions/${rxId}`)
      .set("Cookie", adminCookie);

    const item = getRes.body.data.items[getRes.body.data.items.length - 1];
    assert.ok(item);

    const res = await request(app)
      .delete(`/api/v1/prescriptions/items/${item.id}`)
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const deletedItem = res.body.data.items.find((i) => i.id === item.id);
    assert.equal(deletedItem, undefined);
  });

  // --- CANCEL PRESCRIPTION (POST /api/v1/prescriptions/:id/cancel) ---

  test("POST /api/v1/prescriptions/:id/cancel should cancel prescription status (200)", async () => {
    if (!isTestDbConfigured() || createdRxIds.length === 0) return;

    const rxId = createdRxIds[0];
    const res = await request(app)
      .post(`/api/v1/prescriptions/${rxId}/cancel`)
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, "CANCELLED");
  });
});
