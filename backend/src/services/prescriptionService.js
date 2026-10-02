const { pool } = require("../config/db");
const auditService = require("./auditService");

/**
 * Supported Enum Constants for Prescriptions
 */
const ALLOWED_STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"];

/**
 * Internal Helper: Validate item input fields against schema rules
 */
function validateItemFields(item) {
  const medicineName = item.medicineName || item.medicine_name;
  const dosage = item.dosage;
  const frequency = item.frequency;
  const duration = item.duration;
  const quantity = item.quantity;

  if (!medicineName || typeof medicineName !== "string" || medicineName.trim().length === 0) {
    const error = new Error("Medicine name is required and cannot be empty");
    error.statusCode = 400;
    throw error;
  }

  if (!dosage || typeof dosage !== "string" || dosage.trim().length === 0) {
    const error = new Error("Dosage is required and cannot be empty");
    error.statusCode = 400;
    throw error;
  }

  if (!frequency || typeof frequency !== "string" || frequency.trim().length === 0) {
    const error = new Error("Frequency is required and cannot be empty");
    error.statusCode = 400;
    throw error;
  }

  if (!duration || typeof duration !== "string" || duration.trim().length === 0) {
    const error = new Error("Duration is required and cannot be empty");
    error.statusCode = 400;
    throw error;
  }

  if (quantity !== undefined && quantity !== null) {
    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      const error = new Error("Quantity must be a positive integer");
      error.statusCode = 400;
      throw error;
    }
  }
}

/**
 * Get composite prescription details by ID
 * Includes patient, doctor, appointment, and item list.
 */
async function getPrescriptionById(id) {
  const numericId = Number(id);
  if (!numericId || Number.isNaN(numericId)) {
    return null;
  }

  const pRes = await pool.query(
    `SELECT
      rx.id,
      rx.prescription_number AS "prescriptionNumber",
      rx.patient_id AS "patientId",
      p.patient_id AS "patientCode",
      p.name AS "patientName",
      p.age AS "patientAge",
      p.gender AS "patientGender",
      p.phone AS "patientPhone",
      p.email AS "patientEmail",
      p.blood_group AS "patientBloodGroup",
      rx.doctor_id AS "doctorId",
      d.doctor_id AS "doctorCode",
      d.name AS "doctorName",
      d.specialization AS "doctorSpecialization",
      d.department AS "doctorDepartment",
      d.department AS "department",
      d.email AS "doctorEmail",
      d.phone AS "doctorPhone",
      rx.appointment_id AS "appointmentId",
      a.appointment_id AS "appointmentCode",
      a.appointment_date AS "appointmentDate",
      rx.prescription_date AS "prescriptionDate",
      rx.diagnosis_notes AS "diagnosisNotes",
      rx.status,
      rx.created_by AS "createdBy",
      rx.created_at AS "createdAt",
      rx.updated_at AS "updatedAt"
    FROM prescriptions rx
    INNER JOIN patients p ON rx.patient_id = p.id
    INNER JOIN doctors d ON rx.doctor_id = d.id
    LEFT JOIN appointments a ON rx.appointment_id = a.id
    WHERE rx.id = $1`,
    [numericId]
  );

  if (pRes.rows.length === 0) {
    return null;
  }

  const prescription = pRes.rows[0];

  const itemsRes = await pool.query(
    `SELECT
      id,
      prescription_id AS "prescriptionId",
      medicine_name AS "medicineName",
      dosage,
      frequency,
      duration,
      quantity,
      instructions,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM prescription_items
    WHERE prescription_id = $1
    ORDER BY id ASC`,
    [numericId]
  );

  prescription.items = itemsRes.rows;
  return prescription;
}

/**
 * List prescriptions with filtering and search capabilities
 */
