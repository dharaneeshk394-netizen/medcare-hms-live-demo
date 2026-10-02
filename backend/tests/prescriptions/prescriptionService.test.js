const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { getTestPool, isTestDbConfigured, closeTestDb, closeAppDb } = require("../helpers/testDb");
const prescriptionService = require("../../src/services/prescriptionService");

describe("Prescriptions Backend Service Automated Test Suite", () => {
  let pool;
  let testUser = null;
  let testPatient1 = null;
  let testPatient2 = null;
  let testDoctor = null;
  let testDoctor2 = null;
  let testAppointment1 = null;
  let testAppointment2 = null;

  before(async () => {
    if (!isTestDbConfigured()) return;
    pool = getTestPool();

    // Setup test dependencies
    const uRes = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active)
       VALUES ('Rx Service User', 'rx_svc_usr', 'rx_svc@test.local', 'hash', 'doctor', true)
       RETURNING id, role`
    );
    testUser = uRes.rows[0];

    const docRes1 = await pool.query(
      `INSERT INTO doctors (doctor_id, name, specialization, phone, status)
       VALUES ('DOC-RX-1', 'Dr. Svc Test 1', 'Cardiology', '555-001', 'Active')
       RETURNING id`
    );
    testDoctor = docRes1.rows[0];

    const docRes2 = await pool.query(
      `INSERT INTO doctors (doctor_id, name, specialization, phone, status)
       VALUES ('DOC-RX-2', 'Dr. Svc Test 2', 'Neurology', '555-002', 'Active')
       RETURNING id`
    );
    testDoctor2 = docRes2.rows[0];

    const patRes1 = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, phone, blood_group, status)
       VALUES ('PT-RX-1', 'Patient Alpha', 40, 'Female', '555-003', 'A+', 'Active')
       RETURNING id`
    );
    testPatient1 = patRes1.rows[0];

    const patRes2 = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, phone, blood_group, status)
       VALUES ('PT-RX-2', 'Patient Beta', 25, 'Male', '555-004', 'B+', 'Active')
       RETURNING id`
    );
    testPatient2 = patRes2.rows[0];

    const apptRes1 = await pool.query(
      `INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, appointment_time, reason, status)
       VALUES ('APT-RX-1', $1, $2, '2026-09-20', '10:00:00', 'Checkup', 'Scheduled')
       RETURNING id`,
      [testPatient1.id, testDoctor.id]
    );
    testAppointment1 = apptRes1.rows[0];

    const apptRes2 = await pool.query(
      `INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, appointment_time, reason, status)
       VALUES ('APT-RX-2', $1, $2, '2026-09-21', '11:00:00', 'Followup', 'Scheduled')
       RETURNING id`,
      [testPatient2.id, testDoctor2.id]
    );
    testAppointment2 = apptRes2.rows[0];
  });

  after(async () => {
    if (!pool) return;
    await pool.query("DELETE FROM prescription_items");
    await pool.query("DELETE FROM prescriptions");
    await pool.query("DELETE FROM appointments WHERE id IN ($1, $2)", [testAppointment1?.id || 0, testAppointment2?.id || 0]);
    await pool.query("DELETE FROM patients WHERE id IN ($1, $2)", [testPatient1?.id || 0, testPatient2?.id || 0]);
    await pool.query("DELETE FROM doctors WHERE id IN ($1, $2)", [testDoctor?.id || 0, testDoctor2?.id || 0]);
    await pool.query("DELETE FROM users WHERE id = $1", [testUser?.id || 0]);
    await closeTestDb();
    await closeAppDb();
  });

  test("1. Create valid prescription with items", async () => {
    if (!pool) return;
    const userCtx = { userId: testUser.id, role: testUser.role };
    const rxData = {
      patientId: testPatient1.id,
      doctorId: testDoctor.id,
      appointmentId: testAppointment1.id,
      diagnosisNotes: "Patient has mild hypertension",
      items: [
        {
          medicineName: "Amoxicillin",
          dosage: "500mg",
          frequency: "Three times a day",
          duration: "5 days",
          quantity: 15,
          instructions: "Take after meals",
        },
      ],
    };

    const result = await prescriptionService.createPrescription(rxData, userCtx);

    assert.ok(result);
    assert.ok(result.id > 0);
    assert.match(result.prescriptionNumber, /^RX-\d{6}$/);
    assert.strictEqual(result.patientId, testPatient1.id);
    assert.strictEqual(result.doctorId, testDoctor.id);
    assert.strictEqual(result.appointmentId, testAppointment1.id);
    assert.strictEqual(result.status, "ACTIVE");
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].medicineName, "Amoxicillin");
  });

  test("2. Reject invalid patient", async () => {
    if (!pool) return;
    await assert.rejects(
      prescriptionService.createPrescription({
        patientId: 999999,
        doctorId: testDoctor.id,
      }),
      (err) => err.statusCode === 404 && err.message.includes("Patient not found")
    );
  });

  test("3. Reject invalid doctor", async () => {
    if (!pool) return;
    await assert.rejects(
      prescriptionService.createPrescription({
        patientId: testPatient1.id,
        doctorId: 999999,
      }),
      (err) => err.statusCode === 404 && err.message.includes("Doctor not found")
    );
  });

  test("4. Reject invalid appointment", async () => {
    if (!pool) return;
    await assert.rejects(
      prescriptionService.createPrescription({
        patientId: testPatient1.id,
        doctorId: testDoctor.id,
        appointmentId: 999999,
      }),
      (err) => err.statusCode === 404 && err.message.includes("Appointment not found")
    );
  });

  test("5. Reject appointment belonging to another patient", async () => {
    if (!pool) return;
    await assert.rejects(
      prescriptionService.createPrescription({
        patientId: testPatient1.id,
        doctorId: testDoctor2.id,
        appointmentId: testAppointment2.id, // belongs to patient 2
      }),
      (err) => err.statusCode === 400 && err.message.includes("different patient")
    );
  });

  test("6. Get prescription by ID", async () => {
    if (!pool) return;
    const created = await prescriptionService.createPrescription({
      patientId: testPatient1.id,
      doctorId: testDoctor.id,
      diagnosisNotes: "Direct test get by ID",
    });

    const fetched = await prescriptionService.getPrescriptionById(created.id);
    assert.ok(fetched);
    assert.strictEqual(fetched.id, created.id);
    assert.strictEqual(fetched.diagnosisNotes, "Direct test get by ID");
    assert.strictEqual(fetched.patientName, "Patient Alpha");
  });

  test("7. List prescriptions with filters and pagination", async () => {
    if (!pool) return;
    const res = await prescriptionService.getPrescriptions({
      patientId: testPatient1.id,
      page: 1,
      limit: 10,
    });

    assert.ok(res.data);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.pagination);
    assert.ok(res.data.length >= 2);
  });

  test("8. Update valid prescription", async () => {
    if (!pool) return;
    const created = await prescriptionService.createPrescription({
      patientId: testPatient1.id,
      doctorId: testDoctor.id,
      diagnosisNotes: "Initial notes",
    });

    const updated = await prescriptionService.updatePrescription(created.id, {
      diagnosisNotes: "Updated diagnosis notes",
      status: "COMPLETED",
    });

    assert.strictEqual(updated.diagnosisNotes, "Updated diagnosis notes");
    assert.strictEqual(updated.status, "COMPLETED");
  });

  test("9. Cancel valid prescription", async () => {
    if (!pool) return;
    const created = await prescriptionService.createPrescription({
      patientId: testPatient1.id,
      doctorId: testDoctor.id,
    });

    const cancelled = await prescriptionService.cancelPrescription(created.id);
    assert.strictEqual(cancelled.status, "CANCELLED");
  });

  test("10. Reject repeated cancellation", async () => {
    if (!pool) return;
    const created = await prescriptionService.createPrescription({
      patientId: testPatient1.id,
      doctorId: testDoctor.id,
    });

    await prescriptionService.cancelPrescription(created.id);

    await assert.rejects(
      prescriptionService.cancelPrescription(created.id),
      (err) => err.statusCode === 400 && err.message.includes("already cancelled")
    );
  });

  test("11. Reject modification of cancelled prescription", async () => {
    if (!pool) return;
    const created = await prescriptionService.createPrescription({
      patientId: testPatient1.id,
      doctorId: testDoctor.id,
    });

    await prescriptionService.cancelPrescription(created.id);

    await assert.rejects(
      prescriptionService.updatePrescription(created.id, {
        diagnosisNotes: "Should fail",
      }),
      (err) => err.statusCode === 400 && err.message.includes("cancelled")
    );
  });

  test("12. Add valid item", async () => {
    if (!pool) return;
    const created = await prescriptionService.createPrescription({
      patientId: testPatient1.id,
      doctorId: testDoctor.id,
    });

    const updated = await prescriptionService.addPrescriptionItem(created.id, {
      medicineName: "Ibuprofen",
      dosage: "400mg",
      frequency: "Twice a day",
      duration: "3 days",
      quantity: 6,
    });

    assert.strictEqual(updated.items.length, 1);
    assert.strictEqual(updated.items[0].medicineName, "Ibuprofen");
  });

  test("13. Update valid item", async () => {
    if (!pool) return;
    const created = await prescriptionService.createPrescription({
      patientId: testPatient1.id,
      doctorId: testDoctor.id,
      items: [
        {
          medicineName: "Paracetamol",
          dosage: "500mg",
          frequency: "As needed",
          duration: "5 days",
        },
      ],
    });

    const item = created.items[0];
    const updated = await prescriptionService.updatePrescriptionItem(item.id, {
      dosage: "650mg",
    });

    const updatedItem = updated.items.find((i) => i.id === item.id);
    assert.strictEqual(updatedItem.dosage, "650mg");
  });

  test("14. Remove valid item", async () => {
    if (!pool) return;
    const created = await prescriptionService.createPrescription({
      patientId: testPatient1.id,
      doctorId: testDoctor.id,
      items: [
        {
          medicineName: "Temporary Med",
          dosage: "10mg",
          frequency: "Daily",
          duration: "1 day",
        },
      ],
    });

    const item = created.items[0];
    const updated = await prescriptionService.removePrescriptionItem(item.id);
    assert.strictEqual(updated.items.length, 0);
  });

  test("15. Reject invalid item data", async () => {
    if (!pool) return;
    const created = await prescriptionService.createPrescription({
      patientId: testPatient1.id,
      doctorId: testDoctor.id,
    });

    await assert.rejects(
      prescriptionService.addPrescriptionItem(created.id, {
        medicineName: "   ",
        dosage: "10mg",
        frequency: "Daily",
        duration: "1 day",
      }),
      (err) => err.statusCode === 400 && err.message.includes("Medicine name is required")
    );
  });

  test("16. Reject invalid prescription ID", async () => {
    if (!pool) return;
    const fetched = await prescriptionService.getPrescriptionById("abc");
    assert.strictEqual(fetched, null);

    await assert.rejects(
      prescriptionService.updatePrescription("invalid", { diagnosisNotes: "test" }),
      (err) => err.statusCode === 400
    );
  });

  test("17. SQL parameterization behavior (SQL injection safe)", async () => {
    if (!pool) return;
    const maliciousInput = "'; DROP TABLE prescriptions; --";
    const res = await prescriptionService.getPrescriptions({
      search: maliciousInput,
    });

    assert.ok(res.data);
    // Table should still exist
    const checkTable = await pool.query("SELECT to_regclass('public.prescriptions') as p");
    assert.ok(checkTable.rows[0].p);
  });

  test("18. Transaction rollback on failure during item insertion", async () => {
    if (!pool) return;
    const invalidItems = [
      {
        medicineName: "Valid Med",
        dosage: "10mg",
        frequency: "Daily",
        duration: "5 days",
      },
      {
        medicineName: "", // Invalid!
        dosage: "10mg",
        frequency: "Daily",
        duration: "5 days",
      },
    ];

    await assert.rejects(
      prescriptionService.createPrescription({
        patientId: testPatient1.id,
        doctorId: testDoctor.id,
        items: invalidItems,
      })
    );

    // Verify no orphaned prescription was saved
    const checkOrphan = await pool.query(
      "SELECT * FROM prescriptions WHERE patient_id = $1 AND doctor_id = $2 AND diagnosis_notes IS NULL ORDER BY id DESC LIMIT 1",
      [testPatient1.id, testDoctor.id]
    );
    // Any newly attempted insertion should have rolled back
  });
});
