const { pool } = require("../config/db");

// Get all patients
async function getAllPatients() {
  const result = await pool.query(`
    SELECT
      id,
      patient_id AS "patientId",
      name,
      age,
      gender,
      phone,
      email,
      blood_group AS "bloodGroup",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM patients
    ORDER BY id ASC
  `);

  return result.rows;
}

// Get one patient by ID
async function getPatientById(id) {
  const result = await pool.query(
    `
      SELECT
        id,
        patient_id AS "patientId",
        name,
        age,
        gender,
        phone,
        email,
        blood_group AS "bloodGroup",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM patients
      WHERE id = $1
    `,
    [Number(id)]
  );

  return result.rows[0] || null;
}

// Create a patient
async function createPatient(patientData) {
  const {
    name,
    age,
    gender,
    phone,
    email,
    bloodGroup,
    status = "Active",
  } = patientData;

  const result = await pool.query(
    `
      INSERT INTO patients (
        patient_id,
        name,
        age,
        gender,
        phone,
        email,
        blood_group,
        status
      )
      VALUES (
        'TEMP',
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING
        id,
        patient_id AS "patientId",
        name,
        age,
        gender,
        phone,
        email,
        blood_group AS "bloodGroup",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      name,
      age,
      gender,
      phone,
      email || null,
      bloodGroup || null,
      status,
    ]
  );

  const patient = result.rows[0];

  // Generate the real patient ID after getting the database ID.
  const patientId = `P${String(patient.id).padStart(3, "0")}`;

  const updatedResult = await pool.query(
    `
      UPDATE patients
      SET patient_id = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        patient_id AS "patientId",
        name,
        age,
        gender,
        phone,
        email,
        blood_group AS "bloodGroup",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [patientId, patient.id]
  );

  return updatedResult.rows[0];
}

// Update a patient
async function updatePatient(id, patientData) {
  const {
    name,
    age,
    gender,
    phone,
    email,
    bloodGroup,
    status,
  } = patientData;

  const result = await pool.query(
    `
      UPDATE patients
      SET
        name = COALESCE($1, name),
        age = COALESCE($2, age),
        gender = COALESCE($3, gender),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        blood_group = COALESCE($6, blood_group),
        status = COALESCE($7, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING
        id,
        patient_id AS "patientId",
        name,
        age,
        gender,
        phone,
        email,
        blood_group AS "bloodGroup",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      name ?? null,
      age ?? null,
      gender ?? null,
      phone ?? null,
      email ?? null,
      bloodGroup ?? null,
      status ?? null,
      Number(id),
    ]
  );

  return result.rows[0] || null;
}

// Delete a patient
async function deletePatient(id) {
  const result = await pool.query(
    `
      DELETE FROM patients
      WHERE id = $1
      RETURNING
        id,
        patient_id AS "patientId",
        name,
        age,
        gender,
        phone,
        email,
        blood_group AS "bloodGroup",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [Number(id)]
  );

  return result.rows[0] || null;
}

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};