async function getPrescriptions(filters = {}) {
  const {
    patientId,
    patient_id,
    doctorId,
    doctor_id,
    appointmentId,
    appointment_id,
    status,
    date,
    prescriptionDate,
    prescription_date,
    search,
    page = 1,
    limit = 20,
  } = filters;

  const targetPatientId = patientId || patient_id;
  const targetDoctorId = doctorId || doctor_id;
  const targetAppointmentId = appointmentId || appointment_id;
  const targetDate = date || prescriptionDate || prescription_date;

  const whereClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  if (targetPatientId) {
    whereClauses.push(`rx.patient_id = $${paramIndex++}`);
    queryParams.push(Number(targetPatientId));
  }

  if (targetDoctorId) {
    whereClauses.push(`rx.doctor_id = $${paramIndex++}`);
    queryParams.push(Number(targetDoctorId));
  }

  if (targetAppointmentId) {
    whereClauses.push(`rx.appointment_id = $${paramIndex++}`);
    queryParams.push(Number(targetAppointmentId));
  }

  if (status) {
    whereClauses.push(`rx.status = $${paramIndex++}`);
    queryParams.push(String(status).toUpperCase());
  }

  if (targetDate) {
    whereClauses.push(`rx.prescription_date = $${paramIndex++}`);
    queryParams.push(targetDate);
  }

  if (search && String(search).trim()) {
    const searchTerm = `%${String(search).trim()}%`;
    whereClauses.push(
      `(rx.prescription_number ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex} OR d.name ILIKE $${paramIndex} OR rx.diagnosis_notes ILIKE $${paramIndex} OR EXISTS (SELECT 1 FROM prescription_items pi WHERE pi.prescription_id = rx.id AND pi.medicine_name ILIKE $${paramIndex}))`
    );
    queryParams.push(searchTerm);
    paramIndex++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const countQuery = `
    SELECT COUNT(DISTINCT rx.id) AS total
    FROM prescriptions rx
    INNER JOIN patients p ON rx.patient_id = p.id
    INNER JOIN doctors d ON rx.doctor_id = d.id
    LEFT JOIN appointments a ON rx.appointment_id = a.id
    ${whereSql}
  `;

  const countRes = await pool.query(countQuery, queryParams);
  const totalRecords = parseInt(countRes.rows[0]?.total || 0, 10);

  const dataQuery = `
    SELECT
      rx.id,
      rx.prescription_number AS "prescriptionNumber",
      rx.patient_id AS "patientId",
      p.patient_id AS "patientCode",
      p.name AS "patientName",
      rx.doctor_id AS "doctorId",
      d.doctor_id AS "doctorCode",
      d.name AS "doctorName",
      d.specialization AS "doctorSpecialization",
      rx.appointment_id AS "appointmentId",
      a.appointment_id AS "appointmentCode",
      rx.prescription_date AS "prescriptionDate",
      rx.diagnosis_notes AS "diagnosisNotes",
      rx.status,
      rx.created_by AS "createdBy",
      rx.created_at AS "createdAt",
      rx.updated_at AS "updatedAt",
      (SELECT COUNT(*)::int FROM prescription_items pi WHERE pi.prescription_id = rx.id) AS "itemsCount"
    FROM prescriptions rx
    INNER JOIN patients p ON rx.patient_id = p.id
    INNER JOIN doctors d ON rx.doctor_id = d.id
    LEFT JOIN appointments a ON rx.appointment_id = a.id
    ${whereSql}
    ORDER BY rx.id DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  queryParams.push(limitNum, offset);

  const dataRes = await pool.query(dataQuery, queryParams);

  return {
    data: dataRes.rows,
    pagination: {
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalRecords / limitNum) || 1,
    },
  };
}

/**
 * Create a new prescription with optional line items in a single transaction
 */
async function createPrescription(data = {}, userContext = {}) {
  const patientId = Number(data.patientId || data.patient_id);
  const doctorId = Number(data.doctorId || data.doctor_id);
  const appointmentId = data.appointmentId || data.appointment_id ? Number(data.appointmentId || data.appointment_id) : null;
  const prescriptionDate = data.prescriptionDate || data.prescription_date || null;
  const diagnosisNotes = data.diagnosisNotes || data.diagnosis_notes || null;
  const initialStatus = (data.status || "ACTIVE").toUpperCase();
  const items = Array.isArray(data.items) ? data.items : [];

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

  if (!ALLOWED_STATUSES.includes(initialStatus)) {
    const error = new Error(`Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  // 1. Check patient existence
  const patCheck = await pool.query("SELECT id FROM patients WHERE id = $1", [patientId]);
  if (patCheck.rows.length === 0) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Check doctor existence
  const docCheck = await pool.query("SELECT id FROM doctors WHERE id = $1", [doctorId]);
  if (docCheck.rows.length === 0) {
    const error = new Error("Doctor not found");
    error.statusCode = 404;
    throw error;
  }

  // 3. Check appointment validity if provided
  if (appointmentId) {
    const apptCheck = await pool.query("SELECT id, patient_id, doctor_id FROM appointments WHERE id = $1", [appointmentId]);
    if (apptCheck.rows.length === 0) {
      const error = new Error("Appointment not found");
      error.statusCode = 404;
      throw error;
    }
    const appt = apptCheck.rows[0];
    if (Number(appt.patient_id) !== patientId) {
      const error = new Error("Appointment belongs to a different patient");
      error.statusCode = 400;
      throw error;
    }
    if (Number(appt.doctor_id) !== doctorId) {
      const error = new Error("Appointment belongs to a different doctor");
      error.statusCode = 400;
      throw error;
    }
  }

  // 4. Validate items upfront before opening transaction
  for (const item of items) {
    validateItemFields(item);
  }

  const createdBy = userContext.userId || userContext.id || data.createdBy || data.created_by || null;

  const client = await pool.connect();
  let createdPrescriptionId = null;

  try {
    await client.query("BEGIN");

    const insertRxRes = await client.query(
      `INSERT INTO prescriptions (
        patient_id,
        doctor_id,
        appointment_id,
        prescription_date,
        diagnosis_notes,
        status,
        created_by
      ) VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, $6, $7)
      RETURNING id`,
      [
        patientId,
        doctorId,
        appointmentId,
        prescriptionDate,
        diagnosisNotes,
        initialStatus,
        createdBy,
      ]
    );

    createdPrescriptionId = insertRxRes.rows[0].id;

    for (const item of items) {
      const medicineName = (item.medicineName || item.medicine_name).trim();
      const dosage = item.dosage.trim();
      const frequency = item.frequency.trim();
      const duration = item.duration.trim();
      const quantity = item.quantity ? Number(item.quantity) : null;
      const instructions = item.instructions || null;

      await client.query(
        `INSERT INTO prescription_items (
          prescription_id,
          medicine_name,
          dosage,
          frequency,
          duration,
          quantity,
          instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          createdPrescriptionId,
          medicineName,
          dosage,
          frequency,
          duration,
          quantity,
          instructions,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await auditService.logAuditEvent({
    eventType: "PRESCRIPTION_CREATED",
    userId: userContext.userId || userContext.id || null,
    role: userContext.role || null,
    action: "CREATE",
    resourceType: "PRESCRIPTION",
    resourceId: createdPrescriptionId,
    outcome: "SUCCESS",
  });

  return getPrescriptionById(createdPrescriptionId);
}

/**
 * Update an existing prescription metadata / diagnosis notes / status
 */
async function updatePrescription(id, updateData = {}, userContext = {}) {
  const numericId = Number(id);
  if (!numericId || Number.isNaN(numericId)) {
    const error = new Error("Invalid prescription ID");
    error.statusCode = 400;
    throw error;
  }

  const existingRes = await pool.query("SELECT * FROM prescriptions WHERE id = $1", [numericId]);
  if (existingRes.rows.length === 0) {
    const error = new Error("Prescription not found");
    error.statusCode = 404;
    throw error;
  }

  const existing = existingRes.rows[0];

  if (existing.status === "CANCELLED") {
    const error = new Error("Cannot modify a cancelled prescription");
    error.statusCode = 400;
    throw error;
  }

  const newStatus = updateData.status ? String(updateData.status).toUpperCase() : existing.status;
  if (updateData.status && !ALLOWED_STATUSES.includes(newStatus)) {
    const error = new Error(`Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  if (existing.status === "COMPLETED" && newStatus === "ACTIVE") {
    const error = new Error("Cannot revert a completed prescription back to active");
    error.statusCode = 400;
    throw error;
  }

  const diagnosisNotes = updateData.diagnosisNotes !== undefined ? updateData.diagnosisNotes : (updateData.diagnosis_notes !== undefined ? updateData.diagnosis_notes : existing.diagnosis_notes);
  const prescriptionDate = updateData.prescriptionDate || updateData.prescription_date || existing.prescription_date;

  await pool.query(
    `UPDATE prescriptions
     SET diagnosis_notes = $1,
         prescription_date = $2,
         status = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [diagnosisNotes, prescriptionDate, newStatus, numericId]
  );

  await auditService.logAuditEvent({
    eventType: "PRESCRIPTION_UPDATED",
    userId: userContext.userId || userContext.id || null,
    role: userContext.role || null,
    action: "UPDATE",
    resourceType: "PRESCRIPTION",
    resourceId: numericId,
    outcome: "SUCCESS",
  });

  return getPrescriptionById(numericId);
}

/**
 * Safely cancel a prescription
 */
async function cancelPrescription(id, userContext = {}) {
  const numericId = Number(id);
  if (!numericId || Number.isNaN(numericId)) {
    const error = new Error("Invalid prescription ID");
    error.statusCode = 400;
    throw error;
  }

  const existingRes = await pool.query("SELECT * FROM prescriptions WHERE id = $1", [numericId]);
  if (existingRes.rows.length === 0) {
    const error = new Error("Prescription not found");
    error.statusCode = 404;
    throw error;
  }

  const existing = existingRes.rows[0];

  if (existing.status === "CANCELLED") {
    const error = new Error("Prescription is already cancelled");
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    `UPDATE prescriptions
     SET status = 'CANCELLED',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [numericId]
  );

  await auditService.logAuditEvent({
    eventType: "PRESCRIPTION_CANCELLED",
    userId: userContext.userId || userContext.id || null,
    role: userContext.role || null,
    action: "UPDATE",
    resourceType: "PRESCRIPTION",
    resourceId: numericId,
    outcome: "SUCCESS",
  });

  return getPrescriptionById(numericId);
}

/**
 * Add a line item to an active prescription
 */
async function addPrescriptionItem(prescriptionId, itemData = {}, userContext = {}) {
  const numericRxId = Number(prescriptionId);
  if (!numericRxId || Number.isNaN(numericRxId)) {
    const error = new Error("Invalid prescription ID");
    error.statusCode = 400;
    throw error;
  }

  const rxRes = await pool.query("SELECT * FROM prescriptions WHERE id = $1", [numericRxId]);
  if (rxRes.rows.length === 0) {
    const error = new Error("Prescription not found");
    error.statusCode = 404;
    throw error;
  }

  const rx = rxRes.rows[0];
  if (rx.status === "CANCELLED") {
    const error = new Error("Cannot add items to a cancelled prescription");
    error.statusCode = 400;
    throw error;
  }

  if (rx.status === "COMPLETED") {
    const error = new Error("Cannot add items to a completed prescription");
    error.statusCode = 400;
    throw error;
  }

  validateItemFields(itemData);

  const medicineName = (itemData.medicineName || itemData.medicine_name).trim();
  const dosage = itemData.dosage.trim();
  const frequency = itemData.frequency.trim();
  const duration = itemData.duration.trim();
  const quantity = itemData.quantity ? Number(itemData.quantity) : null;
  const instructions = itemData.instructions || null;

  const itemRes = await pool.query(
    `INSERT INTO prescription_items (
      prescription_id,
      medicine_name,
      dosage,
      frequency,
      duration,
      quantity,
      instructions
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [numericRxId, medicineName, dosage, frequency, duration, quantity, instructions]
  );

  const createdItemId = itemRes.rows[0].id;

  await auditService.logAuditEvent({
    eventType: "PRESCRIPTION_ITEM_ADDED",
    userId: userContext.userId || userContext.id || null,
    role: userContext.role || null,
    action: "CREATE",
    resourceType: "PRESCRIPTION_ITEM",
    resourceId: createdItemId,
    outcome: "SUCCESS",
  });

  return getPrescriptionById(numericRxId);
}

/**
 * Update an item on an active prescription
 */
async function updatePrescriptionItem(itemId, itemData = {}, userContext = {}) {
  const numericItemId = Number(itemId);
  if (!numericItemId || Number.isNaN(numericItemId)) {
    const error = new Error("Invalid prescription item ID");
    error.statusCode = 400;
    throw error;
  }

  const itemRes = await pool.query(
    `SELECT pi.*, rx.status AS prescription_status, rx.doctor_id AS rx_doctor_id
     FROM prescription_items pi
     INNER JOIN prescriptions rx ON pi.prescription_id = rx.id
     WHERE pi.id = $1`,
    [numericItemId]
  );

  if (itemRes.rows.length === 0) {
    const error = new Error("Prescription item not found");
    error.statusCode = 404;
    throw error;
  }

  const item = itemRes.rows[0];

  if (userContext.role === "doctor" && userContext.doctorId) {
    if (Number(item.rx_doctor_id) !== Number(userContext.doctorId)) {
      const error = new Error("Access denied: Doctors can only modify items on their own prescriptions");
      error.statusCode = 403;
      throw error;
    }
  }

  if (item.prescription_status === "CANCELLED") {
    const error = new Error("Cannot modify items on a cancelled prescription");
    error.statusCode = 400;
    throw error;
  }

  if (item.prescription_status === "COMPLETED") {
    const error = new Error("Cannot modify items on a completed prescription");
    error.statusCode = 400;
    throw error;
  }

  const mergedItem = {
    medicineName: itemData.medicineName || itemData.medicine_name || item.medicine_name,
    dosage: itemData.dosage !== undefined ? itemData.dosage : item.dosage,
    frequency: itemData.frequency !== undefined ? itemData.frequency : item.frequency,
    duration: itemData.duration !== undefined ? itemData.duration : item.duration,
    quantity: itemData.quantity !== undefined ? itemData.quantity : item.quantity,
    instructions: itemData.instructions !== undefined ? itemData.instructions : item.instructions,
  };

  validateItemFields(mergedItem);

  const medicineName = mergedItem.medicineName.trim();
  const dosage = mergedItem.dosage.trim();
  const frequency = mergedItem.frequency.trim();
  const duration = mergedItem.duration.trim();
  const quantity = mergedItem.quantity ? Number(mergedItem.quantity) : null;
  const instructions = mergedItem.instructions || null;

  await pool.query(
    `UPDATE prescription_items
     SET medicine_name = $1,
         dosage = $2,
         frequency = $3,
         duration = $4,
         quantity = $5,
         instructions = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [medicineName, dosage, frequency, duration, quantity, instructions, numericItemId]
  );

  await auditService.logAuditEvent({
    eventType: "PRESCRIPTION_ITEM_UPDATED",
    userId: userContext.userId || userContext.id || null,
    role: userContext.role || null,
    action: "UPDATE",
    resourceType: "PRESCRIPTION_ITEM",
    resourceId: numericItemId,
    outcome: "SUCCESS",
  });

  return getPrescriptionById(item.prescription_id);
}

/**
 * Remove an item from an active prescription
 */
async function removePrescriptionItem(itemId, userContext = {}) {
  const numericItemId = Number(itemId);
  if (!numericItemId || Number.isNaN(numericItemId)) {
    const error = new Error("Invalid prescription item ID");
    error.statusCode = 400;
    throw error;
  }

  const itemRes = await pool.query(
    `SELECT pi.*, rx.status AS prescription_status, rx.doctor_id AS rx_doctor_id
     FROM prescription_items pi
     INNER JOIN prescriptions rx ON pi.prescription_id = rx.id
     WHERE pi.id = $1`,
    [numericItemId]
  );

  if (itemRes.rows.length === 0) {
    const error = new Error("Prescription item not found");
    error.statusCode = 404;
    throw error;
  }

  const item = itemRes.rows[0];

  if (userContext.role === "doctor" && userContext.doctorId) {
    if (Number(item.rx_doctor_id) !== Number(userContext.doctorId)) {
      const error = new Error("Access denied: Doctors can only remove items from their own prescriptions");
      error.statusCode = 403;
      throw error;
    }
  }

  if (item.prescription_status === "CANCELLED") {
    const error = new Error("Cannot remove items from a cancelled prescription");
    error.statusCode = 400;
    throw error;
  }

  if (item.prescription_status === "COMPLETED") {
    const error = new Error("Cannot remove items from a completed prescription");
    error.statusCode = 400;
    throw error;
  }

  await pool.query("DELETE FROM prescription_items WHERE id = $1", [numericItemId]);

  await auditService.logAuditEvent({
    eventType: "PRESCRIPTION_ITEM_REMOVED",
    userId: userContext.userId || userContext.id || null,
    role: userContext.role || null,
    action: "DELETE",
    resourceType: "PRESCRIPTION_ITEM",
    resourceId: numericItemId,
    outcome: "SUCCESS",
  });

  return getPrescriptionById(item.prescription_id);
}

module.exports = {
  createPrescription,
  getPrescriptions,
  getAllPrescriptions: getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  cancelPrescription,
  addPrescriptionItem,
  updatePrescriptionItem,
  removePrescriptionItem,
};
