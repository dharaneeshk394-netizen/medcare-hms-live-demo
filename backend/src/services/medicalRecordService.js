const { pool } = require("../config/db");
const auditService = require("./auditService");

/**
 * Service: getMedicalRecords
 *
 * Retrieves paginated medical records with optional filtering by patient, doctor,
 * appointment, record type, date range, status, and search string.
 *
 * @param {Object} [filters={}]
 * @param {number|string} [filters.patientId]
 * @param {number|string} [filters.doctorId]
 * @param {number|string} [filters.appointmentId]
 * @param {string} [filters.recordType]
 * @param {string} [filters.status]
 * @param {string} [filters.date]
 * @param {string} [filters.startDate]
 * @param {string} [filters.endDate]
 * @param {string} [filters.search]
 * @param {number|string} [filters.page=1]
 * @param {number|string} [filters.limit=10]
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
async function getMedicalRecords(filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const whereClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  if (filters.patientId) {
    whereClauses.push(`mr.patient_id = $${paramIndex++}`);
    queryParams.push(Number(filters.patientId));
  }

  if (filters.doctorId) {
    whereClauses.push(`mr.doctor_id = $${paramIndex++}`);
    queryParams.push(Number(filters.doctorId));
  }

  if (filters.appointmentId) {
    whereClauses.push(`mr.appointment_id = $${paramIndex++}`);
    queryParams.push(Number(filters.appointmentId));
  }

  if (filters.recordType && filters.recordType !== "All") {
    whereClauses.push(`LOWER(mr.record_type) = LOWER($${paramIndex++})`);
    queryParams.push(filters.recordType.trim());
  }

  if (filters.status && filters.status !== "All") {
    whereClauses.push(`UPPER(mr.status) = UPPER($${paramIndex++})`);
    queryParams.push(filters.status.trim());
  }

  if (filters.date) {
    whereClauses.push(`mr.record_date = $${paramIndex++}`);
    queryParams.push(filters.date.trim());
  }

  if (filters.startDate) {
    whereClauses.push(`mr.record_date >= $${paramIndex++}`);
    queryParams.push(filters.startDate.trim());
  }

  if (filters.endDate) {
    whereClauses.push(`mr.record_date <= $${paramIndex++}`);
    queryParams.push(filters.endDate.trim());
  }

  if (filters.search && String(filters.search).trim()) {
    const searchPattern = `%${String(filters.search).trim()}%`;
    whereClauses.push(
      `(mr.record_number ILIKE $${paramIndex} OR mr.diagnosis ILIKE $${paramIndex} OR mr.chief_complaint ILIKE $${paramIndex} OR mr.clinical_notes ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex} OR p.patient_id ILIKE $${paramIndex} OR d.name ILIKE $${paramIndex} OR d.doctor_id ILIKE $${paramIndex})`
    );
    queryParams.push(searchPattern);
    paramIndex++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // 1. Get total matching count
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM medical_records mr
    INNER JOIN patients p ON mr.patient_id = p.id
    INNER JOIN doctors d ON mr.doctor_id = d.id
    ${whereSql}
  `;

  const countResult = await pool.query(countQuery, queryParams);
  const totalItems = parseInt(countResult.rows[0].total, 10) || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  // 2. Fetch paginated records
  const dataQuery = `
    SELECT
      mr.id,
      mr.record_number AS "recordNumber",
      mr.patient_id AS "patientId",
      p.patient_id AS "patientCode",
      p.name AS "patientName",
      p.age AS "patientAge",
      p.gender AS "patientGender",
      mr.doctor_id AS "doctorId",
      d.doctor_id AS "doctorCode",
      d.name AS "doctorName",
      d.specialization AS "doctorSpecialization",
      mr.appointment_id AS "appointmentId",
      a.appointment_id AS "appointmentCode",
      a.appointment_date AS "appointmentDate",
      TO_CHAR(mr.record_date, 'YYYY-MM-DD') AS "recordDate",
      mr.record_type AS "recordType",
      mr.chief_complaint AS "chiefComplaint",
      mr.diagnosis,
      mr.clinical_notes AS "clinicalNotes",
      mr.treatment_plan AS "treatmentPlan",
      mr.status,
      mr.created_by AS "createdBy",
      u.full_name AS "createdByName",
      mr.created_at AS "createdAt",
      mr.updated_at AS "updatedAt"
    FROM medical_records mr
    INNER JOIN patients p ON mr.patient_id = p.id
    INNER JOIN doctors d ON mr.doctor_id = d.id
    LEFT JOIN appointments a ON mr.appointment_id = a.id
    LEFT JOIN users u ON mr.created_by = u.id
    ${whereSql}
    ORDER BY mr.record_date DESC, mr.id DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const dataQueryParams = [...queryParams, limit, offset];
  const dataResult = await pool.query(dataQuery, dataQueryParams);

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  };
}

/**
 * Service: getMedicalRecordById
 *
 * Fetches a single medical record by its primary key ID.
 *
 * @param {number|string} id
 * @returns {Promise<Object|null>}
 */
