const { pool } = require("../config/db");
const auditService = require("./auditService");

/**
 * Supported Enum Constants matching PostgreSQL Check Constraints
 */
const ALLOWED_ITEM_TYPES = [
  "Consultation",
  "Room Charge",
  "Procedure",
  "Medication",
  "Lab Test",
  "General",
  "Other",
];

const ALLOWED_PAYMENT_METHODS = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Insurance",
  "Bank Transfer",
  "Online",
  "Other",
];

const ALLOWED_STATUSES = [
  "PENDING",
  "PARTIAL",
  "PAID",
  "CANCELLED",
  "OVERDUE",
];

/**
 * Money Math Helper: Precise two-decimal arithmetic to avoid floating-point imprecision
 */
function roundMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0.0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate line item total price
 */
function calculateLineTotal(quantity, unitPrice) {
  const qty = parseInt(quantity, 10);
  const price = Number(unitPrice);
  return roundMoney(qty * price);
}

/**
 * Internal Helper: Recalculate financial totals and status for an invoice within a transaction.
 *
 * @param {object} client - Checked-out pg transaction client
 * @param {number} invoiceId - Invoice ID
 * @returns {Promise<object>} Updated invoice summary
 */
async function recalculateInvoiceTotals(client, invoiceId) {
  // 1. Calculate sum of line items
  const itemsSumRes = await client.query(
    `SELECT COALESCE(SUM(total_price), 0.00) AS subtotal
     FROM invoice_items
     WHERE invoice_id = $1`,
    [invoiceId]
  );
  const subtotal = roundMoney(itemsSumRes.rows[0]?.subtotal || 0.0);

  // 2. Fetch current discount, tax, due_date, and current status
  const invRes = await client.query(
    `SELECT discount, tax, due_date, status
     FROM invoices
     WHERE id = $1`,
    [invoiceId]
  );
  if (invRes.rows.length === 0) {
    const error = new Error(`Invoice with ID ${invoiceId} not found`);
    error.statusCode = 404;
    throw error;
  }

  const invoice = invRes.rows[0];
  let discount = roundMoney(invoice.discount || 0.0);
  const tax = roundMoney(invoice.tax || 0.0);

  // Enforce discount <= subtotal
  if (discount > subtotal) {
    const error = new Error(
      `Discount (${discount.toFixed(2)}) cannot exceed subtotal (${subtotal.toFixed(2)})`
    );
    error.statusCode = 400;
    throw error;
  }

  const totalAmount = roundMoney(subtotal - discount + tax);

  // 3. Calculate sum of payments
  const paySumRes = await client.query(
    `SELECT COALESCE(SUM(amount), 0.00) AS paid_amount
     FROM payments
     WHERE invoice_id = $1`,
    [invoiceId]
  );
  const paidAmount = roundMoney(paySumRes.rows[0]?.paid_amount || 0.0);
  const balanceAmount = roundMoney(Math.max(0, totalAmount - paidAmount));

  // 4. Calculate status
  let newStatus = invoice.status;
  if (newStatus !== "CANCELLED") {
    if (totalAmount > 0 && paidAmount >= totalAmount) {
      newStatus = "PAID";
    } else if (
      balanceAmount > 0 &&
      invoice.due_date &&
      new Date(invoice.due_date) < new Date(new Date().toISOString().slice(0, 10))
    ) {
      newStatus = "OVERDUE";
    } else if (paidAmount > 0) {
      newStatus = "PARTIAL";
    } else {
      newStatus = "PENDING";
    }
  }

  // 5. Update invoice header
  const updateRes = await client.query(
    `UPDATE invoices
     SET subtotal = $1,
         discount = $2,
         tax = $3,
         total_amount = $4,
         paid_amount = $5,
         balance_amount = $6,
         status = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [
      subtotal.toFixed(2),
      discount.toFixed(2),
      tax.toFixed(2),
      totalAmount.toFixed(2),
      paidAmount.toFixed(2),
      balanceAmount.toFixed(2),
      newStatus,
      invoiceId,
    ]
  );

  return updateRes.rows[0];
}

/**
 * 1. Create a new Invoice with items atomically.
 *
 * @param {object} invoiceData
 * @param {number|null} userId - Authenticated user ID creating the invoice
 * @returns {Promise<object>} Complete invoice details
 */
async function createInvoice(invoiceData, userId = null) {
  const {
    patientId,
    appointmentId = null,
    admissionId = null,
    invoiceDate = null,
    dueDate = null,
    discount = 0.0,
    tax = 0.0,
    billingNotes = null,
    items,
  } = invoiceData;

  // --- Step 1: Input Validation ---
  const numericPatientId = Number(patientId);
  if (!Number.isInteger(numericPatientId) || numericPatientId <= 0) {
    const error = new Error("Patient ID must be a positive integer");
    error.statusCode = 400;
    throw error;
  }

  // Verify patient exists in database
  const patientCheck = await pool.query(
    `SELECT id, patient_id AS "patientCode", name FROM patients WHERE id = $1`,
    [numericPatientId]
  );
  if (patientCheck.rows.length === 0) {
    const error = new Error(`Patient with ID ${numericPatientId} not found`);
    error.statusCode = 404;
    throw error;
  }

  // Validate appointment if provided
  let numericAppointmentId = null;
  if (appointmentId !== null && appointmentId !== undefined && appointmentId !== "") {
    numericAppointmentId = Number(appointmentId);
    if (!Number.isInteger(numericAppointmentId) || numericAppointmentId <= 0) {
      const error = new Error("Appointment ID must be a positive integer");
      error.statusCode = 400;
      throw error;
    }

    const apptCheck = await pool.query(
      `SELECT id, patient_id FROM appointments WHERE id = $1`,
      [numericAppointmentId]
    );
    if (apptCheck.rows.length === 0) {
      const error = new Error(`Appointment with ID ${numericAppointmentId} not found`);
      error.statusCode = 404;
      throw error;
    }
    if (apptCheck.rows[0].patient_id !== numericPatientId) {
      const error = new Error("Appointment does not belong to the specified patient");
      error.statusCode = 400;
      throw error;
    }
  }

  // Validate admission if provided
  let numericAdmissionId = null;
  if (admissionId !== null && admissionId !== undefined && admissionId !== "") {
    numericAdmissionId = Number(admissionId);
    if (!Number.isInteger(numericAdmissionId) || numericAdmissionId <= 0) {
      const error = new Error("Admission ID must be a positive integer");
      error.statusCode = 400;
      throw error;
    }

    const admCheck = await pool.query(
      `SELECT id, patient_id FROM admissions WHERE id = $1`,
      [numericAdmissionId]
    );
    if (admCheck.rows.length === 0) {
      const error = new Error(`Admission with ID ${numericAdmissionId} not found`);
      error.statusCode = 404;
      throw error;
    }
    if (admCheck.rows[0].patient_id !== numericPatientId) {
      const error = new Error("Admission does not belong to the specified patient");
      error.statusCode = 400;
      throw error;
    }
  }

  // Validate items
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("An invoice must contain at least one line item");
    error.statusCode = 400;
    throw error;
  }

  // Validate each item and calculate initial line totals
  const validatedItems = [];
  let calculatedSubtotal = 0.0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const index = i + 1;

    if (!item || typeof item !== "object") {
      const error = new Error(`Item #${index} must be an object`);
      error.statusCode = 400;
      throw error;
    }

    const description = item.description ? String(item.description).trim() : "";
    if (!description || description.length === 0 || description.length > 255) {
      const error = new Error(`Item #${index} description is required and must be under 255 characters`);
      error.statusCode = 400;
      throw error;
    }

    const quantity = parseInt(item.quantity, 10);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error(`Item #${index} quantity must be a positive integer greater than 0`);
      error.statusCode = 400;
      throw error;
    }

    const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : item.unit_price);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      const error = new Error(`Item #${index} unit price must be a non-negative number`);
      error.statusCode = 400;
      throw error;
    }

    let itemType = item.itemType || item.item_type || "General";
    if (typeof itemType === "string") {
      const matched = ALLOWED_ITEM_TYPES.find(
        (t) => t.toLowerCase() === itemType.trim().toLowerCase()
      );
      if (!matched) {
        const error = new Error(
          `Item #${index} item type '${itemType}' is invalid. Allowed types: ${ALLOWED_ITEM_TYPES.join(", ")}`
        );
        error.statusCode = 400;
        throw error;
      }
      itemType = matched;
    } else {
      itemType = "General";
    }

    const totalPrice = calculateLineTotal(quantity, unitPrice);
    calculatedSubtotal = roundMoney(calculatedSubtotal + totalPrice);

    validatedItems.push({
      itemType,
      description,
      quantity,
      unitPrice: roundMoney(unitPrice),
      totalPrice,
    });
  }

  // Validate discount and tax
  const numericDiscount = roundMoney(discount || 0.0);
  if (numericDiscount < 0) {
    const error = new Error("Discount cannot be negative");
    error.statusCode = 400;
    throw error;
  }
  if (numericDiscount > calculatedSubtotal) {
    const error = new Error(
      `Discount (${numericDiscount.toFixed(2)}) cannot exceed invoice subtotal (${calculatedSubtotal.toFixed(2)})`
    );
    error.statusCode = 400;
    throw error;
  }

  const numericTax = roundMoney(tax || 0.0);
  if (numericTax < 0) {
    const error = new Error("Tax cannot be negative");
    error.statusCode = 400;
    throw error;
  }

  const calculatedTotal = roundMoney(calculatedSubtotal - numericDiscount + numericTax);

  // Validate dates if supplied
  let cleanInvoiceDate = invoiceDate;
  if (!cleanInvoiceDate) {
    cleanInvoiceDate = new Date().toISOString().slice(0, 10);
  }

  if (dueDate) {
    if (new Date(dueDate) < new Date(cleanInvoiceDate)) {
      const error = new Error("Due date cannot be earlier than invoice date");
      error.statusCode = 400;
      throw error;
    }
  }

  // --- Step 2: Database Transaction ---
  const client = await pool.connect();
  let createdInvoiceId = null;

  try {
    await client.query("BEGIN");

    // Insert invoice header
    const insertInvoiceRes = await client.query(
      `INSERT INTO invoices (
        patient_id,
        appointment_id,
        admission_id,
        invoice_date,
        due_date,
        subtotal,
        discount,
        tax,
        total_amount,
        paid_amount,
        balance_amount,
        status,
        billing_notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12, $13)
      RETURNING id, invoice_number`,
      [
        numericPatientId,
        numericAppointmentId,
        numericAdmissionId,
        cleanInvoiceDate,
        dueDate || null,
        calculatedSubtotal.toFixed(2),
        numericDiscount.toFixed(2),
        numericTax.toFixed(2),
        calculatedTotal.toFixed(2),
        "0.00",
        calculatedTotal.toFixed(2),
        billingNotes || null,
        userId ? Number(userId) : null,
      ]
    );

    const createdInvoice = insertInvoiceRes.rows[0];
    createdInvoiceId = createdInvoice.id;

    // Insert invoice items
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO invoice_items (
          invoice_id,
          item_type,
          description,
          quantity,
          unit_price,
          total_price
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          createdInvoiceId,
          item.itemType,
          item.description,
          item.quantity,
          item.unitPrice.toFixed(2),
          item.totalPrice.toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // --- Step 3: Audit Logging (after successful COMMIT) ---
  if (createdInvoiceId) {
    auditService.logAuditEvent({
      eventType: "INVOICE_CREATED",
      userId: userId ? Number(userId) : null,
      role: null,
      action: "CREATE",
      resourceType: "INVOICE",
      resourceId: createdInvoiceId,
      outcome: "SUCCESS",
      ipAddress: null,
    });
  }

  return getInvoiceById(createdInvoiceId);
}

/**
 * 2. Get detailed Invoice by ID.
 *
 * @param {number|string} id - Invoice ID
 * @returns {Promise<object|null>} Complete invoice object or null
 */
async function getInvoiceById(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  // Fetch invoice header with patient, appointment, admission, and creator info
  const invoiceRes = await pool.query(
    `SELECT
      i.id,
      i.invoice_number AS "invoiceNumber",
      i.patient_id AS "patientId",
      p.patient_id AS "patientCode",
      p.name AS "patientName",
      p.age AS "patientAge",
      p.gender AS "patientGender",
      p.phone AS "patientPhone",
      p.email AS "patientEmail",
      p.blood_group AS "patientBloodGroup",
      i.appointment_id AS "appointmentId",
      appt.appointment_id AS "appointmentCode",
      appt.appointment_date AS "appointmentDate",
      appt.appointment_time AS "appointmentTime",
      appt_doc.name AS "appointmentDoctorName",
      i.admission_id AS "admissionId",
      adm.admission_id AS "admissionCode",
      adm.room_number AS "admissionRoomNumber",
      adm.bed_number AS "admissionBedNumber",
      adm.admission_date AS "admissionDate",
      adm.actual_discharge_date AS "admissionDischargeDate",
      adm_doc.name AS "admissionDoctorName",
      i.invoice_date AS "invoiceDate",
      i.due_date AS "dueDate",
      i.subtotal,
      i.discount,
      i.tax,
      i.total_amount AS "totalAmount",
      i.paid_amount AS "paidAmount",
      i.balance_amount AS "balanceAmount",
      i.status,
      i.billing_notes AS "billingNotes",
      i.created_by AS "createdBy",
      u.full_name AS "createdByName",
      u.role AS "createdByRole",
      i.created_at AS "createdAt",
      i.updated_at AS "updatedAt"
    FROM invoices i
    JOIN patients p ON i.patient_id = p.id
    LEFT JOIN appointments appt ON i.appointment_id = appt.id
    LEFT JOIN doctors appt_doc ON appt.doctor_id = appt_doc.id
    LEFT JOIN admissions adm ON i.admission_id = adm.id
    LEFT JOIN doctors adm_doc ON adm.doctor_id = adm_doc.id
    LEFT JOIN users u ON i.created_by = u.id
    WHERE i.id = $1`,
    [numericId]
  );

  if (invoiceRes.rows.length === 0) {
    return null;
  }

  const row = invoiceRes.rows[0];

  // Fetch invoice items
  const itemsRes = await pool.query(
    `SELECT
      id,
      invoice_id AS "invoiceId",
      item_type AS "itemType",
      description,
      quantity,
      unit_price AS "unitPrice",
      total_price AS "totalPrice",
      created_at AS "createdAt"
    FROM invoice_items
    WHERE invoice_id = $1
    ORDER BY id ASC`,
    [numericId]
  );

  // Fetch payments
  const paymentsRes = await pool.query(
    `SELECT
      p.id,
      p.payment_number AS "paymentNumber",
      p.invoice_id AS "invoiceId",
      p.amount,
      p.payment_method AS "paymentMethod",
      p.payment_date AS "paymentDate",
      p.reference_number AS "referenceNumber",
      p.notes,
      p.received_by AS "receivedBy",
      u.full_name AS "receivedByName",
      p.created_at AS "createdAt"
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE p.invoice_id = $1
    ORDER BY p.payment_date DESC, p.id DESC`,
    [numericId]
  );

  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    patientId: row.patientId,
    patient: {
      id: row.patientId,
      patientCode: row.patientCode,
      name: row.patientName,
      age: row.patientAge,
      gender: row.patientGender,
      phone: row.patientPhone,
      email: row.patientEmail,
      bloodGroup: row.patientBloodGroup,
    },
    appointment: row.appointmentId
      ? {
          id: row.appointmentId,
          appointmentCode: row.appointmentCode,
          appointmentDate: row.appointmentDate,
          appointmentTime: row.appointmentTime,
          doctorName: row.appointmentDoctorName,
        }
      : null,
    admission: row.admissionId
      ? {
          id: row.admissionId,
          admissionCode: row.admissionCode,
          roomNumber: row.admissionRoomNumber,
          bedNumber: row.admissionBedNumber,
          admissionDate: row.admissionDate,
          dischargeDate: row.admissionDischargeDate,
          doctorName: row.admissionDoctorName,
        }
      : null,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    subtotal: row.subtotal,
    discount: row.discount,
    tax: row.tax,
    totalAmount: row.totalAmount,
    paidAmount: row.paidAmount,
    balanceAmount: row.balanceAmount,
    status: row.status,
    billingNotes: row.billingNotes,
    createdBy: row.createdBy
      ? {
          id: row.createdBy,
          fullName: row.createdByName,
          role: row.createdByRole,
        }
      : null,
    items: itemsRes.rows,
    payments: paymentsRes.rows,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * 3. List and filter Invoices with pagination.
 *
 * @param {object} filters - { patientId, status, invoiceNumber, startDate, endDate }
 * @param {object} pagination - { page, limit }
 * @returns {Promise<object>} { invoices, total, page, limit, totalPages }
 */
async function getAllInvoices(filters = {}, pagination = {}) {
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (filters.patientId) {
    const pId = Number(filters.patientId);
    if (Number.isInteger(pId) && pId > 0) {
      conditions.push(`i.patient_id = $${paramIdx++}`);
      params.push(pId);
    }
  }

  if (filters.status) {
    const matchedStatus = ALLOWED_STATUSES.find(
      (s) => s.toLowerCase() === String(filters.status).trim().toLowerCase()
    );
    if (matchedStatus) {
      conditions.push(`i.status = $${paramIdx++}`);
      params.push(matchedStatus);
    }
  }

  if (filters.invoiceNumber) {
    conditions.push(`i.invoice_number ILIKE $${paramIdx++}`);
    params.push(`%${String(filters.invoiceNumber).trim()}%`);
  }

  if (filters.startDate) {
    conditions.push(`i.invoice_date >= $${paramIdx++}`);
    params.push(String(filters.startDate).trim());
  }

  if (filters.endDate) {
    conditions.push(`i.invoice_date <= $${paramIdx++}`);
    params.push(String(filters.endDate).trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Query with window function to get total count in single round-trip
  const query = `
    SELECT
      i.id,
      i.invoice_number AS "invoiceNumber",
      i.patient_id AS "patientId",
      p.patient_id AS "patientCode",
      p.name AS "patientName",
      p.phone AS "patientPhone",
      i.appointment_id AS "appointmentId",
      i.admission_id AS "admissionId",
      i.invoice_date AS "invoiceDate",
      i.due_date AS "dueDate",
      i.subtotal,
      i.discount,
      i.tax,
      i.total_amount AS "totalAmount",
      i.paid_amount AS "paidAmount",
      i.balance_amount AS "balanceAmount",
      i.status,
      i.billing_notes AS "billingNotes",
      i.created_at AS "createdAt",
      i.updated_at AS "updatedAt",
      (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) AS "itemCount",
      COUNT(*) OVER() AS "totalCount"
    FROM invoices i
    JOIN patients p ON i.patient_id = p.id
    ${whereClause}
    ORDER BY i.invoice_date DESC, i.id DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;

  params.push(limit, offset);

  const result = await pool.query(query, params);

  const total = result.rows.length > 0 ? parseInt(result.rows[0].totalCount, 10) : 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const invoices = result.rows.map((row) => {
    const { totalCount: _totalCount, ...rest } = row;
    return rest;
  });

  return {
    invoices,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * 4. Update an editable PENDING Invoice header fields.
 *
 * @param {number|string} id - Invoice ID
 * @param {object} updateData - Allowed fields: invoiceDate, dueDate, discount, tax, billingNotes, appointmentId, admissionId
 * @param {number|null} userId - Authenticated user ID
 * @returns {Promise<object>} Updated invoice details
 */
async function updateInvoice(id, updateData, userId = null) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    const error = new Error("Invalid invoice ID");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock invoice row
    const lockRes = await client.query(
      `SELECT * FROM invoices WHERE id = $1 FOR UPDATE`,
      [numericId]
    );
    if (lockRes.rows.length === 0) {
      const error = new Error(`Invoice with ID ${numericId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const currentInvoice = lockRes.rows[0];

    // Only PENDING invoices may be modified
    if (currentInvoice.status !== "PENDING") {
      const error = new Error(
        `Cannot update an invoice with status '${currentInvoice.status}'. Only PENDING invoices can be updated.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Validate relationships if changing appointment or admission
    let newAppointmentId = currentInvoice.appointment_id;
    if (updateData.appointmentId !== undefined) {
      if (updateData.appointmentId === null || updateData.appointmentId === "") {
        newAppointmentId = null;
      } else {
        const apptId = Number(updateData.appointmentId);
        if (!Number.isInteger(apptId) || apptId <= 0) {
          const error = new Error("Appointment ID must be a positive integer");
          error.statusCode = 400;
          throw error;
        }
        const apptCheck = await client.query(
          `SELECT patient_id FROM appointments WHERE id = $1`,
          [apptId]
        );
        if (apptCheck.rows.length === 0) {
          const error = new Error(`Appointment with ID ${apptId} not found`);
          error.statusCode = 404;
          throw error;
        }
        if (apptCheck.rows[0].patient_id !== currentInvoice.patient_id) {
          const error = new Error("Appointment does not belong to the specified patient");
          error.statusCode = 400;
          throw error;
        }
        newAppointmentId = apptId;
      }
    }

    let newAdmissionId = currentInvoice.admission_id;
    if (updateData.admissionId !== undefined) {
      if (updateData.admissionId === null || updateData.admissionId === "") {
        newAdmissionId = null;
      } else {
        const admId = Number(updateData.admissionId);
        if (!Number.isInteger(admId) || admId <= 0) {
          const error = new Error("Admission ID must be a positive integer");
          error.statusCode = 400;
          throw error;
        }
        const admCheck = await client.query(
          `SELECT patient_id FROM admissions WHERE id = $1`,
          [admId]
        );
        if (admCheck.rows.length === 0) {
          const error = new Error(`Admission with ID ${admId} not found`);
          error.statusCode = 404;
          throw error;
        }
        if (admCheck.rows[0].patient_id !== currentInvoice.patient_id) {
          const error = new Error("Admission does not belong to the specified patient");
          error.statusCode = 400;
          throw error;
        }
        newAdmissionId = admId;
      }
    }

    const newInvoiceDate = updateData.invoiceDate || currentInvoice.invoice_date;
    const newDueDate = updateData.dueDate !== undefined ? updateData.dueDate : currentInvoice.due_date;

    if (newDueDate && new Date(newDueDate) < new Date(newInvoiceDate)) {
      const error = new Error("Due date cannot be earlier than invoice date");
      error.statusCode = 400;
      throw error;
    }

    const newDiscount =
      updateData.discount !== undefined ? roundMoney(updateData.discount) : roundMoney(currentInvoice.discount);
    if (newDiscount < 0) {
      const error = new Error("Discount cannot be negative");
      error.statusCode = 400;
      throw error;
    }

    const newTax =
      updateData.tax !== undefined ? roundMoney(updateData.tax) : roundMoney(currentInvoice.tax);
    if (newTax < 0) {
      const error = new Error("Tax cannot be negative");
      error.statusCode = 400;
      throw error;
    }

    const newBillingNotes =
      updateData.billingNotes !== undefined ? updateData.billingNotes : currentInvoice.billing_notes;

    // Apply header changes
    await client.query(
      `UPDATE invoices
       SET invoice_date = $1,
           due_date = $2,
           discount = $3,
           tax = $4,
           billing_notes = $5,
           appointment_id = $6,
           admission_id = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        newInvoiceDate,
        newDueDate || null,
        newDiscount.toFixed(2),
        newTax.toFixed(2),
        newBillingNotes || null,
        newAppointmentId,
        newAdmissionId,
        numericId,
      ]
    );

    // Recalculate totals
    await recalculateInvoiceTotals(client, numericId);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Audit event after successful commit
  auditService.logAuditEvent({
    eventType: "INVOICE_UPDATED",
    userId: userId ? Number(userId) : null,
    role: null,
    action: "UPDATE",
    resourceType: "INVOICE",
    resourceId: numericId,
    outcome: "SUCCESS",
    ipAddress: null,
  });

  return getInvoiceById(numericId);
}

/**
 * 5. Cancel an invoice safely (Admin only / Zero payments allowed).
 *
 * @param {number|string} id - Invoice ID
 * @param {string} reason - Cancellation reason
 * @param {number|null} userId - Authenticated user ID
 * @returns {Promise<object>} Updated invoice details
 */
async function cancelInvoice(id, reason = "", userId = null) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    const error = new Error("Invalid invoice ID");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock invoice row
    const lockRes = await client.query(
      `SELECT id, status, billing_notes FROM invoices WHERE id = $1 FOR UPDATE`,
      [numericId]
    );
    if (lockRes.rows.length === 0) {
      const error = new Error(`Invoice with ID ${numericId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const currentInvoice = lockRes.rows[0];

    if (currentInvoice.status === "CANCELLED") {
      const error = new Error("Invoice is already cancelled");
      error.statusCode = 400;
      throw error;
    }

    if (currentInvoice.status === "PAID") {
      const error = new Error("Cannot cancel an invoice that has been fully paid");
      error.statusCode = 400;
      throw error;
    }

    // 2. Check for existing payment records
    const payCheck = await client.query(
      `SELECT COUNT(*) AS count FROM payments WHERE invoice_id = $1`,
      [numericId]
    );
    const paymentCount = parseInt(payCheck.rows[0].count, 10);
    if (paymentCount > 0) {
      const error = new Error(
        `Cannot cancel an invoice with ${paymentCount} recorded payment(s). Reverse or refund payments first.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Mark CANCELLED and optionally append note
    let updatedNotes = currentInvoice.billing_notes || "";
    if (reason && reason.trim().length > 0) {
      const timestamp = new Date().toISOString();
      const cancelNote = `[CANCELLED ${timestamp}]: ${reason.trim()}`;
      updatedNotes = updatedNotes ? `${updatedNotes}\n${cancelNote}` : cancelNote;
    }

    await client.query(
      `UPDATE invoices
       SET status = 'CANCELLED',
           balance_amount = 0.00,
           billing_notes = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [updatedNotes || null, numericId]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Audit event after successful commit
  auditService.logAuditEvent({
    eventType: "INVOICE_CANCELLED",
    userId: userId ? Number(userId) : null,
    role: null,
    action: "UPDATE",
    resourceType: "INVOICE",
    resourceId: numericId,
    outcome: "SUCCESS",
    ipAddress: null,
  });

  return getInvoiceById(numericId);
}

/**
 * 6. Add a line item to a PENDING invoice.
 *
 * @param {number|string} invoiceId
 * @param {object} itemData
 * @param {number|null} userId
 * @returns {Promise<object>} Updated invoice details
 */
async function addInvoiceItem(invoiceId, itemData, userId = null) {
  const numericInvoiceId = Number(invoiceId);
  if (!Number.isInteger(numericInvoiceId) || numericInvoiceId <= 0) {
    const error = new Error("Invalid invoice ID");
    error.statusCode = 400;
    throw error;
  }

  // Validate itemData
  const description = itemData.description ? String(itemData.description).trim() : "";
  if (!description || description.length === 0 || description.length > 255) {
    const error = new Error("Item description is required and must be under 255 characters");
    error.statusCode = 400;
    throw error;
  }

  const quantity = parseInt(itemData.quantity, 10);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    const error = new Error("Item quantity must be a positive integer greater than 0");
    error.statusCode = 400;
    throw error;
  }

  const unitPrice = Number(itemData.unitPrice !== undefined ? itemData.unitPrice : itemData.unit_price);
  if (Number.isNaN(unitPrice) || unitPrice < 0) {
    const error = new Error("Item unit price must be a non-negative number");
    error.statusCode = 400;
    throw error;
  }

  let itemType = itemData.itemType || itemData.item_type || "General";
  const matchedType = ALLOWED_ITEM_TYPES.find(
    (t) => t.toLowerCase() === String(itemType).trim().toLowerCase()
  );
  if (!matchedType) {
    const error = new Error(
      `Item type '${itemType}' is invalid. Allowed types: ${ALLOWED_ITEM_TYPES.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }
  itemType = matchedType;

  const totalPrice = calculateLineTotal(quantity, unitPrice);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock invoice
    const lockRes = await client.query(
      `SELECT status FROM invoices WHERE id = $1 FOR UPDATE`,
      [numericInvoiceId]
    );
    if (lockRes.rows.length === 0) {
      const error = new Error(`Invoice with ID ${numericInvoiceId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const currentInvoice = lockRes.rows[0];
    if (currentInvoice.status !== "PENDING") {
      const error = new Error(
        `Cannot add items to an invoice with status '${currentInvoice.status}'. Only PENDING invoices allow item modifications.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Verify 0 payments
    const payCheck = await client.query(
      `SELECT COUNT(*) AS count FROM payments WHERE invoice_id = $1`,
      [numericInvoiceId]
    );
    if (parseInt(payCheck.rows[0].count, 10) > 0) {
      const error = new Error("Cannot modify items on an invoice with recorded payments");
      error.statusCode = 400;
      throw error;
    }

    // 2. Insert item
    await client.query(
      `INSERT INTO invoice_items (
        invoice_id,
        item_type,
        description,
        quantity,
        unit_price,
        total_price
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        numericInvoiceId,
        itemType,
        description,
        quantity,
        roundMoney(unitPrice).toFixed(2),
        totalPrice.toFixed(2),
      ]
    );

    // 3. Recalculate totals
    await recalculateInvoiceTotals(client, numericInvoiceId);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Audit event
  auditService.logAuditEvent({
    eventType: "INVOICE_UPDATED",
    userId: userId ? Number(userId) : null,
    role: null,
    action: "UPDATE",
    resourceType: "INVOICE",
    resourceId: numericInvoiceId,
    outcome: "SUCCESS",
    ipAddress: null,
  });

  return getInvoiceById(numericInvoiceId);
}

/**
 * 7. Update an existing line item on a PENDING invoice.
 *
 * @param {number|string} invoiceId
 * @param {number|string} itemId
 * @param {object} itemData
 * @param {number|null} userId
 * @returns {Promise<object>} Updated invoice details
 */
async function updateInvoiceItem(invoiceId, itemId, itemData, userId = null) {
  const numericInvoiceId = Number(invoiceId);
  const numericItemId = Number(itemId);

  if (!Number.isInteger(numericInvoiceId) || numericInvoiceId <= 0) {
    const error = new Error("Invalid invoice ID");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(numericItemId) || numericItemId <= 0) {
    const error = new Error("Invalid item ID");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock invoice
    const lockRes = await client.query(
      `SELECT status FROM invoices WHERE id = $1 FOR UPDATE`,
      [numericInvoiceId]
    );
    if (lockRes.rows.length === 0) {
      const error = new Error(`Invoice with ID ${numericInvoiceId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const currentInvoice = lockRes.rows[0];
    if (currentInvoice.status !== "PENDING") {
      const error = new Error(
        `Cannot modify items on an invoice with status '${currentInvoice.status}'`
      );
      error.statusCode = 400;
      throw error;
    }

    // Verify 0 payments
    const payCheck = await client.query(
      `SELECT COUNT(*) AS count FROM payments WHERE invoice_id = $1`,
      [numericInvoiceId]
    );
    if (parseInt(payCheck.rows[0].count, 10) > 0) {
      const error = new Error("Cannot modify items on an invoice with recorded payments");
      error.statusCode = 400;
      throw error;
    }

    // 2. Fetch existing item
    const itemRes = await client.query(
      `SELECT * FROM invoice_items WHERE id = $1 AND invoice_id = $2 FOR UPDATE`,
      [numericItemId, numericInvoiceId]
    );
    if (itemRes.rows.length === 0) {
      const error = new Error(
        `Invoice item with ID ${numericItemId} not found for invoice ${numericInvoiceId}`
      );
      error.statusCode = 404;
      throw error;
    }

    const existingItem = itemRes.rows[0];

    const description =
      itemData.description !== undefined ? String(itemData.description).trim() : existingItem.description;
    if (!description || description.length === 0 || description.length > 255) {
      const error = new Error("Item description is required and must be under 255 characters");
      error.statusCode = 400;
      throw error;
    }

    const quantity =
      itemData.quantity !== undefined ? parseInt(itemData.quantity, 10) : existingItem.quantity;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error("Item quantity must be a positive integer greater than 0");
      error.statusCode = 400;
      throw error;
    }

    const unitPrice =
      itemData.unitPrice !== undefined
        ? Number(itemData.unitPrice)
        : itemData.unit_price !== undefined
        ? Number(itemData.unit_price)
        : Number(existingItem.unit_price);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      const error = new Error("Item unit price must be a non-negative number");
      error.statusCode = 400;
      throw error;
    }

    let itemType =
      itemData.itemType || itemData.item_type || existingItem.item_type;
    const matchedType = ALLOWED_ITEM_TYPES.find(
      (t) => t.toLowerCase() === String(itemType).trim().toLowerCase()
    );
    if (!matchedType) {
      const error = new Error(
        `Item type '${itemType}' is invalid. Allowed types: ${ALLOWED_ITEM_TYPES.join(", ")}`
      );
      error.statusCode = 400;
      throw error;
    }
    itemType = matchedType;

    const totalPrice = calculateLineTotal(quantity, unitPrice);

    // 3. Update item
    await client.query(
      `UPDATE invoice_items
       SET item_type = $1,
           description = $2,
           quantity = $3,
           unit_price = $4,
           total_price = $5
       WHERE id = $6 AND invoice_id = $7`,
      [
        itemType,
        description,
        quantity,
        roundMoney(unitPrice).toFixed(2),
        totalPrice.toFixed(2),
        numericItemId,
        numericInvoiceId,
      ]
    );

    // 4. Recalculate totals
    await recalculateInvoiceTotals(client, numericInvoiceId);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Audit event
  auditService.logAuditEvent({
    eventType: "INVOICE_UPDATED",
    userId: userId ? Number(userId) : null,
    role: null,
    action: "UPDATE",
    resourceType: "INVOICE",
    resourceId: numericInvoiceId,
    outcome: "SUCCESS",
    ipAddress: null,
  });

  return getInvoiceById(numericInvoiceId);
}

/**
 * 8. Remove a line item from a PENDING invoice (minimum 1 item must remain).
 *
 * @param {number|string} invoiceId
 * @param {number|string} itemId
 * @param {number|null} userId
 * @returns {Promise<object>} Updated invoice details
 */
async function removeInvoiceItem(invoiceId, itemId, userId = null) {
  const numericInvoiceId = Number(invoiceId);
  const numericItemId = Number(itemId);

  if (!Number.isInteger(numericInvoiceId) || numericInvoiceId <= 0) {
    const error = new Error("Invalid invoice ID");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(numericItemId) || numericItemId <= 0) {
    const error = new Error("Invalid item ID");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock invoice
    const lockRes = await client.query(
      `SELECT status FROM invoices WHERE id = $1 FOR UPDATE`,
      [numericInvoiceId]
    );
    if (lockRes.rows.length === 0) {
      const error = new Error(`Invoice with ID ${numericInvoiceId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const currentInvoice = lockRes.rows[0];
    if (currentInvoice.status !== "PENDING") {
      const error = new Error(
        `Cannot remove items from an invoice with status '${currentInvoice.status}'`
      );
      error.statusCode = 400;
      throw error;
    }

    // Verify 0 payments
    const payCheck = await client.query(
      `SELECT COUNT(*) AS count FROM payments WHERE invoice_id = $1`,
      [numericInvoiceId]
    );
    if (parseInt(payCheck.rows[0].count, 10) > 0) {
      const error = new Error("Cannot modify items on an invoice with recorded payments");
      error.statusCode = 400;
      throw error;
    }

    // 2. Check total items count on invoice
    const countRes = await client.query(
      `SELECT COUNT(*) AS count FROM invoice_items WHERE invoice_id = $1`,
      [numericInvoiceId]
    );
    const itemCount = parseInt(countRes.rows[0].count, 10);
    if (itemCount <= 1) {
      const error = new Error(
        "Cannot remove the only item from an invoice. An invoice must contain at least one line item."
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Verify item exists
    const itemRes = await client.query(
      `SELECT id FROM invoice_items WHERE id = $1 AND invoice_id = $2`,
      [numericItemId, numericInvoiceId]
    );
    if (itemRes.rows.length === 0) {
      const error = new Error(
        `Invoice item with ID ${numericItemId} not found for invoice ${numericInvoiceId}`
      );
      error.statusCode = 404;
      throw error;
    }

    // 4. Delete item
    await client.query(
      `DELETE FROM invoice_items WHERE id = $1 AND invoice_id = $2`,
      [numericItemId, numericInvoiceId]
    );

    // 5. Recalculate totals
    await recalculateInvoiceTotals(client, numericInvoiceId);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Audit event
  auditService.logAuditEvent({
    eventType: "INVOICE_UPDATED",
    userId: userId ? Number(userId) : null,
    role: null,
    action: "UPDATE",
    resourceType: "INVOICE",
    resourceId: numericInvoiceId,
    outcome: "SUCCESS",
    ipAddress: null,
  });

  return getInvoiceById(numericInvoiceId);
}

/**
 * 9. Record a Payment against an invoice atomically with concurrency lock.
 *
 * @param {number|string} invoiceId
 * @param {object} paymentData - { amount, paymentMethod, paymentDate, referenceNumber, notes }
 * @param {number|null} userId - Authenticated user ID receiving the payment
 * @returns {Promise<object>} { payment, invoice }
 */
async function recordPayment(invoiceId, paymentData, userId = null) {
  const numericInvoiceId = Number(invoiceId);
  if (!Number.isInteger(numericInvoiceId) || numericInvoiceId <= 0) {
    const error = new Error("Invalid invoice ID");
    error.statusCode = 400;
    throw error;
  }

  const rawAmount = paymentData.amount;
  const paymentAmount = roundMoney(rawAmount);
  if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
    const error = new Error("Payment amount must be a positive number greater than 0");
    error.statusCode = 400;
    throw error;
  }

  let paymentMethod = paymentData.paymentMethod || paymentData.payment_method || "Cash";
  const matchedMethod = ALLOWED_PAYMENT_METHODS.find(
    (m) => m.toLowerCase() === String(paymentMethod).trim().toLowerCase()
  );
  if (!matchedMethod) {
    const error = new Error(
      `Payment method '${paymentMethod}' is invalid. Allowed methods: ${ALLOWED_PAYMENT_METHODS.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }
  paymentMethod = matchedMethod;

  const paymentDate = paymentData.paymentDate || paymentData.payment_date || new Date().toISOString().slice(0, 10);
  const referenceNumber = paymentData.referenceNumber || paymentData.reference_number || null;
  const notes = paymentData.notes || null;

  const client = await pool.connect();
  let createdPayment = null;

  try {
    await client.query("BEGIN");

    // 1. Lock invoice row exclusively using FOR UPDATE to prevent race conditions
    const lockRes = await client.query(
      `SELECT
        id,
        total_amount,
        paid_amount,
        balance_amount,
        status,
        due_date
       FROM invoices
       WHERE id = $1
       FOR UPDATE`,
      [numericInvoiceId]
    );

    if (lockRes.rows.length === 0) {
      const error = new Error(`Invoice with ID ${numericInvoiceId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const currentInvoice = lockRes.rows[0];

    // Reject payment if cancelled
    if (currentInvoice.status === "CANCELLED") {
      const error = new Error("Cannot apply payment to a cancelled invoice");
      error.statusCode = 400;
      throw error;
    }

    // Reject payment if already fully paid
    const currentBalance = roundMoney(currentInvoice.balance_amount);
    if (currentInvoice.status === "PAID" || currentBalance <= 0) {
      const error = new Error("Invoice is already fully paid");
      error.statusCode = 400;
      throw error;
    }

    // Reject overpayment
    if (paymentAmount > currentBalance) {
      const error = new Error(
        `Payment amount (${paymentAmount.toFixed(2)}) exceeds current invoice balance (${currentBalance.toFixed(2)})`
      );
      error.statusCode = 400;
      throw error;
    }

    // 2. Insert payment record
    const insertPayRes = await client.query(
      `INSERT INTO payments (
        invoice_id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        notes,
        received_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        payment_number AS "paymentNumber",
        invoice_id AS "invoiceId",
        amount,
        payment_method AS "paymentMethod",
        payment_date AS "paymentDate",
        reference_number AS "referenceNumber",
        notes,
        received_by AS "receivedBy",
        created_at AS "createdAt"`,
      [
        numericInvoiceId,
        paymentAmount.toFixed(2),
        paymentMethod,
        paymentDate,
        referenceNumber,
        notes,
        userId ? Number(userId) : null,
      ]
    );

    createdPayment = insertPayRes.rows[0];

    // 3. Recalculate totals and status from database state
    await recalculateInvoiceTotals(client, numericInvoiceId);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // 4. Audit event after successful commit
  if (createdPayment) {
    auditService.logAuditEvent({
      eventType: "PAYMENT_RECORDED",
      userId: userId ? Number(userId) : null,
      role: null,
      action: "CREATE",
      resourceType: "PAYMENT",
      resourceId: createdPayment.id,
      outcome: "SUCCESS",
      ipAddress: null,
    });
  }

  const updatedInvoice = await getInvoiceById(numericInvoiceId);

  return {
    payment: createdPayment,
    invoice: updatedInvoice,
  };
}

/**
 * 10. Get all payments for an invoice.
 *
 * @param {number|string} invoiceId
 * @returns {Promise<Array<object>>}
 */
async function getInvoicePayments(invoiceId) {
  const numericInvoiceId = Number(invoiceId);
  if (!Number.isInteger(numericInvoiceId) || numericInvoiceId <= 0) {
    return [];
  }

  const result = await pool.query(
    `SELECT
      p.id,
      p.payment_number AS "paymentNumber",
      p.invoice_id AS "invoiceId",
      p.amount,
      p.payment_method AS "paymentMethod",
      p.payment_date AS "paymentDate",
      p.reference_number AS "referenceNumber",
      p.notes,
      p.received_by AS "receivedBy",
      u.full_name AS "receivedByName",
      p.created_at AS "createdAt"
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE p.invoice_id = $1
    ORDER BY p.payment_date DESC, p.id DESC`,
    [numericInvoiceId]
  );

  return result.rows;
}

module.exports = {
  createInvoice,
  getInvoiceById,
  getAllInvoices,
  updateInvoice,
  cancelInvoice,
  addInvoiceItem,
  updateInvoiceItem,
  removeInvoiceItem,
  recordPayment,
  getInvoicePayments,
  recalculateInvoiceTotals,
};
