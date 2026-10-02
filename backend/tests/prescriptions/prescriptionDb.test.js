const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { getTestPool, isTestDbConfigured, closeTestDb } = require("../helpers/testDb");

describe("Prescriptions Database Schema Tests", () => {
  let pool;
  let testUser, testPatient, testDoctor;

  before(async () => {
    if (!isTestDbConfigured()) return;
    pool = getTestPool();

    // Create test dependencies
    const userRes = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active) 
       VALUES ('Prescription Admin', 'rx_admin', 'rx_admin@test.local', 'hash', 'admin', true) 
       RETURNING id`
    );
    testUser = userRes.rows[0];

    const docRes = await pool.query(
      `INSERT INTO doctors (doctor_id, name, specialization, phone, status) 
       VALUES ('DR-RX', 'Dr. RX Test', 'General', '555-RX01', 'Active') 
       RETURNING id`
    );
    testDoctor = docRes.rows[0];

    const patRes = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, phone, blood_group, status) 
       VALUES ('PT-RX', 'RX Patient', 30, 'Male', '555-RX02', 'O+', 'Active') 
       RETURNING id`
    );
    testPatient = patRes.rows[0];
  });

  after(async () => {
    if (!pool) return;
    await pool.query("DELETE FROM prescription_items");
    await pool.query("DELETE FROM prescriptions");
    if (testPatient) await pool.query("DELETE FROM patients WHERE id = $1", [testPatient.id]);
    if (testDoctor) await pool.query("DELETE FROM doctors WHERE id = $1", [testDoctor.id]);
    if (testUser) await pool.query("DELETE FROM users WHERE id = $1", [testUser.id]);
    await closeTestDb();
  });

  test("1-2. prescriptions and prescription_items tables exist", async () => {
    if (!pool) return;
    const res = await pool.query("SELECT to_regclass('public.prescriptions') as p, to_regclass('public.prescription_items') as pi");
    assert.ok(res.rows[0].p);
    assert.ok(res.rows[0].pi);
  });

  test("3. primary keys and generation work", async () => {
    if (!pool) return;
    const res = await pool.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, diagnosis_notes) 
       VALUES ($1, $2, 'Test notes') RETURNING id, prescription_number`,
      [testPatient.id, testDoctor.id]
    );
    assert.ok(res.rows[0].id > 0);
    assert.match(res.rows[0].prescription_number, /^RX-\d{6}$/);

    const itemRes = await pool.query(
      `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, quantity) 
       VALUES ($1, 'Test Med', '10mg', 'Daily', '7 days', 14) RETURNING id`,
      [res.rows[0].id]
    );
    assert.ok(itemRes.rows[0].id > 0);
  });

  test("4, 7, 8. foreign keys and invalid references are rejected", async () => {
    if (!pool) return;
    await assert.rejects(
      pool.query(`INSERT INTO prescriptions (patient_id, doctor_id) VALUES (999999, $1)`, [testDoctor.id]),
      /violates foreign key constraint/
    );
    await assert.rejects(
      pool.query(`INSERT INTO prescriptions (patient_id, doctor_id) VALUES ($1, 999999)`, [testPatient.id]),
      /violates foreign key constraint/
    );
  });

  test("5. prescription_number uniqueness works", async () => {
    if (!pool) return;
    await assert.rejects(
      pool.query(`INSERT INTO prescriptions (patient_id, doctor_id, prescription_number) VALUES ($1, $2, 'RX-000001'), ($1, $2, 'RX-000001')`, [testPatient.id, testDoctor.id]),
      /duplicate key value violates unique constraint/
    );
  });

  test("6. invalid status is rejected", async () => {
    if (!pool) return;
    await assert.rejects(
      pool.query(`INSERT INTO prescriptions (patient_id, doctor_id, status) VALUES ($1, $2, 'INVALID_STATUS')`, [testPatient.id, testDoctor.id]),
      /violates check constraint/
    );
  });

  test("9. invalid prescription_item reference is rejected", async () => {
    if (!pool) return;
    await assert.rejects(
      pool.query(`INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration) VALUES (999999, 'Test Med', '10mg', 'Daily', '7 days')`),
      /violates foreign key constraint/
    );
  });

  test("10. required fields are enforced", async () => {
    if (!pool) return;
    const res = await pool.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, diagnosis_notes) 
       VALUES ($1, $2, 'Test notes') RETURNING id`,
      [testPatient.id, testDoctor.id]
    );
    await assert.rejects(
      pool.query(`INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration) VALUES ($1, '  ', '10mg', 'Daily', '7 days')`, [res.rows[0].id]),
      /violates check constraint/
    );
  });
});
