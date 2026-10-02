const { pool } = require("../config/db");

// Get all doctors
async function getAllDoctors() {
  const result = await pool.query(`
    SELECT
      id,
      doctor_id AS "doctorId",
      name,
      specialization,
      phone,
      email,
      department,
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM doctors
    ORDER BY id ASC
  `);

  return result.rows;
}

// Get one doctor by ID
async function getDoctorById(id) {
  const result = await pool.query(
    `
      SELECT
        id,
        doctor_id AS "doctorId",
        name,
        specialization,
        phone,
        email,
        department,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM doctors
      WHERE id = $1
    `,
    [Number(id)]
  );

  return result.rows[0] || null;
}

// Create a doctor
async function createDoctor(doctorData) {
  const {
    name,
    specialization,
    phone,
    email,
    department,
    status = "Active",
  } = doctorData;

  const result = await pool.query(
    `
      INSERT INTO doctors (
        doctor_id,
        name,
        specialization,
        phone,
        email,
        department,
        status
      )
      VALUES (
        'TEMP',
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )
      RETURNING
        id,
        doctor_id AS "doctorId",
        name,
        specialization,
        phone,
        email,
        department,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      name,
      specialization,
      phone,
      email || null,
      department || null,
      status,
    ]
  );

  const doctor = result.rows[0];

  // Generate the final doctor ID using the database ID.
  const doctorId = `D${String(doctor.id).padStart(3, "0")}`;

  const updatedResult = await pool.query(
    `
      UPDATE doctors
      SET
        doctor_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        doctor_id AS "doctorId",
        name,
        specialization,
        phone,
        email,
        department,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [doctorId, doctor.id]
  );

  return updatedResult.rows[0];
}

// Update a doctor
async function updateDoctor(id, doctorData) {
  const {
    name,
    specialization,
    phone,
    email,
    department,
    status,
  } = doctorData;

  const result = await pool.query(
    `
      UPDATE doctors
      SET
        name = COALESCE($1, name),
        specialization = COALESCE($2, specialization),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        department = COALESCE($5, department),
        status = COALESCE($6, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING
        id,
        doctor_id AS "doctorId",
        name,
        specialization,
        phone,
        email,
        department,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      name ?? null,
      specialization ?? null,
      phone ?? null,
      email ?? null,
      department ?? null,
      status ?? null,
      Number(id),
    ]
  );

  return result.rows[0] || null;
}

// Delete a doctor
async function deleteDoctor(id) {
  const result = await pool.query(
    `
      DELETE FROM doctors
      WHERE id = $1
      RETURNING
        id,
        doctor_id AS "doctorId",
        name,
        specialization,
        phone,
        email,
        department,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [Number(id)]
  );

  return result.rows[0] || null;
}

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
};