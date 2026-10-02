const { pool } = require("../config/db");
const auditService = require("./auditService");

const ALLOWED_TEST_CATEGORIES = [
  "Hematology",
  "Biochemistry",
  "Microbiology",
  "Pathology",
  "Immunology",
  "Urinalysis",
  "Radiology",
  "General",
  "Other",
];

const ALLOWED_SAMPLE_TYPES = [
  "Blood",
  "Urine",
  "Serum",
  "Plasma",
  "Sputum",
  "Swab",
  "Stool",
  "Tissue",
  "Other",
];

const ALLOWED_PRIORITIES = ["Routine", "Urgent", "STAT"];
const ALLOWED_ORDER_STATUSES = [
  "PENDING",
  "SAMPLE_COLLECTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];
const ALLOWED_RESULT_FLAGS = ["NORMAL", "ABNORMAL", "CRITICAL"];

function parseValidId(id, fieldName = "ID") {
  const numericId = Number(id);
  if (!numericId || !Number.isInteger(numericId) || numericId <= 0) {
    const error = new Error(`Invalid ${fieldName}: must be a positive integer`);
    error.statusCode = 400;
    throw error;
  }
  return numericId;
}

/**
 * 1. List Catalog Lab Tests
 */
async function listTests(options = {}) {
  const { search, category, status } = options;
  const conditions = [];
  const params = [];

  if (search && typeof search === "string" && search.trim().length > 0) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(
      `(LOWER(t.name) LIKE $${params.length} OR LOWER(t.test_code) LIKE $${params.length} OR LOWER(t.category) LIKE $${params.length})`
    );
  }

  if (category && typeof category === "string" && category.trim().length > 0 && category !== "All") {
    params.push(category.trim());
    conditions.push(`t.category = $${params.length}`);
  }

  if (status && typeof status === "string" && status.trim().length > 0 && status !== "All") {
    params.push(status.trim().toUpperCase());
    conditions.push(`t.status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      t.id,
      t.test_code AS "testCode",
      t.name,
      t.category,
      t.sample_type AS "sampleType",
      t.reference_range AS "referenceRange",
      t.unit,
      t.price,
      t.turnaround_hours AS "turnaroundHours",
      t.status,
      t.created_at AS "createdAt"
    FROM public.lab_test_catalog t
    ${whereClause}
    ORDER BY t.category ASC, t.name ASC
  `;

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    ...row,
    price: parseFloat(row.price || 0),
    turnaroundHours: parseInt(row.turnaroundHours, 10) || 24,
  }));
}

/**
 * 2. Get Single Lab Test by ID
 */
async function getTestById(id) {
  const numericId = parseValidId(id, "Test ID");

  const query = `
    SELECT
      t.id,
      t.test_code AS "testCode",
      t.name,
      t.category,
      t.sample_type AS "sampleType",
      t.reference_range AS "referenceRange",
      t.unit,
      t.price,
      t.turnaround_hours AS "turnaroundHours",
      t.status,
      t.created_at AS "createdAt"
    FROM public.lab_test_catalog t
    WHERE t.id = $1
  `;

  const result = await pool.query(query, [numericId]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    price: parseFloat(row.price || 0),
    turnaroundHours: parseInt(row.turnaroundHours, 10) || 24,
  };
}

/**
 * 3. Create Lab Test in Catalog
 */
