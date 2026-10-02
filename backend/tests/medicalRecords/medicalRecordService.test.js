const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { getTestPool, isTestDbConfigured, closeTestDb } = require("../helpers/testDb");

// Import service under test
const medicalRecordService = require("../../src/services/medicalRecordService");

describe("Medical Record Service Unit Tests", () => {
  let pool;
  let testUser, testPatient, testDoctor, testAppointment, otherPatient;

  before(async () => {
    if (!isTestDbConfigured()) return;
    pool = getTestPool();

    // Ensure medical_records table
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

    const userRes = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active) 
       VALUES ('MR Service User', 'mr_svc', 'mr_svc@test.local', 'hash', 'doctor', true) 
       RETURNING id`
    );
    testUser = userRes.rows[0];

    const docRes = await pool.query(
      `INSERT INTO doctors (doctor_id, name, specialization, phone, status) 
       VALUES ('DR-SVC', 'Dr. Svc Test', 'Cardiology', '555-SVC1', 'Active') 
       RETURNING id`
    );
    testDoctor = docRes.rows[0];

    const patRes = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, phone, blood_group, status) 
       VALUES ('PT-SVC1', 'Service Patient 1', 50, 'Male', '555-SVC2', 'B+', 'Active') 
       RETURNING id`
    );
    testPatient = patRes.rows[0];

    const pat2Res = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, phone, blood_group, status) 
       VALUES ('PT-SVC2', 'Service Patient 2', 28, 'Female', '555-SVC3', 'O-', 'Active') 
       RETURNING id`
    );
    otherPatient = pat2Res.rows[0];

    const apptRes = await pool.query(
      `INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_date, appointment_time, reason, status)
       VALUES ('A992', $1, $2, CURRENT_DATE, '11:00:00', 'Chest pain evaluation', 'Completed')
       RETURNING id`,
      [testPatient.id, testDoctor.id]
    );
    testAppointment = apptRes.rows[0];
  });

  after(async () => {
    if (!pool) return;
    await pool.query("DELETE FROM medical_records WHERE patient_id IN ($1, $2)", [testPatient?.id, otherPatient?.id]);
    if (testAppointment) await pool.query("DELETE FROM appointments WHERE id = $1", [testAppointment.id]);
    if (testPatient) await pool.query("DELETE FROM patients WHERE id = $1", [testPatient.id]);
    if (otherPatient) await pool.query("DELETE FROM patients WHERE id = $1", [otherPatient.id]);
    if (testDoctor) await pool.query("DELETE FROM doctors WHERE id = $1", [testDoctor.id]);
    if (testUser) await pool.query("DELETE FROM users WHERE id = $1", [testUser.id]);
    await closeTestDb();
  });

  test("1. createMedicalRecord creates record with verified relationships", async () => {
    if (!pool) return;
    const record = await medicalRecordService.createMedicalRecord(
      {
        patientId: testPatient.id,
        doctorId: testDoctor.id,
        appointmentId: testAppointment.id,
        recordType: "Consultation",
        chiefComplaint: "Sharp chest pain on exertion",
        diagnosis: "Angina Pectoris",
        clinicalNotes: "ECG normal, blood pressure elevated 140/90",
        treatmentPlan: "Prescribe Nitroglycerin, schedule stress test",
      },
      { userId: testUser.id, role: "doctor" }
    );

    assert.ok(record);
    assert.equal(Number(record.patientId), testPatient.id);
    assert.equal(Number(record.doctorId), testDoctor.id);
    assert.equal(Number(record.appointmentId), testAppointment.id);
    assert.equal(record.diagnosis, "Angina Pectoris");
    assert.equal(record.recordType, "Consultation");
    assert.match(record.recordNumber, /^MR-\d{6}$/);
  });

  test("2. createMedicalRecord rejects non-existent patient", async () => {
    if (!pool) return;
    await assert.rejects(
      medicalRecordService.createMedicalRecord(
        {
          patientId: 999999,
          doctorId: testDoctor.id,
          diagnosis: "Test Diagnosis",
        },
        { userId: testUser.id, role: "doctor" }
      ),
      (err) => err.statusCode === 404 && err.message.includes("Patient not found")
    );
  });

  test("3. createMedicalRecord rejects appointment patient mismatch", async () => {
    if (!pool) return;
    await assert.rejects(
      medicalRecordService.createMedicalRecord(
        {
          patientId: otherPatient.id, // Appointment belongs to testPatient
          doctorId: testDoctor.id,
          appointmentId: testAppointment.id,
          diagnosis: "Test Diagnosis",
        },
        { userId: testUser.id, role: "doctor" }
      ),
      (err) => err.statusCode === 400 && err.message.includes("Appointment patient ID does not match")
    );
  });

  test("4. getMedicalRecords returns paginated list with filtering", async () => {
    if (!pool) return;
    const result = await medicalRecordService.getMedicalRecords({
      patientId: testPatient.id,
      page: 1,
      limit: 10,
    });

    assert.ok(Array.isArray(result.data));
    assert.ok(result.data.length >= 1);
    assert.equal(result.pagination.page, 1);
  });

  test("5. updateMedicalRecord updates clinical fields", async () => {
    if (!pool) return;
    const list = await medicalRecordService.getMedicalRecords({ patientId: testPatient.id });
    const recordId = list.data[0].id;

    const updated = await medicalRecordService.updateMedicalRecord(
      recordId,
      {
        diagnosis: "Updated Angina Pectoris with Mild Ischemia",
        treatmentPlan: "Updated treatment plan",
      },
      { userId: testUser.id, role: "doctor" }
    );

    assert.equal(updated.diagnosis, "Updated Angina Pectoris with Mild Ischemia");
    assert.equal(updated.treatmentPlan, "Updated treatment plan");
  });

  test("6. archiveMedicalRecord sets status to ARCHIVED", async () => {
    if (!pool) return;
    const list = await medicalRecordService.getMedicalRecords({ patientId: testPatient.id });
    const recordId = list.data[0].id;

    const archived = await medicalRecordService.archiveMedicalRecord(recordId, {
      userId: testUser.id,
      role: "doctor",
    });

    assert.equal(archived.status, "ARCHIVED");
  });
});
