const { pool } = require("../config/db");

// Get all admissions
async function getAllAdmissions() {
  const result = await pool.query(`
    SELECT
      a.id,
      a.admission_id as "admissionId",
      a.patient_id as "patientId",
      p.patient_id as "patientCode",
      p.name as "patientName",
      a.doctor_id as "doctorId",
      d.doctor_id as "doctorCode",
      d.name as "doctorName",
      a.room_number as "roomNumber",
      a.bed_number as "bedNumber",
      a.admission_date as "admissionDate",
      a.expected_discharge_date as "expectedDischargeDate",
      a.actual_discharge_date as "actualDischargeDate",
      a.diagnosis,
      a.status,
      a.created_at as "createdAt",
      a.updated_at as "updatedAt"
    FROM admissions a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    ORDER BY a.admission_date DESC
  `);

  return result.rows;
}

// Get admission by ID
async function getAdmissionById(id) {
  const result = await pool.query(
    `
    SELECT
      a.id,
      a.admission_id as "admissionId",
      a.patient_id as "patientId",
      p.patient_id as "patientCode",
      p.name as "patientName",
      a.doctor_id as "doctorId",
      d.doctor_id as "doctorCode",
      d.name as "doctorName",
      a.room_number as "roomNumber",
      a.bed_number as "bedNumber",
      a.admission_date as "admissionDate",
      a.expected_discharge_date as "expectedDischargeDate",
      a.actual_discharge_date as "actualDischargeDate",
      a.diagnosis,
      a.status,
      a.created_at as "createdAt",
      a.updated_at as "updatedAt"
    FROM admissions a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.id = $1
  `,
    [Number(id)]
  );

  return result.rows[0] || null;
}

// Create an admission
async function createAdmission(admissionData) {
  const {
    patientId,
    doctorId,
    roomNumber,
    bedNumber,
    admissionDate,
    expectedDischargeDate,
    actualDischargeDate,
    diagnosis,
    status,
  } = admissionData;

  const result = await pool.query(
    `
    INSERT INTO admissions (
      admission_id,
      patient_id,
      doctor_id,
      room_number,
      bed_number,
      admission_date,
      expected_discharge_date,
      actual_discharge_date,
      diagnosis,
      status
    )
    VALUES ('TEMP', $1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `,
    [
      Number(patientId),
      Number(doctorId),
      roomNumber,
      bedNumber,
      admissionDate,
      expectedDischargeDate || null,
      actualDischargeDate || null,
      diagnosis,
      status || "Admitted",
    ]
  );

  const admission = result.rows[0];
  const admissionId = `ADM${String(admission.id).padStart(3, "0")}`;

  await pool.query(
    `
    UPDATE admissions
    SET
      admission_id = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `,
    [admissionId, admission.id]
  );

  return getAdmissionById(admission.id);
}

// Update an admission
async function updateAdmission(id, admissionData, requiredDoctorId = null) {
  const {
    patientId,
    doctorId,
    roomNumber,
    bedNumber,
    admissionDate,
    expectedDischargeDate,
    actualDischargeDate,
    diagnosis,
    status,
  } = admissionData;

  const result = await pool.query(
    `
    UPDATE admissions
    SET
      patient_id = COALESCE($1, patient_id),
      doctor_id = COALESCE($2, doctor_id),
      room_number = COALESCE($3, room_number),
      bed_number = COALESCE($4, bed_number),
      admission_date = COALESCE($5, admission_date),
      expected_discharge_date = COALESCE($6, expected_discharge_date),
      actual_discharge_date = COALESCE($7, actual_discharge_date),
      diagnosis = COALESCE($8, diagnosis),
      status = COALESCE($9, status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $10
      AND ($11::integer IS NULL OR doctor_id = $11)
    RETURNING id
  `,
    [
      patientId ? Number(patientId) : null,
      doctorId ? Number(doctorId) : null,
      roomNumber || null,
      bedNumber || null,
      admissionDate || null,
      expectedDischargeDate || null,
      actualDischargeDate || null,
      diagnosis || null,
      status || null,
      Number(id),
      requiredDoctorId !== null && requiredDoctorId !== undefined
        ? Number(requiredDoctorId)
        : null,
    ]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getAdmissionById(result.rows[0].id);
}

// Delete an admission
async function deleteAdmission(id) {
  const result = await pool.query(
    `
    DELETE FROM admissions
    WHERE id = $1
    RETURNING id
  `,
    [Number(id)]
  );

  return result.rows[0] || null;
}

module.exports = {
  getAllAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
};