async function createTest(data, userId = null) {
  if (!data || typeof data !== "object") {
    const error = new Error("Invalid lab test data");
    error.statusCode = 400;
    throw error;
  }

  const { name, category, sampleType, referenceRange, unit, price, turnaroundHours, status } = data;

  if (!name || typeof name !== "string" || !name.trim()) {
    const error = new Error("Test name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!category || typeof category !== "string" || !category.trim()) {
    const error = new Error("Test category is required");
    error.statusCode = 400;
    throw error;
  }

  if (!sampleType || typeof sampleType !== "string" || !sampleType.trim()) {
    const error = new Error("Sample type is required");
    error.statusCode = 400;
    throw error;
  }

  const numPrice = price !== undefined ? parseFloat(price) : 0;
  if (Number.isNaN(numPrice) || numPrice < 0) {
    const error = new Error("Price must be a non-negative number");
    error.statusCode = 400;
    throw error;
  }

  const numHours = turnaroundHours !== undefined ? parseInt(turnaroundHours, 10) : 24;
  if (Number.isNaN(numHours) || numHours < 1) {
    const error = new Error("Turnaround hours must be at least 1 hour");
    error.statusCode = 400;
    throw error;
  }

  const normalizedStatus = status ? status.trim().toUpperCase() : "ACTIVE";

  const query = `
    INSERT INTO public.lab_test_catalog (
      name,
      category,
      sample_type,
      reference_range,
      unit,
      price,
      turnaround_hours,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id,
      test_code AS "testCode",
      name,
      category,
      sample_type AS "sampleType",
      reference_range AS "referenceRange",
      unit,
      price,
      turnaround_hours AS "turnaroundHours",
      status,
      created_at AS "createdAt"
  `;

  const result = await pool.query(query, [
    name.trim(),
    category.trim(),
    sampleType.trim(),
    referenceRange && referenceRange.trim() ? referenceRange.trim() : null,
    unit && unit.trim() ? unit.trim() : null,
    numPrice,
    numHours,
    normalizedStatus,
  ]);

  const created = result.rows[0];

  auditService
    .logAuditEvent({
      eventType: "LAB_TEST_CREATED",
      userId,
      role: null,
      action: "CREATE",
      resourceType: "LAB_TEST",
      resourceId: created.id,
      outcome: "SUCCESS",
    })
    .catch(() => {});

  return {
    ...created,
    price: parseFloat(created.price),
    turnaroundHours: parseInt(created.turnaroundHours, 10),
  };
}

/**
 * 4. List Lab Orders
 */
async function listOrders(options = {}) {
  const { search, status, priority, patientId, doctorId } = options;
  const conditions = [];
  const params = [];

  if (search && typeof search === "string" && search.trim().length > 0) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(
      `(LOWER(o.order_number) LIKE $${params.length} OR LOWER(p.name) LIKE $${params.length} OR LOWER(p.patient_id) LIKE $${params.length})`
    );
  }

  if (status && typeof status === "string" && status.trim().length > 0 && status !== "All") {
    params.push(status.trim().toUpperCase());
    conditions.push(`o.status = $${params.length}`);
  }

  if (priority && typeof priority === "string" && priority.trim().length > 0 && priority !== "All") {
    params.push(priority.trim());
    conditions.push(`o.priority = $${params.length}`);
  }

  if (patientId) {
    const pId = Number(patientId);
    if (pId && Number.isInteger(pId) && pId > 0) {
      params.push(pId);
      conditions.push(`o.patient_id = $${params.length}`);
    }
  }

  if (doctorId) {
    const dId = Number(doctorId);
    if (dId && Number.isInteger(dId) && dId > 0) {
      params.push(dId);
      conditions.push(`o.doctor_id = $${params.length}`);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      o.id,
      o.order_number AS "orderNumber",
      o.patient_id AS "patientId",
      o.doctor_id AS "doctorId",
      o.ordered_by AS "orderedBy",
      o.priority,
      o.status,
      o.clinical_notes AS "clinicalNotes",
      o.sample_collected_at AS "sampleCollectedAt",
      o.completed_at AS "completedAt",
      o.created_at AS "createdAt",
      p.name AS "patientName",
      p.patient_id AS "patientCode",
      d.name AS "doctorName",
      d.specialization AS "doctorSpecialization",
      u.full_name AS "orderedByName",
      COUNT(i.id)::integer AS "itemCount",
      COALESCE(SUM(i.price), 0)::numeric AS "totalPrice"
    FROM public.lab_orders o
    JOIN public.patients p ON p.id = o.patient_id
    LEFT JOIN public.doctors d ON d.id = o.doctor_id
    LEFT JOIN public.users u ON u.id = o.ordered_by
    LEFT JOIN public.lab_order_items i ON i.order_id = o.id
    ${whereClause}
    GROUP BY o.id, p.id, d.id, u.id
    ORDER BY
      CASE o.priority
        WHEN 'STAT' THEN 1
        WHEN 'Urgent' THEN 2
        ELSE 3
      END,
      o.created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    ...row,
    itemCount: parseInt(row.itemCount, 10) || 0,
    totalPrice: parseFloat(row.totalPrice || 0),
  }));
}