async function getMedicalRecordById(id) {
  const numericId = Number(id);
  if (!numericId || Number.isNaN(numericId)) {
    return null;
  }

  const query = `
    SELECT
      mr.id,
      mr.record_number AS "recordNumber",
      mr.patient_id AS "patientId",
      p.patient_id AS "patientCode",
      p.name AS "patientName",
      p.age AS "patientAge",
      p.gender AS "patientGender",
      p.phone AS "patientPhone",
      p.blood_group AS "patientBloodGroup",
      mr.doctor_id AS "doctorId",
      d.doctor_id AS "doctorCode",
      d.name AS "doctorName",
      d.specialization AS "doctorSpecialization",
      d.department AS "doctorDepartment",
      mr.appointment_id AS "appointmentId",
      a.appointment_id AS "appointmentCode",
      TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS "appointmentDate",
      a.reason AS "appointmentReason",
      TO_CHAR(mr.record_date, 'YYYY-MM-DD') AS "recordDate",
      mr.record_type AS "recordType",
      mr.chief_complaint AS "chiefComplaint",
      mr.diagnosis,
      mr.clinical_notes AS "clinicalNotes",
      mr.treatment_plan AS "treatmentPlan",
      mr.status,
      mr.created_by AS "createdBy",
      u.full_name AS "createdByName",
      mr.created_at AS "createdAt",
      mr.updated_at AS "updatedAt"
    FROM medical_records mr
    INNER JOIN patients p ON mr.patient_id = p.id
    INNER JOIN doctors d ON mr.doctor_id = d.id
    LEFT JOIN appointments a ON mr.appointment_id = a.id
    LEFT JOIN users u ON mr.created_by = u.id
    WHERE mr.id = $1
  `;

  const result = await pool.query(query, [numericId]);
  return result.rows[0] || null;
}

/**
 * Service: createMedicalRecord
 *
 * Creates a new medical record following relationship checks:
 * 1. Verify patient exists
 * 2. Verify doctor exists
 * 3. Verify appointment exists (if supplied) and matches patientId and doctorId
 *
 * @param {Object} data
 * @param {Object} [userContext={}]
 * @returns {Promise<Object>} Created medical record
 */
async function createMedicalRecord(data, userContext = {}) {
  const patientId = Number(data.patientId || data.patient_id);
  const doctorId = Number(data.doctorId || data.doctor_id);
  const appointmentId = data.appointmentId || data.appointment_id ? Number(data.appointmentId || data.appointment_id) : null;
  const recordDate = data.recordDate || data.record_date || new Date().toISOString().slice(0, 10);
  const recordType = (data.recordType || data.record_type || "General").trim();
  const chiefComplaint = data.chiefComplaint || data.chief_complaint ? String(data.chiefComplaint || data.chief_complaint).trim() : null;
  const diagnosis = String(data.diagnosis || "").trim();
  const clinicalNotes = data.clinicalNotes || data.clinical_notes ? String(data.clinicalNotes || data.clinical_notes).trim() : null;
  const treatmentPlan = data.treatmentPlan || data.treatment_plan ? String(data.treatmentPlan || data.treatment_plan).trim() : null;
  const status = (data.status || "ACTIVE").trim().toUpperCase();
  const createdBy = userContext.userId || null;

  if (!patientId || Number.isNaN(patientId)) {
    const error = new Error("Valid patient ID is required");
    error.statusCode = 400;
    throw error;
  }

  if (!doctorId || Number.isNaN(doctorId)) {
    const error = new Error("Valid doctor ID is required");
    error.statusCode = 400;
    throw error;
  }

  if (!diagnosis) {
    const error = new Error("Diagnosis is required");
    error.statusCode = 400;
    throw error;
  }

  // 1. Verify patient existence
  const patCheck = await pool.query("SELECT id FROM patients WHERE id = $1", [patientId]);
  if (patCheck.rows.length === 0) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Verify doctor existence
  const docCheck = await pool.query("SELECT id FROM doctors WHERE id = $1", [doctorId]);
  if (docCheck.rows.length === 0) {
    const error = new Error("Doctor not found");
    error.statusCode = 404;
    throw error;
  }

  // 3. Verify appointment existence & relationship consistency if supplied
  if (appointmentId) {
    const apptCheck = await pool.query(
      "SELECT id, patient_id, doctor_id FROM appointments WHERE id = $1",
      [appointmentId]
    );
    if (apptCheck.rows.length === 0) {
      const error = new Error("Appointment not found");
      error.statusCode = 404;
      throw error;
    }

    const appt = apptCheck.rows[0];
    if (Number(appt.patient_id) !== patientId) {
      const error = new Error("Appointment patient ID does not match the specified patient ID");
      error.statusCode = 400;
      throw error;
    }

    if (Number(appt.doctor_id) !== doctorId) {
      const error = new Error("Appointment doctor ID does not match the specified doctor ID");
      error.statusCode = 400;
      throw error;
    }
  }

  // Insert medical record
  const insertQuery = `
    INSERT INTO medical_records (
      patient_id,
      doctor_id,
      appointment_id,
      record_date,
      record_type,
      chief_complaint,
      diagnosis,
      clinical_notes,
      treatment_plan,
      status,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `;

  const insertResult = await pool.query(insertQuery, [
    patientId,
    doctorId,
    appointmentId,
    recordDate,
    recordType,
    chiefComplaint,
    diagnosis,
    clinicalNotes,
    treatmentPlan,
    status,
    createdBy,
  ]);

  const newRecordId = insertResult.rows[0].id;

  auditService.logAuditEvent({
    eventType: "MEDICAL_RECORD_CREATE",
    userId: userContext.userId || null,
    role: userContext.role || null,
    action: "CREATE",
    resourceType: "MEDICAL_RECORD",
    resourceId: newRecordId,
    outcome: "SUCCESS",
  });

  return await getMedicalRecordById(newRecordId);
}

