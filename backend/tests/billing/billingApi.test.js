const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const { getTestPool, isTestDbConfigured, closeTestDb, closeAppDb } = require("../helpers/testDb");
const { loginTestUser, createTestUser, deleteTestUsersByPrefix } = require("../helpers/authHelper");

describe("Billing API Automated Integration Suite", () => {
  const TEST_PREFIX = "test_billing_api_";
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
  let testAppointment = null;
  let testAdmission = null;

  const testPassword = "Password123!";
  const createdInvoiceIds = [];
  const createdPatientIds = [];
  const createdDoctorIds = [];
  const createdDeptIds = [];
  const createdApptIds = [];
  const createdAdmIds = [];

  before(async () => {
    if (!isTestDbConfigured()) {
      return;
    }
    pool = getTestPool();

    // 1. Cleanup previous test users
    await deleteTestUsersByPrefix(TEST_PREFIX);

    // 2. Create Admin user
    adminUser = await createTestUser({
      fullName: "Billing API Admin",
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
      fullName: "Billing API Receptionist",
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
      fullName: "Billing API Doctor",
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
    const deptName = `API Bill Dept ${ts}`;
    const deptRes = await pool.query(
      `INSERT INTO departments (department_id, name, description, status)
       VALUES ($1, $2, 'Dept for API tests', 'Active')
       RETURNING id`,
      [`D_${ts}`, deptName]
    );
    testDept = deptRes.rows[0];
    createdDeptIds.push(testDept.id);

    const docRes = await pool.query(
      `INSERT INTO doctors (doctor_id, name, specialization, phone, email, department, status)
       VALUES ($1, 'Dr. API Test', 'Internal Medicine', '555-4001', 'dr.api@test.local', $2, 'Active')
       RETURNING id`,
      [`DOC_${ts}`, deptName]
    );
    testDoctor = docRes.rows[0];
    createdDoctorIds.push(testDoctor.id);

    // 6. Seed test patient
    const patRes = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, phone, email, blood_group, status)
       VALUES ($1, 'John API Patient', 45, 'Male', '555-4002', 'john.api@test.local', 'A+', 'Active')
       RETURNING id`,
      [`P_${ts}`]
    );
    testPatient = patRes.rows[0];
    createdPatientIds.push(testPatient.id);

    // 7. Seed test appointment
    const apptRes = await pool.query(
      `INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, appointment_time, reason, status)
       VALUES ($1, $2, $3, '2026-10-15', '10:00', 'API General Checkup', 'Scheduled')
       RETURNING id`,
      [`APT_${ts}`, testPatient.id, testDoctor.id]
    );
    testAppointment = apptRes.rows[0];
    createdApptIds.push(testAppointment.id);

    // 8. Seed test admission
    const admRes = await pool.query(
      `INSERT INTO admissions (admission_id, patient_id, doctor_id, room_number, bed_number, admission_date, diagnosis, status)
       VALUES ($1, $2, $3, 'Room 501', 'Bed 1', '2026-10-10', 'API Observation', 'Admitted')
       RETURNING id`,
      [`ADM_${ts}`, testPatient.id, testDoctor.id]
    );
    testAdmission = admRes.rows[0];
    createdAdmIds.push(testAdmission.id);
  });

  after(async () => {
    if (isTestDbConfigured() && pool) {
      try {
        // Clean up audit logs created by test users
        await pool.query(
          `DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)`,
          [`${TEST_PREFIX}%`]
        );

        // Clean up billing records
        if (createdInvoiceIds.length > 0) {
          await pool.query(
            `DELETE FROM payments WHERE invoice_id = ANY($1::int[])`,
            [createdInvoiceIds]
          );
          await pool.query(
            `DELETE FROM invoice_items WHERE invoice_id = ANY($1::int[])`,
            [createdInvoiceIds]
          );
          await pool.query(
            `DELETE FROM invoices WHERE id = ANY($1::int[])`,
            [createdInvoiceIds]
          );
        }

        // Clean up clinical records
        if (createdAdmIds.length > 0) {
          await pool.query(`DELETE FROM admissions WHERE id = ANY($1::int[])`, [createdAdmIds]);
        }
        if (createdApptIds.length > 0) {
          await pool.query(`DELETE FROM appointments WHERE id = ANY($1::int[])`, [createdApptIds]);
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

        // Clean up test users
        await deleteTestUsersByPrefix(TEST_PREFIX);
      } catch (err) {
        console.error("Cleanup error in billingApi.test.js:", err.message);
      }
      await closeTestDb();
    }
    await closeAppDb();
  });

  // ==========================================================================
  // 1. AUTHENTICATION & RBAC TESTS
  // ==========================================================================

  describe("1. Authentication & RBAC Rules", () => {
    test("Unauthenticated request to GET /api/v1/billing/invoices returns HTTP 401", async () => {
      const res = await request(app).get("/api/v1/billing/invoices");
      assert.equal(res.status, 401, "Expected 401 Unauthorized");
      assert.equal(res.body.success, false);
    });

    test("Doctor cannot create an invoice (POST /api/v1/billing/invoices returns HTTP 403)", async () => {
      const res = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", doctorCookie)
        .set("X-CSRF-Token", doctorCsrf)
        .send({
          patientId: testPatient.id,
          items: [{ description: "Doc item", quantity: 1, unitPrice: 50.0 }],
        });

      assert.equal(res.status, 403, "Expected 403 Forbidden for doctor creating invoice");
      assert.equal(res.body.success, false);
    });

    test("Doctor can view invoices (GET /api/v1/billing/invoices returns HTTP 200)", async () => {
      const res = await request(app)
        .get("/api/v1/billing/invoices")
        .set("Cookie", doctorCookie);

      assert.equal(res.status, 200, "Expected 200 OK for doctor listing invoices");
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    test("Receptionist can create an invoice (POST /api/v1/billing/invoices returns HTTP 201)", async () => {
      const res = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          patientId: testPatient.id,
          discount: 10.0,
          tax: 5.0,
          items: [
            { itemType: "Consultation", description: "General Check", quantity: 1, unitPrice: 100.0 },
          ],
        });

      assert.equal(res.status, 201, "Expected 201 Created for receptionist creating invoice");
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      createdInvoiceIds.push(res.body.data.id);
      assert.equal(Number(res.body.data.subtotal), 100.0);
      assert.equal(Number(res.body.data.totalAmount), 95.0); // 100 - 10 + 5
      assert.equal(Number(res.body.data.balanceAmount), 95.0);
      assert.equal(res.body.data.status, "PENDING");
    });

    test("Receptionist CANNOT cancel an invoice (POST /api/v1/billing/invoices/:id/cancel returns HTTP 403)", async () => {
      // First create an invoice with admin
      const createRes = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: testPatient.id,
          items: [{ description: "Cancel test", quantity: 1, unitPrice: 50.0 }],
        });
      assert.equal(createRes.status, 201);
      const invoiceId = createRes.body.data.id;
      createdInvoiceIds.push(invoiceId);

      // Receptionist attempts cancel -> 403
      const cancelRes = await request(app)
        .post(`/api/v1/billing/invoices/${invoiceId}/cancel`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({ reason: "Recep trying to cancel" });

      assert.equal(cancelRes.status, 403, "Expected 403 Forbidden when receptionist tries to cancel invoice");
    });

    test("Admin CAN cancel an invoice (POST /api/v1/billing/invoices/:id/cancel returns HTTP 200)", async () => {
      const createRes = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: testPatient.id,
          items: [{ description: "Admin cancel test", quantity: 1, unitPrice: 80.0 }],
        });
      assert.equal(createRes.status, 201);
      const invoiceId = createRes.body.data.id;
      createdInvoiceIds.push(invoiceId);

      const cancelRes = await request(app)
        .post(`/api/v1/billing/invoices/${invoiceId}/cancel`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({ reason: "Admin cancelled test invoice" });

      assert.equal(cancelRes.status, 200, "Expected 200 OK for admin cancelling invoice");
      assert.equal(cancelRes.body.data.status, "CANCELLED");
    });
  });

  // ==========================================================================
  // 2. INPUT VALIDATION & PARAMETER VALIDATION TESTS
  // ==========================================================================

  describe("2. Input & Parameter Validation", () => {
    test("Invalid :id parameter returns HTTP 400 with structured error", async () => {
      const res = await request(app)
        .get("/api/v1/billing/invoices/abc")
        .set("Cookie", adminCookie);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.errors);
    });

    test("Create invoice missing patientId returns HTTP 400", async () => {
      const res = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          items: [{ description: "Missing patient item", quantity: 1, unitPrice: 20.0 }],
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    test("Create invoice with empty items array returns HTTP 400", async () => {
      const res = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: testPatient.id,
          items: [],
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    test("Create invoice with negative price returns HTTP 400", async () => {
      const res = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: testPatient.id,
          items: [{ description: "Neg price", quantity: 1, unitPrice: -25.0 }],
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    test("Create invoice with invalid itemType returns HTTP 400", async () => {
      const res = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: testPatient.id,
          items: [{ itemType: "MagicPotion", description: "Bad type", quantity: 1, unitPrice: 25.0 }],
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    test("Record payment with zero or negative amount returns HTTP 400", async () => {
      // Create invoice first
      const createRes = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: testPatient.id,
          items: [{ description: "Pay test", quantity: 1, unitPrice: 100.0 }],
        });
      const invoiceId = createRes.body.data.id;
      createdInvoiceIds.push(invoiceId);

      const res = await request(app)
        .post(`/api/v1/billing/invoices/${invoiceId}/payments`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({ amount: 0 });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    test("Record payment with invalid paymentMethod returns HTTP 400", async () => {
      const createRes = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: testPatient.id,
          items: [{ description: "Pay method test", quantity: 1, unitPrice: 100.0 }],
        });
      const invoiceId = createRes.body.data.id;
      createdInvoiceIds.push(invoiceId);

      const res = await request(app)
        .post(`/api/v1/billing/invoices/${invoiceId}/payments`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({ amount: 50.0, paymentMethod: "Cryptocurrency" });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  // ==========================================================================
  // 3. FULL INVOICE LIFECYCLE & BUSINESS WORKFLOW VIA API
  // ==========================================================================

  describe("3. Full Invoice Lifecycle & Financial Calculations", () => {
    let activeInvoiceId = null;

    test("POST /api/v1/billing/invoices creates invoice and strips client-controlled status/totals", async () => {
      const res = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: testPatient.id,
          appointmentId: testAppointment.id,
          admissionId: testAdmission.id,
          invoiceDate: "2026-10-15",
          dueDate: "2026-10-30",
          discount: 20.0,
          tax: 10.0,
          billingNotes: "API Lifecycle test invoice",
          status: "PAID", // Client attempting to force status
          totalAmount: 0.01, // Client attempting to force total
          items: [
            { itemType: "Procedure", description: "Blood Test", quantity: 2, unitPrice: 75.0 },
            { itemType: "Medication", description: "Antibiotics", quantity: 1, unitPrice: 50.0 },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      const inv = res.body.data;
      activeInvoiceId = inv.id;
      createdInvoiceIds.push(activeInvoiceId);

      // Subtotal: (2 * 75) + (1 * 50) = 200.00
      assert.equal(Number(inv.subtotal), 200.0);
      // Discount: 20.00, Tax: 10.00 -> Total: 200 - 20 + 10 = 190.00
      assert.equal(Number(inv.totalAmount), 190.0);
      assert.equal(Number(inv.paidAmount), 0.0);
      assert.equal(Number(inv.balanceAmount), 190.0);
      // Status must NOT be client-controlled 'PAID' -> must be 'PENDING'
      assert.equal(inv.status, "PENDING");
      assert.match(inv.invoiceNumber, /^INV\d{6}$/);
    });

    test("GET /api/v1/billing/invoices/:id retrieves full invoice details with items and patient info", async () => {
      const res = await request(app)
        .get(`/api/v1/billing/invoices/${activeInvoiceId}`)
        .set("Cookie", adminCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, activeInvoiceId);
      assert.equal(res.body.data.patient.name, "John API Patient");
      assert.equal(res.body.data.items.length, 2);
    });

    test("PUT /api/v1/billing/invoices/:id updates discount and recalculates totals", async () => {
      const res = await request(app)
        .put(`/api/v1/billing/invoices/${activeInvoiceId}`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          discount: 30.0, // increased discount from 20 to 30
          billingNotes: "Updated billing notes via API",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const inv = res.body.data;
      // Subtotal: 200, Discount: 30, Tax: 10 -> Total: 180.00
      assert.equal(Number(inv.subtotal), 200.0);
      assert.equal(Number(inv.discount), 30.0);
      assert.equal(Number(inv.totalAmount), 180.0);
      assert.equal(Number(inv.balanceAmount), 180.0);
      assert.equal(inv.billingNotes, "Updated billing notes via API");
    });

    test("POST /api/v1/billing/invoices/:id/items adds a new line item and recalculates", async () => {
      const res = await request(app)
        .post(`/api/v1/billing/invoices/${activeInvoiceId}/items`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          itemType: "Room Charge",
          description: "Overnight Bed",
          quantity: 1,
          unitPrice: 100.0,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      const inv = res.body.data;
      // Subtotal: 200 + 100 = 300, Discount: 30, Tax: 10 -> Total: 280.00
      assert.equal(Number(inv.subtotal), 300.0);
      assert.equal(Number(inv.totalAmount), 280.0);
      assert.equal(Number(inv.balanceAmount), 280.0);
      assert.equal(inv.items.length, 3);
    });

    test("PUT /api/v1/billing/invoices/:id/items/:itemId updates item quantity and recalculates", async () => {
      // Get the items
      const getRes = await request(app)
        .get(`/api/v1/billing/invoices/${activeInvoiceId}`)
        .set("Cookie", adminCookie);
      const itemToUpdate = getRes.body.data.items.find((it) => it.description === "Overnight Bed");
      assert.ok(itemToUpdate);

      const res = await request(app)
        .put(`/api/v1/billing/invoices/${activeInvoiceId}/items/${itemToUpdate.id}`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          quantity: 2, // 2 nights * 100 = 200
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const inv = res.body.data;
      // Subtotal: 200 + 200 = 400, Discount: 30, Tax: 10 -> Total: 380.00
      assert.equal(Number(inv.subtotal), 400.0);
      assert.equal(Number(inv.totalAmount), 380.0);
      assert.equal(Number(inv.balanceAmount), 380.0);
    });

    test("DELETE /api/v1/billing/invoices/:id/items/:itemId removes line item and recalculates", async () => {
      const getRes = await request(app)
        .get(`/api/v1/billing/invoices/${activeInvoiceId}`)
        .set("Cookie", adminCookie);
      const itemToRemove = getRes.body.data.items.find((it) => it.description === "Antibiotics");
      assert.ok(itemToRemove);

      const res = await request(app)
        .delete(`/api/v1/billing/invoices/${activeInvoiceId}/items/${itemToRemove.id}`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const inv = res.body.data;
      // Subtotal: 400 - 50 = 350, Discount: 30, Tax: 10 -> Total: 330.00
      assert.equal(Number(inv.subtotal), 350.0);
      assert.equal(Number(inv.totalAmount), 330.0);
      assert.equal(Number(inv.balanceAmount), 330.0);
      assert.equal(inv.items.length, 2);
    });

    test("POST /api/v1/billing/invoices/:id/payments records partial payment (status -> PARTIAL)", async () => {
      const res = await request(app)
        .post(`/api/v1/billing/invoices/${activeInvoiceId}/payments`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          amount: 100.0,
          paymentMethod: "Credit Card",
          referenceNumber: "TXN-99881",
          notes: "First installment",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      const paymentData = res.body.data;
      assert.equal(Number(paymentData.payment.amount), 100.0);
      assert.equal(Number(paymentData.invoice.paidAmount), 100.0);
      assert.equal(Number(paymentData.invoice.balanceAmount), 230.0); // 330 - 100 = 230
      assert.equal(paymentData.invoice.status, "PARTIAL");
    });

    test("Cannot modify items once payment is recorded", async () => {
      const res = await request(app)
        .post(`/api/v1/billing/invoices/${activeInvoiceId}/items`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          description: "Post-payment item",
          quantity: 1,
          unitPrice: 50.0,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Cannot add items to an invoice with status 'PARTIAL'/);
    });

    test("GET /api/v1/billing/invoices/:id/payments lists payment records", async () => {
      const res = await request(app)
        .get(`/api/v1/billing/invoices/${activeInvoiceId}/payments`)
        .set("Cookie", doctorCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.count, 1);
      assert.equal(Number(res.body.data[0].amount), 100.0);
      assert.equal(res.body.data[0].paymentMethod, "Credit Card");
    });

    test("POST /api/v1/billing/invoices/:id/payments rejects overpayment", async () => {
      // Balance is 230.00, attempting to pay 300.00 -> should fail 400
      const res = await request(app)
        .post(`/api/v1/billing/invoices/${activeInvoiceId}/payments`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          amount: 300.0,
          paymentMethod: "Cash",
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /exceeds current invoice balance/);
    });

    test("POST /api/v1/billing/invoices/:id/payments settles full balance (status -> PAID)", async () => {
      // Balance is 230.00, pay exact 230.00
      const res = await request(app)
        .post(`/api/v1/billing/invoices/${activeInvoiceId}/payments`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          amount: 230.0,
          paymentMethod: "Cash",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(Number(res.body.data.invoice.paidAmount), 330.0);
      assert.equal(Number(res.body.data.invoice.balanceAmount), 0.0);
      assert.equal(res.body.data.invoice.status, "PAID");
    });

    test("GET /api/v1/billing/invoices filters by status and patientId accurately", async () => {
      const res = await request(app)
        .get(`/api/v1/billing/invoices?status=PAID&patientId=${testPatient.id}`)
        .set("Cookie", adminCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.count >= 1);
      assert.ok(res.body.data.every((inv) => inv.status === "PAID" && inv.patientId === testPatient.id));
    });
  });
});