/**
 * 5. Get Single Order with Line Items & Results
 */
async function getOrderById(id) {
  const numericId = parseValidId(id, "Order ID");

  const orderQuery = `
    SELECT
      o.id,
      o.order_number AS "orderNumber",
      o.patient_id AS "patientId",
      o.doctor_id AS "doctorId",
      o.ordered_by AS "orderedBy",
      o.priority,
      o.status,
      o.clinical_notes AS "clinicalNotes",
      o.sample_collected_at AS "sampleCollectedAt",
      o.completed_at AS "completedAt",
      o.created_at AS "createdAt",
      p.name AS "patientName",
      p.patient_id AS "patientCode",
      p.age AS "patientAge",
      p.gender AS "patientGender",
      p.phone AS "patientPhone",
      d.name AS "doctorName",
      d.specialization AS "doctorSpecialization",
      u.full_name AS "orderedByName"
    FROM public.lab_orders o
    JOIN public.patients p ON p.id = o.patient_id
    LEFT JOIN public.doctors d ON d.id = o.doctor_id
    LEFT JOIN public.users u ON u.id = o.ordered_by
    WHERE o.id = $1
  `;

  const orderResult = await pool.query(orderQuery, [numericId]);
  if (orderResult.rows.length === 0) return null;

  const order = orderResult.rows[0];

  const itemsQuery = `
    SELECT
      i.id,
      i.order_id AS "orderId",
      i.test_id AS "testId",
      i.status,
      i.price,
      i.result_value AS "resultValue",
      i.result_flag AS "resultFlag",
      i.reference_range AS "referenceRange",
      i.remarks,
      i.completed_by AS "completedBy",
      i.completed_at AS "completedAt",
      t.test_code AS "testCode",
      t.name AS "testName",
      t.category AS "testCategory",
      t.sample_type AS "sampleType",
      t.unit AS "testUnit",
      u.full_name AS "completedByName"
    FROM public.lab_order_items i
    JOIN public.lab_test_catalog t ON t.id = i.test_id
    LEFT JOIN public.users u ON u.id = i.completed_by
    WHERE i.order_id = $1
    ORDER BY i.id ASC
  `;

  const itemsResult = await pool.query(itemsQuery, [numericId]);

  const items = itemsResult.rows.map((row) => ({
    ...row,
    price: parseFloat(row.price || 0),
  }));

  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

  return {
    ...order,
    totalPrice: parseFloat(totalPrice.toFixed(2)),
    items,
  };
}

/**
 * 6. Create Lab Order with Atomic Items Transaction
 */