/**
 * Service: updateMedicalRecord
 *
 * Updates editable clinical fields of an existing medical record.
 * Patient and Doctor references remain protected from reassignment.
 *
 * @param {number|string} id
 * @param {Object} data
 * @param {Object} [userContext={}]
 * @returns {Promise<Object>} Updated medical record
 */
async function updateMedicalRecord(id, data, userContext = {}) {
  const numericId = Number(id);
  if (!numericId || Number.isNaN(numericId)) {
    const error = new Error("Valid medical record ID is required");
    error.statusCode = 400;
    throw error;
  }

  const existing = await getMedicalRecordById(numericId);
  if (!existing) {
    const error = new Error("Medical record not found");
    error.statusCode = 404;
    throw error;
  }

  if (userContext.role === "doctor" && userContext.doctorId) {
    if (Number(existing.doctorId) !== Number(userContext.doctorId)) {
      const error = new Error("Access denied: Doctors can only manage their own medical records.");
      error.statusCode = 403;
      throw error;
    }
  }

  const updates = [];
  const queryParams = [numericId];
  let paramIndex = 2;

  if (data.recordDate || data.record_date) {
    updates.push(`record_date = $${paramIndex++}`);
    queryParams.push(String(data.recordDate || data.record_date).trim());
  }

  if (data.recordType || data.record_type) {
    updates.push(`record_type = $${paramIndex++}`);
    queryParams.push(String(data.recordType || data.record_type).trim());
  }

  if (data.chiefComplaint !== undefined || data.chief_complaint !== undefined) {
    const val = data.chiefComplaint !== undefined ? data.chiefComplaint : data.chief_complaint;
    updates.push(`chief_complaint = $${paramIndex++}`);
    queryParams.push(val ? String(val).trim() : null);
  }

  if (data.diagnosis !== undefined) {
    const val = String(data.diagnosis || "").trim();
    if (!val) {
      const error = new Error("Diagnosis cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    updates.push(`diagnosis = $${paramIndex++}`);
    queryParams.push(val);
  }

  if (data.clinicalNotes !== undefined || data.clinical_notes !== undefined) {
    const val = data.clinicalNotes !== undefined ? data.clinicalNotes : data.clinical_notes;
    updates.push(`clinical_notes = $${paramIndex++}`);
    queryParams.push(val ? String(val).trim() : null);
  }

  if (data.treatmentPlan !== undefined || data.treatment_plan !== undefined) {
    const val = data.treatmentPlan !== undefined ? data.treatmentPlan : data.treatment_plan;
    updates.push(`treatment_plan = $${paramIndex++}`);
    queryParams.push(val ? String(val).trim() : null);
  }

  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    queryParams.push(String(data.status).trim().toUpperCase());
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const updateQuery = `
    UPDATE medical_records
    SET ${updates.join(", ")}
    WHERE id = $1
  `;

  await pool.query(updateQuery, queryParams);

  auditService.logAuditEvent({
    eventType: "MEDICAL_RECORD_UPDATE",
    userId: userContext.userId || null,
    role: userContext.role || null,
    action: "UPDATE",
    resourceType: "MEDICAL_RECORD",
    resourceId: numericId,
    outcome: "SUCCESS",
  });

  return await getMedicalRecordById(numericId);
}

/**
 * Service: archiveMedicalRecord
 *
 * Sets medical record status to ARCHIVED.
 *
 * @param {number|string} id
 * @param {Object} [userContext={}]
 * @returns {Promise<Object>} Archived medical record
 */
async function archiveMedicalRecord(id, userContext = {}) {
  return await updateMedicalRecord(id, { status: "ARCHIVED" }, userContext);
}

module.exports = {
  getMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  archiveMedicalRecord,
};
