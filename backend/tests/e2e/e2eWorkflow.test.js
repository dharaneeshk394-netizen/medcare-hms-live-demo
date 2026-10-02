const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const { getTestPool, isTestDbConfigured, closeTestDb, closeAppDb } = require("../helpers/testDb");
const { loginTestUser, createTestUser, deleteTestUsersByPrefix } = require("../helpers/authHelper");

describe("Step 32 — End-to-End Automated Integration Test Suite", () => {
  const TEST_PREFIX = "e2e_step32_";
  let pool;

  // Users & Sessions
  let adminUser = null;
  let adminCookie = null;
  let adminCsrf = null;

  let doctor1User = null;
  let doctor1Cookie = null;
  let doctor1Csrf = null;
  let doctor1Profile = null;

  let doctor2User = null;
  let doctor2Cookie = null;
  let doctor2Csrf = null;
  let doctor2Profile = null;

  let receptionistUser = null;
  let receptionistCookie = null;
  let receptionistCsrf = null;

  // Shared test entities
  let testDept = null;
  let patientA = null;
  let patientB = null;

  const testPassword = "E2ETestPassword123!";

  before(async () => {
    if (!isTestDbConfigured()) {
      return;
    }
    pool = getTestPool();

    // 1. Cleanup any leftover test data
    await deleteTestUsersByPrefix(TEST_PREFIX);
    await pool.query("DELETE FROM departments WHERE name LIKE $1", [`${TEST_PREFIX}%`]);

    // 2. Create a test department for foreign keys
    const ts = Date.now() % 1000000;
    const deptRes = await pool.query(
      `INSERT INTO departments (department_id, name, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name`,
      [`DEP${ts}`, `${TEST_PREFIX}Dept_${ts}`, "E2E General Medicine Department", "Active"]
    );
    testDept = deptRes.rows[0];

    // 3. Create Doctor Profiles in the database
    const doc1Res = await pool.query(
      `INSERT INTO doctors (doctor_id, name, specialization, phone, email, department, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, doctor_id, name, email`,
      [
        `DOC${ts}1`,
        "Dr. Alice E2E Specialist",
        "Cardiology",
        "555-0101",
        `${TEST_PREFIX}doc1_${ts}@test.local`,
        testDept.name,
        "Active",
      ]
    );
    doctor1Profile = doc1Res.rows[0];

    const doc2Res = await pool.query(
      `INSERT INTO doctors (doctor_id, name, specialization, phone, email, department, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, doctor_id, name, email`,
      [
        `DOC${ts}2`,
        "Dr. Bob E2E Specialist",
        "Neurology",
        "555-0102",
        `${TEST_PREFIX}doc2_${ts}@test.local`,
        testDept.name,
        "Active",
      ]
    );
    doctor2Profile = doc2Res.rows[0];

    // 4. Create User Accounts
    // Admin
    adminUser = await createTestUser({
      fullName: "E2E Admin User",
      username: `${TEST_PREFIX}admin_${Date.now()}`,
      email: `${TEST_PREFIX}admin_${Date.now()}@test.local`,
      password: testPassword,
      role: "admin",
      isActive: true,
    });
    const adminLogin = await loginTestUser(adminUser.username, testPassword);
    adminCookie = adminLogin.cookie;
    adminCsrf = adminLogin.csrfToken;

    // Doctor 1
    doctor1User = await createTestUser({
      fullName: doctor1Profile.name,
      username: `${TEST_PREFIX}doc1_${Date.now()}`,
      email: doctor1Profile.email,
      password: testPassword,
      role: "doctor",
      isActive: true,
      doctorId: doctor1Profile.id,
    });
    const doc1Login = await loginTestUser(doctor1User.username, testPassword);
    doctor1Cookie = doc1Login.cookie;
    doctor1Csrf = doc1Login.csrfToken;

    // Doctor 2
    doctor2User = await createTestUser({
      fullName: doctor2Profile.name,
      username: `${TEST_PREFIX}doc2_${Date.now()}`,
      email: doctor2Profile.email,
      password: testPassword,
      role: "doctor",
      isActive: true,
      doctorId: doctor2Profile.id,
    });
    const doc2Login = await loginTestUser(doctor2User.username, testPassword);
    doctor2Cookie = doc2Login.cookie;
    doctor2Csrf = doc2Login.csrfToken;

    // Receptionist
    receptionistUser = await createTestUser({
      fullName: "E2E Receptionist User",
      username: `${TEST_PREFIX}recep_${Date.now()}`,
      email: `${TEST_PREFIX}recep_${Date.now()}@test.local`,
      password: testPassword,
      role: "receptionist",
      isActive: true,
    });
    const recepLogin = await loginTestUser(receptionistUser.username, testPassword);
    receptionistCookie = recepLogin.cookie;
    receptionistCsrf = recepLogin.csrfToken;
  });

  after(async () => {
    if (isTestDbConfigured() && pool) {
      try {
        await deleteTestUsersByPrefix(TEST_PREFIX);
        if (doctor1Profile && doctor2Profile) {
          const docIds = [doctor1Profile.id, doctor2Profile.id];
          await pool.query(
            "DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE 'E2E%'))"
          );
          await pool.query(
            "DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE 'E2E%'))"
          );
          await pool.query(
            "DELETE FROM invoices WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE 'E2E%')"
          );
          await pool.query(
            "DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE doctor_id = ANY($1) OR patient_id IN (SELECT id FROM patients WHERE name LIKE 'E2E%'))",
            [docIds]
          );
          await pool.query(
            "DELETE FROM prescriptions WHERE doctor_id = ANY($1) OR patient_id IN (SELECT id FROM patients WHERE name LIKE 'E2E%')",
            [docIds]
          );
          await pool.query(
            "DELETE FROM medical_records WHERE doctor_id = ANY($1) OR patient_id IN (SELECT id FROM patients WHERE name LIKE 'E2E%')",
            [docIds]
          );
          await pool.query(
            "DELETE FROM admissions WHERE doctor_id = ANY($1) OR patient_id IN (SELECT id FROM patients WHERE name LIKE 'E2E%')",
            [docIds]
          );
          await pool.query(
            "DELETE FROM appointments WHERE doctor_id = ANY($1) OR patient_id IN (SELECT id FROM patients WHERE name LIKE 'E2E%')",
            [docIds]
          );
          await pool.query("DELETE FROM patients WHERE name LIKE 'E2E%'");
          await pool.query("DELETE FROM doctors WHERE id = ANY($1)", [docIds]);
        }
        if (testDept) {
          await pool.query("DELETE FROM departments WHERE id = $1", [testDept.id]);
        }
      } catch (err) {
        console.error("Cleanup error in after hook:", err.message);
      }
      await closeTestDb();
    }
    await closeAppDb();
  });

  // =========================================================================
  // 1. COMPLETE REALISTIC ADMIN E2E WORKFLOW
  // =========================================================================
  describe("1. Complete Realistic Admin E2E Workflow (24 Steps)", () => {
    let workflowPatientId = null;
    let workflowApptId = null;
    let workflowAdmId = null;
    let workflowRxId = null;
    let workflowRxItemId = null;
    let workflowMrId = null;
    let workflowInvoiceId = null;
    let workflowInvoiceItemId = null;
    let workflowPaymentId = null;
    let adminWorkflowCookie = null;
    let adminWorkflowCsrf = null;

    test("Steps 1-3: Admin Login, Authentication Verification, and Dashboard Status", async () => {
      // Step 1: Login as Admin
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: adminUser.username, password: testPassword });

      assert.equal(loginRes.status, 200, "Admin login must return HTTP 200");
      assert.equal(loginRes.body.success, true);
      assert.equal(loginRes.body.data.role, "admin");

      const setCookie = loginRes.headers["set-cookie"];
      assert.ok(setCookie && setCookie.length > 0, "Login must set session cookie");
      adminWorkflowCookie = setCookie.find(c => c.startsWith("hms_sid=")).split(";")[0];
      adminWorkflowCsrf = loginRes.body?.data?.csrfToken || adminCsrf;

      // Step 2: Verify authenticated session
      const meRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", adminWorkflowCookie);

      assert.equal(meRes.status, 200, "GET /auth/me with session must return HTTP 200");
      assert.equal(meRes.body.data.username, adminUser.username.toLowerCase());
      assert.equal(meRes.body.data.role, "admin");

      // Step 3: Verify Dashboard API loads
      const dashRes = await request(app)
        .get("/api/v1")
        .set("Cookie", adminWorkflowCookie);

      assert.equal(dashRes.status, 200, "Dashboard API must return HTTP 200");
      assert.equal(dashRes.body.success, true);
    });

    test("Steps 4-6: Navigate to Patients, Create Patient, Verify Patient Creation", async () => {
      // Step 4: GET /patients (verify list access)
      const listRes = await request(app)
        .get("/api/v1/patients")
        .set("Cookie", adminWorkflowCookie);

      assert.equal(listRes.status, 200, "Patients list must return HTTP 200");
      assert.ok(Array.isArray(listRes.body.data));

      // Step 5: Create a new Patient
      const createRes = await request(app)
        .post("/api/v1/patients")
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf)
        .send({
          name: "E2E Jane Patient",
          age: 42,
          gender: "Female",
          phone: "555-0987",
          email: `${TEST_PREFIX}jane_${Date.now()}@test.local`,
          bloodGroup: "A+",
          status: "Active",
        });

      assert.equal(createRes.status, 201, "Creating patient must return HTTP 201");
      assert.ok(createRes.body.data.id, "Created patient must have an ID");
      workflowPatientId = createRes.body.data.id;
      patientA = createRes.body.data;

      // Step 6: Verify patient appears correctly
      const getRes = await request(app)
        .get(`/api/v1/patients/${workflowPatientId}`)
        .set("Cookie", adminWorkflowCookie);

      assert.equal(getRes.status, 200, "Fetching created patient must return HTTP 200");
      assert.equal(getRes.body.data.name, "E2E Jane Patient");
      assert.equal(getRes.body.data.bloodGroup, "A+");
    });

    test("Steps 7-8: Create Appointment and Verify Linkage to Patient and Doctor", async () => {
      // Step 7: Create appointment for patient with Doctor 1
      const apptRes = await request(app)
        .post("/api/v1/appointments")
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf)
        .send({
          patientId: workflowPatientId,
          doctorId: doctor1Profile.id,
          appointmentDate: "2026-11-01",
          appointmentTime: "09:30",
          reason: "E2E Cardiology Consultation",
          status: "Scheduled",
        });

      assert.equal(apptRes.status, 201, "Appointment creation must return HTTP 201");
      assert.ok(apptRes.body.data.id, "Appointment must have an ID");
      workflowApptId = apptRes.body.data.id;

      // Step 8: Verify appointment relationships
      const verifyRes = await request(app)
        .get(`/api/v1/appointments/${workflowApptId}`)
        .set("Cookie", adminWorkflowCookie);

      assert.equal(verifyRes.status, 200);
      assert.equal(Number(verifyRes.body.data.patientId), Number(workflowPatientId));
      assert.equal(Number(verifyRes.body.data.doctorId), Number(doctor1Profile.id));
      assert.equal(verifyRes.body.data.reason, "E2E Cardiology Consultation");
    });

    test("Steps 9-10: Create Admission and Verify Relationship", async () => {
      // Step 9: Create admission for the patient
      const admRes = await request(app)
        .post("/api/v1/admissions")
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf)
        .send({
          patientId: workflowPatientId,
          doctorId: doctor1Profile.id,
          roomNumber: "402",
          bedNumber: "B",
          admissionDate: "2026-11-02",
          expectedDischargeDate: "2026-11-06",
          diagnosis: "Cardiac Observation",
          status: "Admitted",
        });

      assert.equal(admRes.status, 201, "Admission creation must return HTTP 201");
      assert.ok(admRes.body.data.id);
      workflowAdmId = admRes.body.data.id;

      // Step 10: Verify admission relationship
      const verifyRes = await request(app)
        .get(`/api/v1/admissions/${workflowAdmId}`)
        .set("Cookie", adminWorkflowCookie);

      assert.equal(verifyRes.status, 200);
      assert.equal(Number(verifyRes.body.data.patientId), Number(workflowPatientId));
      assert.equal(Number(verifyRes.body.data.doctorId), Number(doctor1Profile.id));
      assert.equal(verifyRes.body.data.roomNumber, "402");
    });

    test("Steps 11-14: Create Prescription, Verify It, Add Prescription Items, and Verify Items", async () => {
      // Step 11: Create prescription linked to patient and doctor
      const rxRes = await request(app)
        .post("/api/v1/prescriptions")
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf)
        .send({
          patientId: workflowPatientId,
          doctorId: doctor1Profile.id,
          diagnosisNotes: "Hypertensive Heart Disease",
          diagnosis: "Hypertensive Heart Disease",
          notes: "Strict low-sodium diet and bed rest",
          status: "ACTIVE",
        });

      assert.equal(rxRes.status, 201, "Prescription creation must return HTTP 201");
      assert.ok(rxRes.body.data.id);
      workflowRxId = rxRes.body.data.id;

      // Step 12: Verify prescription appears correctly
      const verifyRxRes = await request(app)
        .get(`/api/v1/prescriptions/${workflowRxId}`)
        .set("Cookie", adminWorkflowCookie);

      assert.equal(verifyRxRes.status, 200);
      assert.equal(Number(verifyRxRes.body.data.patientId), Number(workflowPatientId));
      assert.equal(Number(verifyRxRes.body.data.doctorId), Number(doctor1Profile.id));
      assert.ok(
        verifyRxRes.body.data.diagnosisNotes === "Hypertensive Heart Disease" ||
        verifyRxRes.body.data.diagnosis === "Hypertensive Heart Disease",
        "Prescription diagnosis or diagnosisNotes must match"
      );

      // Step 13: Add prescription item
      const itemRes = await request(app)
        .post(`/api/v1/prescriptions/${workflowRxId}/items`)
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf)
        .send({
          medicineName: "Lisinopril",
          dosage: "10mg",
          frequency: "Once daily",
          duration: "30 days",
          instructions: "Take in the morning with water",
        });

      assert.equal(itemRes.status, 201, "Adding prescription item must return HTTP 201");
      assert.ok(itemRes.body.data.id);
      workflowRxItemId = itemRes.body.data.items?.[0]?.id || itemRes.body.data.id;

      // Step 14: Verify prescription items in composite details
      const detailRes = await request(app)
        .get(`/api/v1/prescriptions/${workflowRxId}`)
        .set("Cookie", adminWorkflowCookie);

      assert.equal(detailRes.status, 200);
      assert.ok(Array.isArray(detailRes.body.data.items));
      assert.equal(detailRes.body.data.items.length, 1);
      assert.ok(
        detailRes.body.data.items[0].medicineName === "Lisinopril" ||
        detailRes.body.data.items[0].medicationName === "Lisinopril"
      );
    });

    test("Steps 15-16: Create Medical Record and Verify It", async () => {
      // Step 15: Create medical record for the patient, doctor, and appointment
      const mrRes = await request(app)
        .post("/api/v1/medical-records")
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf)
        .send({
          patientId: workflowPatientId,
          doctorId: doctor1Profile.id,
          appointmentId: workflowApptId,
          recordType: "Inpatient Progress",
          recordDate: "2026-11-02",
          chiefComplaint: "Shortness of breath on exertion",
          diagnosis: "Stage 2 Hypertension",
          treatmentPlan: "Administer Lisinopril and monitor telemetry daily",
          clinicalNotes: "Patient resting comfortably in room 402.",
          status: "ACTIVE",
        });

      assert.equal(mrRes.status, 201, "Medical record creation must return HTTP 201");
      assert.ok(mrRes.body.data.id);
      workflowMrId = mrRes.body.data.id;

      // Step 16: Verify medical record
      const verifyMrRes = await request(app)
        .get(`/api/v1/medical-records/${workflowMrId}`)
        .set("Cookie", adminWorkflowCookie);

      assert.equal(verifyMrRes.status, 200);
      assert.equal(Number(verifyMrRes.body.data.patientId), Number(workflowPatientId));
      assert.equal(Number(verifyMrRes.body.data.doctorId), Number(doctor1Profile.id));
      assert.equal(Number(verifyMrRes.body.data.appointmentId), Number(workflowApptId));
      assert.equal(verifyMrRes.body.data.diagnosis, "Stage 2 Hypertension");
    });

    test("Steps 17-20: Create Invoice, Add Item, Record Payment, and Verify Calculations", async () => {
      // Step 17: Create invoice linked to Patient, Appointment, and Admission
      const invRes = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf)
        .send({
          patientId: workflowPatientId,
          appointmentId: workflowApptId,
          admissionId: workflowAdmId,
          discount: 20.0,
          tax: 15.0,
          notes: "E2E Full Inpatient Stay and Cardiology Invoice",
          items: [
            {
              description: "Cardiology Specialist Consultation",
              quantity: 1,
              unitPrice: 150.0,
            },
          ],
        });

      assert.equal(invRes.status, 201, "Invoice creation must return HTTP 201");
      assert.ok(invRes.body.data.id);
      workflowInvoiceId = invRes.body.data.id;

      // Subtotal = 150, Discount = 20, Tax = 15 => Total = 145, Balance = 145, Status = PENDING
      assert.equal(Number(invRes.body.data.subtotal), 150.0);
      assert.equal(Number(invRes.body.data.totalAmount ?? invRes.body.data.total), 145.0);
      assert.equal(Number(invRes.body.data.balanceAmount ?? invRes.body.data.balance), 145.0);
      assert.equal(invRes.body.data.status, "PENDING");

      // Step 18: Add an invoice item (Room charge)
      const addItemRes = await request(app)
        .post(`/api/v1/billing/invoices/${workflowInvoiceId}/items`)
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf)
        .send({
          description: "Room 402 Bed B (4 Nights)",
          quantity: 4,
          unitPrice: 50.0,
        });

      assert.ok(
        [200, 201].includes(addItemRes.status),
        "Adding invoice item must return HTTP 200 or 201"
      );
      // Subtotal: 150 + 200 = 350, Discount = 20, Tax = 15 => Total = 345, Balance = 345
      assert.equal(Number(addItemRes.body.data.subtotal), 350.0);
      assert.equal(Number(addItemRes.body.data.totalAmount ?? addItemRes.body.data.total), 345.0);
      assert.equal(Number(addItemRes.body.data.balanceAmount ?? addItemRes.body.data.balance), 345.0);

      // Step 19: Record a valid partial payment then a full remaining payment
      const partialPayRes = await request(app)
        .post(`/api/v1/billing/invoices/${workflowInvoiceId}/payments`)
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf)
        .send({
          amount: 145.0,
          paymentMethod: "Credit Card",
          referenceNumber: "TXN-E2E-PARTIAL-1",
          notes: "Initial insurance copay",
        });

      assert.equal(partialPayRes.status, 201, "Recording partial payment must return HTTP 201");
      assert.equal(Number(partialPayRes.body.data.invoice.paidAmount), 145.0);
      assert.equal(Number(partialPayRes.body.data.invoice.balanceAmount ?? partialPayRes.body.data.invoice.balance), 200.0);
      assert.equal(partialPayRes.body.data.invoice.status, "PARTIAL");

      // Step 20: Full payment of remaining balance
      const fullPayRes = await request(app)
        .post(`/api/v1/billing/invoices/${workflowInvoiceId}/payments`)
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf)
        .send({
          amount: 200.0,
          paymentMethod: "Insurance",
          referenceNumber: "TXN-E2E-FULL-2",
          notes: "Insurance claim settled in full",
        });

      assert.equal(fullPayRes.status, 201, "Recording full payment must return HTTP 201");
      assert.equal(Number(fullPayRes.body.data.invoice.paidAmount), 345.0);
      assert.equal(Number(fullPayRes.body.data.invoice.balanceAmount ?? fullPayRes.body.data.invoice.balance), 0.0);
      assert.equal(fullPayRes.body.data.invoice.status, "PAID");
    });

    test("Steps 21-22: Navigate Back to Patient & Verify Consistent Related Data", async () => {
      // Step 21 & 22: Query patient and related data filters
      const patientCheck = await request(app)
        .get(`/api/v1/patients/${workflowPatientId}`)
        .set("Cookie", adminWorkflowCookie);

      assert.equal(patientCheck.status, 200);
      assert.equal(patientCheck.body.data.id, workflowPatientId);

      // Verify appointments list for this patient
      const apptCheck = await request(app)
        .get(`/api/v1/appointments?patientId=${workflowPatientId}`)
        .set("Cookie", adminWorkflowCookie);
      assert.equal(apptCheck.status, 200);
      assert.ok(apptCheck.body.data.some((a) => Number(a.id) === Number(workflowApptId)));

      // Verify prescriptions for this patient
      const rxCheck = await request(app)
        .get(`/api/v1/prescriptions?patientId=${workflowPatientId}`)
        .set("Cookie", adminWorkflowCookie);
      assert.equal(rxCheck.status, 200);
      assert.ok(rxCheck.body.data.some((r) => Number(r.id) === Number(workflowRxId)));

      // Verify medical records for this patient
      const mrCheck = await request(app)
        .get(`/api/v1/medical-records?patientId=${workflowPatientId}`)
        .set("Cookie", adminWorkflowCookie);
      assert.equal(mrCheck.status, 200);
      assert.ok(mrCheck.body.data.some((m) => Number(m.id) === Number(workflowMrId)));

      // Verify invoices for this patient
      const invCheck = await request(app)
        .get(`/api/v1/billing/invoices?patientId=${workflowPatientId}`)
        .set("Cookie", adminWorkflowCookie);
      assert.equal(invCheck.status, 200);
      assert.ok(invCheck.body.data.some((i) => Number(i.id) === Number(workflowInvoiceId)));
    });

    test("Steps 23-24: Logout and Verify Protected Resources Reject Access", async () => {
      // Step 23: Logout
      const logoutRes = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", adminWorkflowCookie)
        .set("X-CSRF-Token", adminWorkflowCsrf);

      assert.equal(logoutRes.status, 200, "Logout must return HTTP 200");
      assert.equal(logoutRes.body.success, true);

      // Step 24: Verify protected resources reject access without authentication
      const meAfterLogout = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", adminWorkflowCookie);
      assert.equal(meAfterLogout.status, 401, "GET /auth/me after logout must return HTTP 401");

      const patientsAfterLogout = await request(app)
        .get("/api/v1/patients")
        .set("Cookie", adminWorkflowCookie);
      assert.equal(patientsAfterLogout.status, 401, "Protected route after logout must return HTTP 401");

      const invoicesAfterLogout = await request(app)
        .get("/api/v1/billing/invoices")
        .set("Cookie", adminWorkflowCookie);
      assert.equal(invoicesAfterLogout.status, 401, "Protected billing route after logout must return HTTP 401");
    });
  });

  // =========================================================================
  // 2. COMPLETE DOCTOR WORKFLOW (14 STEPS)
  // =========================================================================
  describe("2. Complete Doctor Workflow (14 Steps)", () => {
    let docPatientId = null;
    let docApptId = null;
    let docRxId = null;
    let docRxItemId = null;
    let docMrId = null;

    before(async () => {
      if (!patientA) {
        const patRes = await request(app)
          .post("/api/v1/patients")
          .set("Cookie", adminCookie)
          .set("X-CSRF-Token", adminCsrf)
          .send({
            name: "E2E Doctor Patient",
            age: 38,
            gender: "Male",
            phone: "555-0222",
            email: `${TEST_PREFIX}doc_pat_${Date.now()}@test.local`,
            bloodGroup: "O+",
            status: "Active",
          });
        patientA = patRes.body.data;
      }
    });

    test("1. Login succeeds & 2. Dashboard loads", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: doctor1User.username, password: testPassword });

      assert.equal(loginRes.status, 200, "Doctor login must return HTTP 200");
      assert.equal(loginRes.body.data.role, "doctor");
      assert.equal(Number(loginRes.body.data.doctorId), Number(doctor1Profile.id));

      const dashRes = await request(app)
        .get("/api/v1")
        .set("Cookie", doctor1Cookie);
      assert.equal(dashRes.status, 200);
    });

    test("3. Doctor can access permitted patient information", async () => {
      const res = await request(app)
        .get("/api/v1/patients")
        .set("Cookie", doctor1Cookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    test("4-5. Doctor can access, create, and update permitted appointments under their own doctor ID", async () => {
      // Access appointments
      const listRes = await request(app)
        .get("/api/v1/appointments")
        .set("Cookie", doctor1Cookie);
      assert.equal(listRes.status, 200);

      // Create appointment under Doctor 1's ID
      const createRes = await request(app)
        .post("/api/v1/appointments")
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({
          patientId: patientA.id,
          doctorId: doctor1Profile.id,
          appointmentDate: "2026-11-10",
          appointmentTime: "11:00",
          reason: "Routine Cardiac Review",
          status: "Scheduled",
        });

      assert.equal(createRes.status, 201);
      docApptId = createRes.body.data.id;

      // Update permitted appointment
      const updateRes = await request(app)
        .put(`/api/v1/appointments/${docApptId}`)
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({
          reason: "Updated Cardiac Review - ECG scheduled",
          status: "Completed",
        });

      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.status, "Completed");
    });

    test("6-7. Doctor can create and manage their own prescriptions and items", async () => {
      // Create prescription under Doctor 1
      const rxRes = await request(app)
        .post("/api/v1/prescriptions")
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({
          patientId: patientA.id,
          doctorId: doctor1Profile.id,
          diagnosis: "Atorvastatin Review",
          notes: "Check lipid panel in 6 weeks",
          status: "ACTIVE",
        });

      assert.equal(rxRes.status, 201);
      docRxId = rxRes.body.data.id;

      // Add item
      const itemRes = await request(app)
        .post(`/api/v1/prescriptions/${docRxId}/items`)
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({
          medicineName: "Atorvastatin",
          dosage: "20mg",
          frequency: "Once at bedtime",
          duration: "90 days",
          instructions: "Take with or without food",
        });

      assert.equal(itemRes.status, 201);
      docRxItemId = itemRes.body.data.items?.[0]?.id || itemRes.body.data.id;

      // Update item
      const updateItemRes = await request(app)
        .put(`/api/v1/prescriptions/items/${docRxItemId}`)
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({
          dosage: "40mg",
          instructions: "Increased dosage per lipid panel",
        });

      assert.equal(updateItemRes.status, 200);
    });

    test("8. Doctor can create and update permitted medical records", async () => {
      const createMrRes = await request(app)
        .post("/api/v1/medical-records")
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({
          patientId: patientA.id,
          doctorId: doctor1Profile.id,
          recordType: "Outpatient",
          recordDate: "2026-11-10",
          chiefComplaint: "Mild fatigue",
          diagnosis: "Hyperlipidemia",
          treatmentPlan: "Atorvastatin 40mg daily",
          clinicalNotes: "Lipid panel requested.",
          status: "ACTIVE",
        });

      assert.equal(createMrRes.status, 201);
      docMrId = createMrRes.body.data.id;

      const updateMrRes = await request(app)
        .put(`/api/v1/medical-records/${docMrId}`)
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({
          clinicalNotes: "Lipid panel reviewed: LDL improved. Continue therapy.",
        });

      assert.equal(updateMrRes.status, 200);
    });

    test("9. Doctor cannot perform Admin-only operations", async () => {
      // Delete patient (admin only)
      const delPat = await request(app)
        .delete(`/api/v1/patients/${patientA.id}`)
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf);
      assert.equal(delPat.status, 403, "Doctor cannot delete patients (403)");

      // Create doctor (admin only)
      const addDoc = await request(app)
        .post("/api/v1/doctors")
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({ name: "Unauth Doctor" });
      assert.equal(addDoc.status, 403, "Doctor cannot create doctors (403)");

      // Cancel invoice (admin only)
      const cancelInv = await request(app)
        .post("/api/v1/billing/invoices/999/cancel")
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({ reason: "Unauthorized attempt" });
      assert.equal(cancelInv.status, 403, "Doctor cannot cancel invoices (403)");
    });

    test("10. Doctor cannot modify another doctor's protected resources", async () => {
      // 10a: Doctor 1 attempts to create appointment for Doctor 2
      const unauthAppt = await request(app)
        .post("/api/v1/appointments")
        .set("Cookie", doctor1Cookie)
        .send({
          patientId: patientA.id,
          doctorId: doctor2Profile.id,
          appointmentDate: "2026-11-12",
          appointmentTime: "14:00",
          reason: "Sneak appointment for Doctor 2",
        });
      assert.equal(unauthAppt.status, 403, "Doctor 1 cannot create appointment for Doctor 2 (403)");

      // 10b: Doctor 1 attempts to create prescription for Doctor 2
      const unauthRx = await request(app)
        .post("/api/v1/prescriptions")
        .set("Cookie", doctor1Cookie)
        .send({
          patientId: patientA.id,
          doctorId: doctor2Profile.id,
          diagnosis: "Unauthorized Rx",
        });
      assert.equal(unauthRx.status, 403, "Doctor 1 cannot create prescription for Doctor 2 (403)");

      // 10c: Doctor 1 attempts to create medical record for Doctor 2
      const unauthMr = await request(app)
        .post("/api/v1/medical-records")
        .set("Cookie", doctor1Cookie)
        .send({
          patientId: patientA.id,
          doctorId: doctor2Profile.id,
          diagnosis: "Unauthorized MR",
        });
      assert.equal(unauthMr.status, 403, "Doctor 1 cannot create medical record for Doctor 2 (403)");
    });

    test("11. Doctor cannot reassign protected ownership", async () => {
      // Attempt to reassign appointment to Doctor 2
      const reassignAppt = await request(app)
        .put(`/api/v1/appointments/${docApptId}`)
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({ doctorId: doctor2Profile.id });

      assert.equal(reassignAppt.status, 403, "Doctor cannot reassign appointment to another doctor (403)");

      // Attempt to reassign medical record to Doctor 2
      const reassignMr = await request(app)
        .put(`/api/v1/medical-records/${docMrId}`)
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({ doctorId: doctor2Profile.id });

      assert.equal(reassignMr.status, 400, "Doctor cannot reassign medical record to another doctor (400)");
    });

    test("12. Billing access matches existing RBAC rules (View permitted, Mutation restricted)", async () => {
      // Doctor CAN view invoices
      const viewInvoices = await request(app)
        .get("/api/v1/billing/invoices")
        .set("Cookie", doctor1Cookie);
      assert.equal(viewInvoices.status, 200, "Doctor can view invoices (200)");

      // Doctor CANNOT create invoice
      const createInv = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({ patientId: patientA.id, items: [{ description: "Doc Fee", quantity: 1, unitPrice: 100 }] });
      assert.equal(createInv.status, 403, "Doctor cannot create invoice (403)");

      // Doctor CANNOT record payment
      const recordPay = await request(app)
        .post("/api/v1/billing/invoices/1/payments")
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf)
        .send({ amount: 50, paymentMethod: "CASH" });
      assert.equal(recordPay.status, 403, "Doctor cannot record payment (403)");
    });

    test("13-14. Doctor logout works & protected resources reject access after logout", async () => {
      const docLogout = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", doctor1Cookie)
        .set("X-CSRF-Token", doctor1Csrf);
      assert.equal(docLogout.status, 200);

      const meCheck = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", doctor1Cookie);
      assert.equal(meCheck.status, 401);

      // Re-login to keep doctor1Cookie valid for subsequent tests
      const reLogin = await loginTestUser(doctor1User.username, testPassword);
      doctor1Cookie = reLogin.cookie;
    });
  });

  // =========================================================================
  // 3. COMPLETE RECEPTIONIST WORKFLOW (11 STEPS)
  // =========================================================================
  describe("3. Complete Receptionist Workflow (11 Steps)", () => {
    let recepPatientId = null;
    let recepApptId = null;
    let recepAdmId = null;
    let recepInvoiceId = null;

    test("1. Login succeeds & 2. Dashboard loads", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: receptionistUser.username, password: testPassword });

      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.body.data.role, "receptionist");

      const dashRes = await request(app)
        .get("/api/v1")
        .set("Cookie", receptionistCookie);
      assert.equal(dashRes.status, 200);
    });

    test("3. Receptionist can access permitted patient operations (Create, Read, Update)", async () => {
      // Create patient
      const createRes = await request(app)
        .post("/api/v1/patients")
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          name: "E2E Receptionist Patient",
          age: 29,
          gender: "Male",
          phone: "555-0333",
          email: `${TEST_PREFIX}recep_pat_${Date.now()}@test.local`,
          bloodGroup: "B+",
          status: "Active",
        });

      assert.equal(createRes.status, 201);
      recepPatientId = createRes.body.data.id;
      patientB = createRes.body.data;

      // Update patient
      const updateRes = await request(app)
        .put(`/api/v1/patients/${recepPatientId}`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({ phone: "555-0334" });

      assert.equal(updateRes.status, 200);
    });

    test("4. Receptionist can access permitted appointments", async () => {
      // Receptionist can create appointment for ANY doctor
      const createRes = await request(app)
        .post("/api/v1/appointments")
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          patientId: recepPatientId,
          doctorId: doctor2Profile.id,
          appointmentDate: "2026-11-20",
          appointmentTime: "15:30",
          reason: "Neurology consultation intake",
          status: "Scheduled",
        });

      assert.equal(createRes.status, 201);
      recepApptId = createRes.body.data.id;
    });

    test("5. Receptionist can perform permitted admission operations", async () => {
      const admRes = await request(app)
        .post("/api/v1/admissions")
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          patientId: recepPatientId,
          doctorId: doctor2Profile.id,
          roomNumber: "105",
          bedNumber: "C",
          admissionDate: "2026-11-20",
          expectedDischargeDate: "2026-11-22",
          diagnosis: "Migraine under evaluation",
          status: "Admitted",
        });

      assert.equal(admRes.status, 201);
      recepAdmId = admRes.body.data.id;
    });

    test("6. Receptionist can view prescriptions but CANNOT perform restricted mutations", async () => {
      // View prescriptions
      const viewRes = await request(app)
        .get("/api/v1/prescriptions")
        .set("Cookie", receptionistCookie);
      assert.equal(viewRes.status, 200, "Receptionist can view prescriptions (200)");

      // CANNOT create prescription
      const createRx = await request(app)
        .post("/api/v1/prescriptions")
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          patientId: recepPatientId,
          doctorId: doctor2Profile.id,
          diagnosis: "Unauthorized attempt",
        });
      assert.equal(createRx.status, 403, "Receptionist cannot create prescription (403)");

      // CANNOT add item
      const addItem = await request(app)
        .post("/api/v1/prescriptions/1/items")
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({ medicationName: "Unauth Med", dosage: "10mg" });
      assert.equal(addItem.status, 403, "Receptionist cannot add prescription item (403)");
    });

    test("7. Receptionist can view medical records but CANNOT perform restricted mutations", async () => {
      // View medical records
      const viewRes = await request(app)
        .get("/api/v1/medical-records")
        .set("Cookie", receptionistCookie);
      assert.equal(viewRes.status, 200, "Receptionist can view medical records (200)");

      // CANNOT create medical record
      const createMr = await request(app)
        .post("/api/v1/medical-records")
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          patientId: recepPatientId,
          doctorId: doctor2Profile.id,
          diagnosis: "Unauthorized medical record",
        });
      assert.equal(createMr.status, 403, "Receptionist cannot create medical record (403)");
    });

    test("8. Receptionist can perform permitted billing/payment operations", async () => {
      // Create invoice
      const invRes = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          patientId: recepPatientId,
          appointmentId: recepApptId,
          admissionId: recepAdmId,
          discount: 0,
          tax: 0,
          items: [{ description: "Initial Outpatient Registration", quantity: 1, unitPrice: 75.0 }],
        });

      assert.equal(invRes.status, 201, "Receptionist can create invoices (201)");
      recepInvoiceId = invRes.body.data.id;

      // Add item
      const addItemRes = await request(app)
        .post(`/api/v1/billing/invoices/${recepInvoiceId}/items`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({ description: "Administrative File Processing", quantity: 1, unitPrice: 25.0 });
      assert.ok(
        [200, 201].includes(addItemRes.status),
        `Expected 200 or 201 for adding invoice item, got ${addItemRes.status}`
      );

      // Record payment
      const payRes = await request(app)
        .post(`/api/v1/billing/invoices/${recepInvoiceId}/payments`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({
          amount: 100.0,
          paymentMethod: "CASH",
          referenceNumber: "CASH-RECEP-1",
          notes: "Paid at front desk",
        });

      assert.equal(payRes.status, 201, "Receptionist can record payments (201)");
      assert.equal(payRes.body.data.invoice.status, "PAID");
    });

    test("9. Receptionist cannot perform Admin-only operations", async () => {
      // Delete patient (admin only)
      const delPat = await request(app)
        .delete(`/api/v1/patients/${recepPatientId}`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf);
      assert.equal(delPat.status, 403, "Receptionist cannot delete patient (403)");

      // Cancel invoice (admin only)
      const cancelInv = await request(app)
        .post(`/api/v1/billing/invoices/${recepInvoiceId}/cancel`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({ reason: "Unauth cancel" });
      assert.equal(cancelInv.status, 403, "Receptionist cannot cancel invoice (403)");
    });

    test("10-11. Receptionist logout works & protected resources reject access after logout", async () => {
      const recepLogout = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf);
      assert.equal(recepLogout.status, 200);

      const meCheck = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", receptionistCookie);
      assert.equal(meCheck.status, 401);

      // Re-login to keep receptionistCookie valid
      const reLogin = await loginTestUser(receptionistUser.username, testPassword);
      receptionistCookie = reLogin.cookie;
      receptionistCsrf = reLogin.csrfToken;
    });
  });

  // =========================================================================
  // 4. CROSS-MODULE DATA INTEGRITY & MISMATCH VALIDATION
  // =========================================================================
  describe("4. Cross-Module Data Integrity & Mismatch Validation", () => {
    test("Non-existent patient ID is rejected across Appointment, Prescription, Medical Record, and Invoice", async () => {
      const nonExistentId = 9999999;

      // Appointment
      const apptRes = await request(app)
        .post("/api/v1/appointments")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: nonExistentId,
          doctorId: doctor1Profile.id,
          appointmentDate: "2026-12-01",
          appointmentTime: "10:00",
          reason: "Invalid patient appointment",
        });
      assert.equal(apptRes.status, 500); // Foreign key constraint violation caught safely

      // Prescription
      const rxRes = await request(app)
        .post("/api/v1/prescriptions")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: nonExistentId,
          doctorId: doctor1Profile.id,
          diagnosis: "Invalid patient prescription",
        });
      assert.ok(
        [400, 404].includes(rxRes.status),
        `Expected 400 or 404 for non-existent patient on prescription, got ${rxRes.status}`
      );
      assert.ok(rxRes.body.message.toLowerCase().includes("patient"));

      // Medical Record
      const mrRes = await request(app)
        .post("/api/v1/medical-records")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: nonExistentId,
          doctorId: doctor1Profile.id,
          diagnosis: "Invalid patient medical record",
        });
      assert.ok(
        [400, 404].includes(mrRes.status),
        `Expected 400 or 404 for non-existent patient on medical record, got ${mrRes.status}`
      );
      assert.ok(mrRes.body.message.toLowerCase().includes("patient"));

      // Invoice
      const invRes = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: nonExistentId,
          items: [{ description: "Test", quantity: 1, unitPrice: 10 }],
        });
      assert.ok(
        [400, 404].includes(invRes.status),
        `Expected 400 or 404 for non-existent patient on invoice, got ${invRes.status}`
      );
      assert.ok(invRes.body.message.toLowerCase().includes("patient"));
    });

    test("Cross-patient mismatch validation: Appointment belonging to Patient A cannot be linked to Invoice for Patient B", async () => {
      // Create appointment for Patient A
      const apptA = await request(app)
        .post("/api/v1/appointments")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: patientA.id,
          doctorId: doctor1Profile.id,
          appointmentDate: "2026-12-05",
          appointmentTime: "11:00",
          reason: "Appointment for Patient A",
        });
      assert.equal(apptA.status, 201);
      const apptAId = apptA.body.data.id;

      // Try creating invoice for Patient B with Patient A's appointment
      const mismatchInv = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: patientB.id,
          appointmentId: apptAId,
          items: [{ description: "Mismatched consult", quantity: 1, unitPrice: 50 }],
        });

      assert.equal(mismatchInv.status, 400, "Mismatched appointment must be rejected with HTTP 400");
      assert.ok(mismatchInv.body.message.toLowerCase().includes("patient"));
    });

    test("Cross-patient mismatch validation: Admission belonging to Patient A cannot be linked to Invoice for Patient B", async () => {
      // Create admission for Patient A
      const admA = await request(app)
        .post("/api/v1/admissions")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: patientA.id,
          doctorId: doctor1Profile.id,
          roomNumber: "202",
          bedNumber: "A",
          admissionDate: "2026-12-05",
          expectedDischargeDate: "2026-12-07",
          diagnosis: "Admission for Patient A",
          status: "Admitted",
        });
      assert.equal(admA.status, 201);
      const admAId = admA.body.data.id;

      // Try creating invoice for Patient B with Patient A's admission
      const mismatchInv = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: patientB.id,
          admissionId: admAId,
          items: [{ description: "Mismatched admission room", quantity: 1, unitPrice: 100 }],
        });

      assert.equal(mismatchInv.status, 400, "Mismatched admission must be rejected with HTTP 400");
      assert.ok(mismatchInv.body.message.toLowerCase().includes("patient"));
    });

    test("Patient data isolation: Invoices and prescriptions for Patient A do NOT leak into Patient B queries", async () => {
      const pAInvoices = await request(app)
        .get(`/api/v1/billing/invoices?patientId=${patientA.id}`)
        .set("Cookie", adminCookie);
      assert.equal(pAInvoices.status, 200);

      // Verify every invoice returned strictly belongs to Patient A
      for (const inv of pAInvoices.body.data) {
        assert.equal(Number(inv.patientId), Number(patientA.id));
      }

      const pBInvoices = await request(app)
        .get(`/api/v1/billing/invoices?patientId=${patientB.id}`)
        .set("Cookie", adminCookie);
      assert.equal(pBInvoices.status, 200);

      for (const inv of pBInvoices.body.data) {
        assert.equal(Number(inv.patientId), Number(patientB.id));
      }
    });
  });

  // =========================================================================
  // 5. AUTHENTICATION & SESSION LIFECYCLE E2E
  // =========================================================================
  describe("5. Authentication & Session Lifecycle E2E", () => {
    test("Unauthenticated requests to protected endpoints return HTTP 401", async () => {
      const endpoints = [
        ["get", "/api/v1/patients"],
        ["get", "/api/v1/doctors"],
        ["get", "/api/v1/appointments"],
        ["get", "/api/v1/admissions"],
        ["get", "/api/v1/prescriptions"],
        ["get", "/api/v1/medical-records"],
        ["get", "/api/v1/billing/invoices"],
        ["get", "/api/v1/staff"],
      ];

      for (const [method, ep] of endpoints) {
        const res = await request(app)[method](ep);
        assert.equal(res.status, 401, `Unauthenticated request to ${ep} must return HTTP 401`);
        assert.equal(res.body.success, false);
      }
    });

    test("Valid login returns sanitized user profile without password or hash", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: adminUser.username, password: testPassword });

      assert.equal(loginRes.status, 200);
      assert.ok(loginRes.body.data.id);
      assert.ok(loginRes.body.data.username);
      assert.ok(loginRes.body.data.role);

      // CRITICAL: Ensure password and password_hash are NEVER exposed
      assert.equal(loginRes.body.data.password, undefined);
      assert.equal(loginRes.body.data.password_hash, undefined);
      assert.equal(loginRes.body.data.passwordHash, undefined);

      // Verify no JWT was introduced
      assert.equal(loginRes.body.token, undefined);
      assert.equal(loginRes.body.accessToken, undefined);
      assert.equal(loginRes.body.jwt, undefined);
    });

    test("Session cookie retains security configuration (HttpOnly, SameSite)", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: adminUser.username, password: testPassword });

      const setCookie = loginRes.headers["set-cookie"];
      assert.ok(setCookie && setCookie.length > 0);
      const sidCookie = setCookie.find((c) => c.startsWith("hms_sid="));
      assert.ok(sidCookie, "Session cookie hms_sid must exist");
      const cookieStr = sidCookie;

      assert.ok(cookieStr.toLowerCase().includes("httponly"), "Session cookie must be HttpOnly");
      assert.ok(cookieStr.toLowerCase().includes("samesite=lax"), "Session cookie must have SameSite=lax");
      assert.ok(cookieStr.startsWith("hms_sid="), "Session cookie name must be hms_sid");
    });
  });

  // =========================================================================
  // 6. RBAC & OBJECT-LEVEL AUTHORIZATION E2E
  // =========================================================================
  describe("6. RBAC & Object-Level Authorization E2E", () => {
    test("Role-based endpoint restriction table verification", async () => {
      // 1. DELETE /patients/:id — Admin only
      const delPatRecep = await request(app)
        .delete(`/api/v1/patients/${patientB.id}`)
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf);
      assert.equal(delPatRecep.status, 403, "Receptionist cannot DELETE patient");

      // 2. POST /prescriptions — Admin and Doctor only (Receptionist 403)
      const postRxRecep = await request(app)
        .post("/api/v1/prescriptions")
        .set("Cookie", receptionistCookie)
        .send({ patientId: patientA.id, doctorId: doctor1Profile.id, diagnosis: "Test" });
      assert.equal(postRxRecep.status, 403, "Receptionist cannot POST prescription");

      // 3. POST /medical-records — Admin and Doctor only (Receptionist 403)
      const postMrRecep = await request(app)
        .post("/api/v1/medical-records")
        .set("Cookie", receptionistCookie)
        .send({ patientId: patientA.id, doctorId: doctor1Profile.id, diagnosis: "Test" });
      assert.equal(postMrRecep.status, 403, "Receptionist cannot POST medical record");

      // 4. POST /billing/invoices — Admin and Receptionist only (Doctor 403)
      const postInvDoc = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", doctor1Cookie)
        .send({ patientId: patientA.id, items: [{ description: "Doc", quantity: 1, unitPrice: 10 }] });
      assert.equal(postInvDoc.status, 403, "Doctor cannot POST invoice");

      // 5. POST /billing/invoices/:id/cancel — Admin only (Receptionist 403, Doctor 403)
      const cancelInvRecep = await request(app)
        .post("/api/v1/billing/invoices/1/cancel")
        .set("Cookie", receptionistCookie)
        .set("X-CSRF-Token", receptionistCsrf)
        .send({ reason: "Unauth cancel" });
      assert.equal(cancelInvRecep.status, 403, "Receptionist cannot CANCEL invoice");
    });
  });

  // =========================================================================
  // 7. NEGATIVE E2E TESTING & ERROR SAFETY
  // =========================================================================
  describe("7. Negative E2E Testing & Error Safety", () => {
    test("Invalid login credentials return generic 401 without exposing account existence", async () => {
      // Wrong password
      const wrongPassRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: adminUser.username, password: "IncorrectPassword!" });
      assert.equal(wrongPassRes.status, 401);
      assert.equal(wrongPassRes.body.success, false);
      assert.ok(wrongPassRes.body.message.toLowerCase().includes("invalid"));

      // Non-existent user
      const nonUserRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: "non_existent_username_xyz", password: "SomePassword123!" });
      assert.equal(nonUserRes.status, 401);
      assert.equal(nonUserRes.body.success, false);
      assert.ok(nonUserRes.body.message.toLowerCase().includes("invalid"));
    });

    test("Financial calculation safeguards: Negative payment, zero payment, and overpayment rejected", async () => {
      // Create pending invoice
      const invRes = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: patientA.id,
          discount: 0,
          tax: 0,
          items: [{ description: "Financial Safeguard Check", quantity: 1, unitPrice: 100.0 }],
        });
      assert.equal(invRes.status, 201);
      const invId = invRes.body.data.id;

      // Negative payment rejected
      const negPay = await request(app)
        .post(`/api/v1/billing/invoices/${invId}/payments`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({ amount: -25.0, paymentMethod: "CASH" });
      assert.equal(negPay.status, 400);

      // Zero payment rejected
      const zeroPay = await request(app)
        .post(`/api/v1/billing/invoices/${invId}/payments`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({ amount: 0, paymentMethod: "CASH" });
      assert.equal(zeroPay.status, 400);

      // Overpayment rejected (Total is 100, paying 101)
      const overPay = await request(app)
        .post(`/api/v1/billing/invoices/${invId}/payments`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({ amount: 101.0, paymentMethod: "CASH" });
      assert.equal(overPay.status, 400);
      assert.ok(overPay.body.message.toLowerCase().includes("exceed"));
    });

    test("Cannot cancel an invoice that already has recorded payments", async () => {
      // Create invoice & make partial payment
      const invRes = await request(app)
        .post("/api/v1/billing/invoices")
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .set("X-CSRF-Token", adminCsrf)
        .send({
          patientId: patientA.id,
          items: [{ description: "Cancellation check", quantity: 1, unitPrice: 200.0 }],
        });
      const invId = invRes.body.data.id;

      await request(app)
        .post(`/api/v1/billing/invoices/${invId}/payments`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({ amount: 50.0, paymentMethod: "CASH" });

      // Admin attempts cancellation on invoice with payment
      const cancelRes = await request(app)
        .post(`/api/v1/billing/invoices/${invId}/cancel`)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrf)
        .send({ reason: "Attempt cancel on paid invoice" });

      assert.equal(cancelRes.status, 400, "Cannot cancel invoice with recorded payment (400)");
    });

    test("Error responses do NOT leak stack traces, database credentials, or internal paths", async () => {
      const res = await request(app)
        .get("/api/v1/patients/99999999")
        .set("Cookie", adminCookie);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.equal(typeof res.body.message, "string");
      assert.equal(res.body.stack, undefined, "Stack trace must not be exposed in JSON response");
      assert.equal(res.body.sql, undefined, "Raw SQL must not be exposed in JSON response");
    });
  });
});