async function createOrder(data, userId = null) {
  if (!data || typeof data !== "object") {
    const error = new Error("Invalid lab order payload");
    error.statusCode = 400;
    throw error;
  }

  const patientId = parseValidId(data.patientId || data.patient_id, "Patient ID");
  const doctorId = data.doctorId ? parseValidId(data.doctorId, "Doctor ID") : null;
  const priority = ALLOWED_PRIORITIES.includes(data.priority) ? data.priority : "Routine";
  const clinicalNotes = data.clinicalNotes && typeof data.clinicalNotes === "string" ? data.clinicalNotes.trim() : null;

  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    const error = new Error("At least one lab test item is required to create an order");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Verify Patient
    const patCheck = await client.query("SELECT id FROM public.patients WHERE id = $1", [patientId]);
    if (patCheck.rows.length === 0) {
      const error = new Error(`Patient with ID ${patientId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // 2. Verify Doctor if provided
    if (doctorId) {
      const docCheck = await client.query("SELECT id FROM public.doctors WHERE id = $1", [doctorId]);
      if (docCheck.rows.length === 0) {
        const error = new Error(`Doctor with ID ${doctorId} not found`);
        error.statusCode = 404;
        throw error;
      }
    }

    // 3. Create Order
    const orderInsert = `
      INSERT INTO public.lab_orders (
        patient_id,
        doctor_id,
        ordered_by,
        priority,
        status,
        clinical_notes
      ) VALUES ($1, $2, $3, $4, 'PENDING', $5)
      RETURNING
        id,
        order_number AS "orderNumber",
        patient_id AS "patientId",
        doctor_id AS "doctorId",
        ordered_by AS "orderedBy",
        priority,
        status,
        clinical_notes AS "clinicalNotes",
        created_at AS "createdAt"
    `;

    const orderRes = await client.query(orderInsert, [
      patientId,
      doctorId,
      userId || null,
      priority,
      clinicalNotes,
    ]);

    const createdOrder = orderRes.rows[0];

    // 4. Validate and Insert Items
    for (const item of items) {
      const testId = parseValidId(item.testId || item.test_id || item.id, "Test ID");
      const testRes = await client.query(
        "SELECT id, price, reference_range FROM public.lab_test_catalog WHERE id = $1 AND status = 'ACTIVE'",
        [testId]
      );

      if (testRes.rows.length === 0) {
        const error = new Error(`Active lab test with ID ${testId} not found`);
        error.statusCode = 400;
        throw error;
      }

      const test = testRes.rows[0];
      const itemPrice = parseFloat(test.price || 0);

      await client.query(
        `INSERT INTO public.lab_order_items (
          order_id,
          test_id,
          status,
          price,
          reference_range
        ) VALUES ($1, $2, 'PENDING', $3, $4)`,
        [createdOrder.id, testId, itemPrice, test.reference_range]
      );
    }

    await client.query("COMMIT");

    auditService
      .logAuditEvent({
        eventType: "LAB_ORDER_CREATED",
        userId,
        role: null,
        action: "CREATE",
        resourceType: "LAB_ORDER",
        resourceId: createdOrder.id,
        outcome: "SUCCESS",
      })
      .catch(() => {});

    return getOrderById(createdOrder.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 7. Record Specimen Collection
 */
async function recordSpecimen(orderId, userId = null) {
  const numericId = parseValidId(orderId, "Order ID");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderCheck = await client.query(
      "SELECT id, status FROM public.lab_orders WHERE id = $1 FOR UPDATE",
      [numericId]
    );

    if (orderCheck.rows.length === 0) {
      const error = new Error(`Lab order with ID ${numericId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const order = orderCheck.rows[0];
    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      const error = new Error(`Cannot collect specimen for order with terminal status '${order.status}'`);
      error.statusCode = 400;
      throw error;
    }

    await client.query(
      `UPDATE public.lab_orders
       SET status = 'SAMPLE_COLLECTED', sample_collected_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [numericId]
    );

    await client.query(
      `UPDATE public.lab_order_items
       SET status = 'IN_PROGRESS'
       WHERE order_id = $1 AND status = 'PENDING'`,
      [numericId]
    );

    await client.query("COMMIT");

    auditService
      .logAuditEvent({
        eventType: "LAB_SAMPLE_COLLECTED",
        userId,
        role: null,
        action: "UPDATE",
        resourceType: "LAB_ORDER",
        resourceId: numericId,
        outcome: "SUCCESS",
      })
      .catch(() => {});

    return getOrderById(numericId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 8. Submit/Update Result Values
 */
async function recordResults(orderId, data, userId = null) {
  const numericId = parseValidId(orderId, "Order ID");

  if (!data || typeof data !== "object") {
    const error = new Error("Invalid results payload");
    error.statusCode = 400;
    throw error;
  }

  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    const error = new Error("At least one test result must be provided");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderCheck = await client.query(
      "SELECT id, status FROM public.lab_orders WHERE id = $1 FOR UPDATE",
      [numericId]
    );

    if (orderCheck.rows.length === 0) {
      const error = new Error(`Lab order with ID ${numericId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const order = orderCheck.rows[0];
    if (order.status === "CANCELLED") {
      const error = new Error("Cannot record results for a cancelled order");
      error.statusCode = 400;
      throw error;
    }

    for (const item of items) {
      const itemId = parseValidId(item.itemId || item.id, "Order Item ID");
      const resultValue = item.resultValue !== undefined ? String(item.resultValue).trim() : "";
      const resultFlag = ALLOWED_RESULT_FLAGS.includes(item.resultFlag) ? item.resultFlag : "NORMAL";
      const remarks = item.remarks && typeof item.remarks === "string" ? item.remarks.trim() : null;

      const itemCheck = await client.query(
        "SELECT id, order_id FROM public.lab_order_items WHERE id = $1 AND order_id = $2 FOR UPDATE",
        [itemId, numericId]
      );

      if (itemCheck.rows.length === 0) {
        const error = new Error(`Order item ${itemId} does not belong to order ${numericId}`);
        error.statusCode = 400;
        throw error;
      }

      await client.query(
        `UPDATE public.lab_order_items
         SET
           result_value = $1,
           result_flag = $2,
           remarks = $3,
           status = 'COMPLETED',
           completed_by = $4,
           completed_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [resultValue || null, resultFlag, remarks, userId || null, itemId]
      );
    }

    // Check if all items in order are now completed
    const pendingCountRes = await client.query(
      "SELECT COUNT(*) FROM public.lab_order_items WHERE order_id = $1 AND status != 'COMPLETED'",
      [numericId]
    );
    const pendingCount = parseInt(pendingCountRes.rows[0].count, 10);

    if (pendingCount === 0) {
      await client.query(
        `UPDATE public.lab_orders
         SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [numericId]
      );
    } else {
      await client.query(
        `UPDATE public.lab_orders
         SET status = 'IN_PROGRESS'
         WHERE id = $1 AND status != 'COMPLETED'`,
        [numericId]
      );
    }

    await client.query("COMMIT");

    auditService
      .logAuditEvent({
        eventType: "LAB_RESULT_RECORDED",
        userId,
        role: null,
        action: "UPDATE",
        resourceType: "LAB_ORDER",
        resourceId: numericId,
        outcome: "SUCCESS",
      })
      .catch(() => {});

    return getOrderById(numericId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 9. Cancel Lab Order
 */
async function cancelOrder(orderId, reason = null, userId = null) {
  const numericId = parseValidId(orderId, "Order ID");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderCheck = await client.query(
      "SELECT id, status FROM public.lab_orders WHERE id = $1 FOR UPDATE",
      [numericId]
    );

    if (orderCheck.rows.length === 0) {
      const error = new Error(`Lab order with ID ${numericId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const order = orderCheck.rows[0];
    if (order.status === "COMPLETED") {
      const error = new Error("Cannot cancel an already completed lab order");
      error.statusCode = 400;
      throw error;
    }
    if (order.status === "CANCELLED") {
      const error = new Error("Lab order is already cancelled");
      error.statusCode = 400;
      throw error;
    }

    await client.query(
      `UPDATE public.lab_orders
       SET status = 'CANCELLED', clinical_notes = COALESCE(clinical_notes || E'\n[Cancelled]: ' || $1, $1)
       WHERE id = $2`,
      [reason ? String(reason).trim() : "Cancelled by authorized staff", numericId]
    );

    await client.query(
      `UPDATE public.lab_order_items
       SET status = 'CANCELLED'
       WHERE order_id = $1 AND status != 'COMPLETED'`,
      [numericId]
    );

    await client.query("COMMIT");

    auditService
      .logAuditEvent({
        eventType: "LAB_ORDER_CANCELLED",
        userId,
        role: null,
        action: "CANCEL",
        resourceType: "LAB_ORDER",
        resourceId: numericId,
        outcome: "SUCCESS",
      })
      .catch(() => {});

    return getOrderById(numericId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listTests,
  getTestById,
  createTest,
  listOrders,
  getOrderById,
  createOrder,
  recordSpecimen,
  recordResults,
  cancelOrder,
  ALLOWED_TEST_CATEGORIES,
  ALLOWED_SAMPLE_TYPES,
  ALLOWED_PRIORITIES,
  ALLOWED_ORDER_STATUSES,
  ALLOWED_RESULT_FLAGS,
};
