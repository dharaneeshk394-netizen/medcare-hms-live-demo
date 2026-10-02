const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { getTestPool, isTestDbConfigured, closeTestDb } = require("../helpers/testDb");

describe("Medical Records Database Schema & Constraints Tests", () => {
  let pool;
  let testUser, testPatient, testDoctor, testAppointment;

  before(async () => {
    if (!isTestDbConfigured()) return;
    pool = getTestPool();

    // Ensure medical_records sequences and table exist
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS public.medical_records_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE SEQUENCE IF NOT EXISTS public.medical_record_number_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

      CREATE TABLE IF NOT EXISTS public.medical_records (
        id integer NOT NULL DEFAULT nextval('public.medical_records_id_seq'::regclass),
        record_number character varying(30) NOT NULL DEFAULT ('MR-'::text || lpad((nextval('public.medical_record_number_seq'::regclass))::text, 6, '0'::text)),
        patient_id integer NOT NULL,
        doctor_id integer NOT NULL,
        appointment_id integer,
        record_date date NOT NULL DEFAULT CURRENT_DATE,
        record_type character varying(50) NOT NULL DEFAULT 'General'::character varying,
        chief_complaint text,
        diagnosis text NOT NULL,
        clinical_notes text,
        treatment_plan text,
        status character varying(20) NOT NULL DEFAULT 'ACTIVE'::character varying,
        created_by integer,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT medical_records_pkey PRIMARY KEY (id),
        CONSTRAINT medical_records_record_number_key UNIQUE (record_number),
        CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT,
        CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE RESTRICT,
        CONSTRAINT medical_records_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL,
        CONSTRAINT medical_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT medical_records_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ARCHIVED'::character varying, 'AMENDED'::character varying])::text[])))
      );
    `);

    // Create test dependencies
    const userRes = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active) 
       VALUES ('MR Admin', 'mr_admin', 'mr_admin@test.local', 'hash', 'admin', true) 
       RETURNING id`
    );
    testUser = userRes.rows[0];

    const docRes = await pool.query(
      `INSERT INTO doctors (doctor_id, name, specialization, phone, status) 
       VALUES ('DR-MR01', 'Dr. MR Test', 'Internal Medicine', '555-MR01', 'Active') 
       RETURNING id`
    );
    testDoctor = docRes.rows[0];

    const patRes = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, phone, blood_group, status) 
       VALUES ('PT-MR01', 'MR Patient', 42, 'Female', '555-MR02', 'A+', 'Active') 
       RETURNING id`
    );
    testPatient = patRes.rows[0];

    const apptRes = await pool.query(
      `INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, appointment_time, reason, status)
       VALUES ('A991', $1, $2, CURRENT_DATE, '10:00:00', 'Routine checkup', 'Scheduled')
       RETURNING id`,
      [testPatient.id, testDoctor.id]
    );
    testAppointment = apptRes.rows[0];
  });

  after(async () => {
    if (!pool) return;
    await pool.query("DELETE FROM medical_records WHERE patient_id = $1", [testPatient?.id]);
    if (testAppointment) await pool.query("DELETE FROM appointments WHERE id = $1", [testAppointment.id]);
    if (testPatient) await pool.query("DELETE FROM patients WHERE id = $1", [testPatient.id]);
    if (testDoctor) await pool.query("DELETE FROM doctors WHERE id = $1", [testDoctor.id]);
    if (testUser) await pool.query("DELETE FROM users WHERE id = $1", [testUser.id]);
    await closeTestDb();
  });

  test("1. medical_records table exists", async () => {
    if (!pool) return;
    const res = await pool.query("SELECT to_regclass('public.medical_records') as mr");
    assert.ok(res.rows[0].mr);
  });

  test("2. insertion with auto-generated record_number works", async () => {
    if (!pool) return;
    const res = await pool.query(
      `INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, chief_complaint, created_by)
       VALUES ($1, $2, $3, 'Essential Hypertension', 'Mild headaches', $4)
       RETURNING id, record_number, status`,
      [testPatient.id, testDoctor.id, testAppointment.id, testUser.id]
    );

    assert.ok(res.rows[0].id > 0);
    assert.match(res.rows[0].record_number, /^MR-\d{6}$/);
    assert.equal(res.rows[0].status, "ACTIVE");
  });

  test("3. invalid patient_id reference is rejected by foreign key constraint", async () => {
    if (!pool) return;
    await assert.rejects(
      pool.query(
        `INSERT INTO medical_records (patient_id, doctor_id, diagnosis) VALUES (999999, $1, 'Test')`,
        [testDoctor.id]
      ),
      /violates foreign key constraint/
    );
  });

  test("4. invalid doctor_id reference is rejected by foreign key constraint", async () => {
    if (!pool) return;
    await assert.rejects(
      pool.query(
        `INSERT INTO medical_records (patient_id, doctor_id, diagnosis) VALUES ($1, 999999, 'Test')`,
        [testPatient.id]
      ),
      /violates foreign key constraint/
    );
  });

  test("5. invalid status is rejected by check constraint", async () => {
    if (!pool) return;
    await assert.rejects(
      pool.query(
        `INSERT INTO medical_records (patient_id, doctor_id, diagnosis, status) VALUES ($1, $2, 'Test', 'INVALID_STATUS')`,
        [testPatient.id, testDoctor.id]
      ),
      /violates check constraint/
    );
  });
});
