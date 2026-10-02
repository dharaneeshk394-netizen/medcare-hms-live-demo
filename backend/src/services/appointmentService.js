const { pool } = require("../config/db");

// Get all appointments
async function getAllAppointments() {
  const result = await pool.query(`
    SELECT
      a.id,
      a.appointment_id AS "appointmentId",
      a.patient_id AS "patientId",
      p.patient_id AS "patientCode",
      p.name AS "patientName",
      a.doctor_id AS "doctorId",
      d.doctor_id AS "doctorCode",
      d.name AS "doctorName",
      d.specialization,
      a.appointment_date AS "appointmentDate",
      a.appointment_time AS "appointmentTime",
      a.reason,
      a.status,
      a.created_at AS "createdAt",
      a.updated_at AS "updatedAt"
    FROM appointments a
    INNER JOIN patients p ON a.patient_id = p.id
    INNER JOIN doctors d ON a.doctor_id = d.id
    ORDER BY a.appointment_date ASC, a.appointment_time ASC
  `);

  return result.rows;
}

// Get one appointment by ID
async function getAppointmentById(id) {
  const result = await pool.query(
    `
      SELECT
        a.id,
        a.appointment_id AS "appointmentId",
        a.patient_id AS "patientId",
        p.patient_id AS "patientCode",
        p.name AS "patientName",
        a.doctor_id AS "doctorId",
        d.doctor_id AS "doctorCode",
        d.name AS "doctorName",
        d.specialization,
        a.appointment_date AS "appointmentDate",
        a.appointment_time AS "appointmentTime",
        a.reason,
        a.status,
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt"
      FROM appointments a
      INNER JOIN patients p ON a.patient_id = p.id
      INNER JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = $1
    `,
    [Number(id)]
  );

  return result.rows[0] || null;
}

// Create an appointment
async function createAppointment(appointmentData) {
  const {
    patientId,
    doctorId,
    appointmentDate,
    appointmentTime,
    reason,
    status = "Scheduled",
  } = appointmentData;

  const result = await pool.query(
    `
      INSERT INTO appointments (
        appointment_id,
        patient_id,
        doctor_id,
        appointment_date,
        appointment_time,
        reason,
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
      RETURNING id
    `,
    [
      Number(patientId),
      Number(doctorId),
      appointmentDate,
      appointmentTime,
      reason || null,
      status,
    ]
  );

  const appointment = result.rows[0];

  const appointmentId = `A${String(appointment.id).padStart(3, "0")}`;

  await pool.query(
    `
      UPDATE appointments
      SET
        appointment_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
    [appointmentId, appointment.id]
  );

  return getAppointmentById(appointment.id);
}

// Update an appointment (supports optional requiredDoctorId constraint)
async function updateAppointment(id, appointmentData, requiredDoctorId = null) {
  const {
    patientId,
    doctorId,
    appointmentDate,
    appointmentTime,
    reason,
    status,
  } = appointmentData;

  const numericRequiredDoctorId =
    requiredDoctorId !== null && requiredDoctorId !== undefined
      ? Number(requiredDoctorId)
      : null;

  const result = await pool.query(
    `
      UPDATE appointments
      SET
        patient_id = COALESCE($1, patient_id),
        doctor_id = COALESCE($2, doctor_id),
        appointment_date = COALESCE($3, appointment_date),
        appointment_time = COALESCE($4, appointment_time),
        reason = COALESCE($5, reason),
        status = COALESCE($6, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
        AND ($8::integer IS NULL OR doctor_id = $8)
      RETURNING id
    `,
    [
      patientId ?? null,
      doctorId ?? null,
      appointmentDate ?? null,
      appointmentTime ?? null,
      reason ?? null,
      status ?? null,
      Number(id),
      numericRequiredDoctorId,
    ]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getAppointmentById(result.rows[0].id);
}

// Delete an appointment
async function deleteAppointment(id) {
  const result = await pool.query(
    `
      DELETE FROM appointments
      WHERE id = $1
      RETURNING id
    `,
    [Number(id)]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
  };
}

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
