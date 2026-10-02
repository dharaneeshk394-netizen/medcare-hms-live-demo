const { pool } = require("../config/db");
const auditService = require("./auditService");

/**
 * Valid allowed status values
 */
const ALLOWED_MEDICINE_STATUSES = ["ACTIVE", "INACTIVE", "DISCONTINUED"];
const ALLOWED_BATCH_STATUSES = ["AVAILABLE", "EXPIRED", "DEPLETED"];

/**
 * Internal Helper: Validate numeric positive IDs
 */
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
 * 1. List Medicine Catalog with aggregated active stock & low-stock indicator
 */
async function listMedicines(options = {}) {
  const { search, category, status } = options;
  const conditions = [];
  const params = [];

  if (search && typeof search === "string" && search.trim().length > 0) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(
      `(LOWER(m.name) LIKE $${params.length} OR LOWER(m.medicine_code) LIKE $${params.length} OR LOWER(COALESCE(m.generic_name, '')) LIKE $${params.length})`
    );
  }

  if (category && typeof category === "string" && category.trim().length > 0) {
    params.push(category.trim());
    conditions.push(`m.category = $${params.length}`);
  }

  if (status && typeof status === "string" && status.trim().length > 0) {
    const normalizedStatus = status.trim().toUpperCase();
    if (ALLOWED_MEDICINE_STATUSES.includes(normalizedStatus)) {
      params.push(normalizedStatus);
      conditions.push(`m.status = $${params.length}`);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      m.id,
      m.medicine_code AS "medicineCode",
      m.name,
      m.generic_name AS "genericName",
      m.category,
      m.dosage_form AS "dosageForm",
      m.strength,
      m.unit_price AS "unitPrice",
      m.reorder_level AS "reorderLevel",
      m.status,
      m.created_at AS "createdAt",
      m.updated_at AS "updatedAt",
      COALESCE(SUM(
        CASE
          WHEN b.status = 'AVAILABLE' AND b.expiry_date >= CURRENT_DATE
          THEN b.quantity_in_stock
          ELSE 0
        END
      ), 0)::integer AS "totalStock",
      COUNT(b.id)::integer AS "batchCount",
      (
        COALESCE(SUM(
          CASE
            WHEN b.status = 'AVAILABLE' AND b.expiry_date >= CURRENT_DATE
            THEN b.quantity_in_stock
            ELSE 0
          END
        ), 0) <= m.reorder_level
      ) AS "isLowStock"
    FROM public.medicines m
    LEFT JOIN public.medicine_batches b ON b.medicine_id = m.id
    ${whereClause}
    GROUP BY m.id
    ORDER BY m.name ASC
  `;

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    ...row,
    unitPrice: parseFloat(row.unitPrice || 0),
    totalStock: parseInt(row.totalStock, 10) || 0,
    reorderLevel: parseInt(row.reorderLevel, 10) || 0,
    batchCount: parseInt(row.batchCount, 10) || 0,
    isLowStock: Boolean(row.isLowStock),
  }));
}

/**
 * 2. Get Medicine by ID including active and valid batches
 */
async function getMedicineById(id) {
  const medicineId = parseValidId(id, "Medicine ID");

  const medRes = await pool.query(
    `SELECT
      m.id,
      m.medicine_code AS "medicineCode",
      m.name,
      m.generic_name AS "genericName",
      m.category,
      m.dosage_form AS "dosageForm",
      m.strength,
      m.unit_price AS "unitPrice",
      m.reorder_level AS "reorderLevel",
      m.status,
      m.created_at AS "createdAt",
      m.updated_at AS "updatedAt"
    FROM public.medicines m
    WHERE m.id = $1`,
    [medicineId]
  );

  if (medRes.rows.length === 0) {
    return null;
  }

  const medicine = medRes.rows[0];

  const batchesRes = await pool.query(
    `SELECT
      id,
      batch_number AS "batchNumber",
      medicine_id AS "medicineId",
      quantity_in_stock AS "quantityInStock",
      expiry_date AS "expiryDate",
      purchase_price AS "purchasePrice",
      selling_price AS "sellingPrice",
      supplier_name AS "supplierName",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      (expiry_date < CURRENT_DATE) AS "isExpired"
    FROM public.medicine_batches
    WHERE medicine_id = $1
    ORDER BY expiry_date ASC, id ASC`,
    [medicineId]
  );

  const batches = batchesRes.rows.map((b) => ({
    ...b,
    purchasePrice: parseFloat(b.purchasePrice || 0),
    sellingPrice: parseFloat(b.sellingPrice || 0),
    quantityInStock: parseInt(b.quantityInStock, 10) || 0,
    isExpired: Boolean(b.isExpired),
  }));

  const totalStock = batches.reduce((acc, b) => {
    if (b.status === "AVAILABLE" && !b.isExpired) {
      return acc + b.quantityInStock;
    }
    return acc;
  }, 0);

  return {
    ...medicine,
    unitPrice: parseFloat(medicine.unitPrice || 0),
    reorderLevel: parseInt(medicine.reorderLevel, 10) || 0,
    totalStock,
    isLowStock: totalStock <= parseInt(medicine.reorderLevel, 10),
    batches,
  };
}

/**
 * 3. Create a new Medicine in catalog
 */
async function createMedicine(data) {
  if (!data || typeof data !== "object") {
    const error = new Error("Invalid request body");
    error.statusCode = 400;
    throw error;
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const genericName = typeof data.genericName === "string" ? data.genericName.trim() : (typeof data.generic_name === "string" ? data.generic_name.trim() : null);
  const category = typeof data.category === "string" ? data.category.trim() : "";
  const dosageForm = typeof data.dosageForm === "string" ? data.dosageForm.trim() : (typeof data.dosage_form === "string" ? data.dosage_form.trim() : "");
  const strength = typeof data.strength === "string" ? data.strength.trim() : null;
  const unitPriceRaw = data.unitPrice !== undefined ? data.unitPrice : data.unit_price;
  const reorderLevelRaw = data.reorderLevel !== undefined ? data.reorderLevel : data.reorder_level;
  const rawStatus = data.status ? String(data.status).trim().toUpperCase() : "ACTIVE";

  if (!name) {
    const error = new Error("Medicine name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!category) {
    const error = new Error("Category is required");
    error.statusCode = 400;
    throw error;
  }

  if (!dosageForm) {
    const error = new Error("Dosage form is required");
    error.statusCode = 400;
    throw error;
  }

  const unitPrice = parseFloat(unitPriceRaw);
  if (Number.isNaN(unitPrice) || unitPrice < 0) {
    const error = new Error("Unit price must be a non-negative number");
    error.statusCode = 400;
    throw error;
  }

  let reorderLevel = 10;
  if (reorderLevelRaw !== undefined && reorderLevelRaw !== null) {
    const parsedReorder = parseInt(reorderLevelRaw, 10);
    if (Number.isNaN(parsedReorder) || parsedReorder < 0) {
      const error = new Error("Reorder level must be a non-negative integer");
      error.statusCode = 400;
      throw error;
    }
    reorderLevel = parsedReorder;
  }

  const status = ALLOWED_MEDICINE_STATUSES.includes(rawStatus) ? rawStatus : "ACTIVE";

  const insertQuery = `
    INSERT INTO public.medicines (
      name,
      generic_name,
      category,
      dosage_form,
      strength,
      unit_price,
      reorder_level,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id,
      medicine_code AS "medicineCode",
      name,
      generic_name AS "genericName",
      category,
      dosage_form AS "dosageForm",
      strength,
      unit_price AS "unitPrice",
      reorder_level AS "reorderLevel",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const res = await pool.query(insertQuery, [
    name,
    genericName,
    category,
    dosageForm,
    strength,
    unitPrice.toFixed(2),
    reorderLevel,
    status,
  ]);

  const created = res.rows[0];
  return {
    ...created,
    unitPrice: parseFloat(created.unitPrice || 0),
    reorderLevel: parseInt(created.reorderLevel, 10) || 0,
    totalStock: 0,
    isLowStock: true,
  };
}

/**
 * 4. Update Medicine catalog information
 */
async function updateMedicine(id, data) {
  const medicineId = parseValidId(id, "Medicine ID");

  if (!data || typeof data !== "object") {
    const error = new Error("Invalid request body");
    error.statusCode = 400;
    throw error;
  }

  // Check existence
  const existing = await getMedicineById(medicineId);
  if (!existing) {
    const error = new Error(`Medicine with ID ${medicineId} not found`);
    error.statusCode = 404;
    throw error;
  }

  const fields = [];
  const params = [];

  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) {
      const error = new Error("Medicine name cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    params.push(name);
    fields.push(`name = $${params.length}`);
  }

  if (data.genericName !== undefined || data.generic_name !== undefined) {
    const val = data.genericName !== undefined ? data.genericName : data.generic_name;
    const genericName = val ? String(val).trim() : null;
    params.push(genericName);
    fields.push(`generic_name = $${params.length}`);
  }

  if (data.category !== undefined) {
    const category = String(data.category).trim();
    if (!category) {
      const error = new Error("Category cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    params.push(category);
    fields.push(`category = $${params.length}`);
  }

  if (data.dosageForm !== undefined || data.dosage_form !== undefined) {
    const val = data.dosageForm !== undefined ? data.dosageForm : data.dosage_form;
    const dosageForm = val ? String(val).trim() : "";
    if (!dosageForm) {
      const error = new Error("Dosage form cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    params.push(dosageForm);
    fields.push(`dosage_form = $${params.length}`);
  }

  if (data.strength !== undefined) {
    const strength = data.strength ? String(data.strength).trim() : null;
    params.push(strength);
    fields.push(`strength = $${params.length}`);
  }

  if (data.unitPrice !== undefined || data.unit_price !== undefined) {
    const val = data.unitPrice !== undefined ? data.unitPrice : data.unit_price;
    const unitPrice = parseFloat(val);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      const error = new Error("Unit price must be a non-negative number");
      error.statusCode = 400;
      throw error;
    }
    params.push(unitPrice.toFixed(2));
    fields.push(`unit_price = $${params.length}`);
  }

  if (data.reorderLevel !== undefined || data.reorder_level !== undefined) {
    const val = data.reorderLevel !== undefined ? data.reorderLevel : data.reorder_level;
    const reorderLevel = parseInt(val, 10);
    if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
      const error = new Error("Reorder level must be a non-negative integer");
      error.statusCode = 400;
      throw error;
    }
    params.push(reorderLevel);
    fields.push(`reorder_level = $${params.length}`);
  }

  if (data.status !== undefined) {
    const status = String(data.status).trim().toUpperCase();
    if (!ALLOWED_MEDICINE_STATUSES.includes(status)) {
      const error = new Error(`Invalid status. Must be one of: ${ALLOWED_MEDICINE_STATUSES.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
    params.push(status);
    fields.push(`status = $${params.length}`);
  }

  if (fields.length === 0) {
    return existing;
  }

  params.push(medicineId);
  const updateQuery = `
    UPDATE public.medicines
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${params.length}
    RETURNING
      id,
      medicine_code AS "medicineCode",
      name,
      generic_name AS "genericName",
      category,
      dosage_form AS "dosageForm",
      strength,
      unit_price AS "unitPrice",
      reorder_level AS "reorderLevel",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const res = await pool.query(updateQuery, params);
  const updated = res.rows[0];

  return {
    ...updated,
    unitPrice: parseFloat(updated.unitPrice || 0),
    reorderLevel: parseInt(updated.reorderLevel, 10) || 0,
    totalStock: existing.totalStock,
    isLowStock: existing.totalStock <= parseInt(updated.reorderLevel, 10),
    batches: existing.batches,
  };
}

/**
 * 5. Add a new Inventory Batch for a Medicine
 */
async function addBatch(data) {
  if (!data || typeof data !== "object") {
    const error = new Error("Invalid batch payload");
    error.statusCode = 400;
    throw error;
  }

  const medicineId = parseValidId(
    data.medicineId !== undefined ? data.medicineId : data.medicine_id,
    "Medicine ID"
  );

  const rawBatchNumber = data.batchNumber !== undefined ? data.batchNumber : data.batch_number;
  const batchNumber = typeof rawBatchNumber === "string" ? rawBatchNumber.trim().toUpperCase() : "";
  if (!batchNumber) {
    const error = new Error("Batch number is required");
    error.statusCode = 400;
    throw error;
  }

  const rawQty = data.quantityInStock !== undefined ? data.quantityInStock : (data.quantity !== undefined ? data.quantity : data.quantity_in_stock);
  const quantity = parseInt(rawQty, 10);
  if (Number.isNaN(quantity) || quantity < 0) {
    const error = new Error("Batch quantity must be a non-negative integer");
    error.statusCode = 400;
    throw error;
  }

  const rawExpiry = data.expiryDate !== undefined ? data.expiryDate : data.expiry_date;
  if (!rawExpiry || typeof rawExpiry !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rawExpiry.trim())) {
    const error = new Error("Valid expiry date in YYYY-MM-DD format is required");
    error.statusCode = 400;
    throw error;
  }
  const expiryDate = rawExpiry.trim();

  const purchasePriceRaw = data.purchasePrice !== undefined ? data.purchasePrice : data.purchase_price;
  const purchasePrice = purchasePriceRaw !== undefined ? parseFloat(purchasePriceRaw) : 0.0;
  if (Number.isNaN(purchasePrice) || purchasePrice < 0) {
    const error = new Error("Purchase price must be a non-negative number");
    error.statusCode = 400;
    throw error;
  }

  const sellingPriceRaw = data.sellingPrice !== undefined ? data.sellingPrice : data.selling_price;
  const sellingPrice = sellingPriceRaw !== undefined ? parseFloat(sellingPriceRaw) : 0.0;
  if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
    const error = new Error("Selling price must be a non-negative number");
    error.statusCode = 400;
    throw error;
  }

  const rawSupplier = data.supplierName !== undefined ? data.supplierName : data.supplier_name;
  const supplierName = typeof rawSupplier === "string" ? rawSupplier.trim() : null;

  // Verify medicine existence
  const medRes = await pool.query(`SELECT id, status FROM public.medicines WHERE id = $1`, [medicineId]);
  if (medRes.rows.length === 0) {
    const error = new Error(`Medicine with ID ${medicineId} does not exist`);
    error.statusCode = 404;
    throw error;
  }

  // Check duplicate batch for this medicine
  const existingBatch = await pool.query(
    `SELECT id FROM public.medicine_batches WHERE medicine_id = $1 AND batch_number = $2`,
    [medicineId, batchNumber]
  );
  if (existingBatch.rows.length > 0) {
    const error = new Error(`Batch '${batchNumber}' already exists for this medicine`);
    error.statusCode = 409;
    throw error;
  }

  const batchStatus = quantity === 0 ? "DEPLETED" : "AVAILABLE";

  const insertQuery = `
    INSERT INTO public.medicine_batches (
      batch_number,
      medicine_id,
      quantity_in_stock,
      expiry_date,
      purchase_price,
      selling_price,
      supplier_name,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id,
      batch_number AS "batchNumber",
      medicine_id AS "medicineId",
      quantity_in_stock AS "quantityInStock",
      expiry_date AS "expiryDate",
      purchase_price AS "purchasePrice",
      selling_price AS "sellingPrice",
      supplier_name AS "supplierName",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const res = await pool.query(insertQuery, [
    batchNumber,
    medicineId,
    quantity,
    expiryDate,
    purchasePrice.toFixed(2),
    sellingPrice.toFixed(2),
    supplierName,
    batchStatus,
  ]);

  const batch = res.rows[0];
  return {
    ...batch,
    purchasePrice: parseFloat(batch.purchasePrice || 0),
    sellingPrice: parseFloat(batch.sellingPrice || 0),
    quantityInStock: parseInt(batch.quantityInStock, 10) || 0,
  };
}

/**
 * 6. Adjust Batch Stock atomically with SELECT FOR UPDATE
 */
async function adjustStock(data) {
  if (!data || typeof data !== "object") {
    const error = new Error("Invalid stock adjustment payload");
    error.statusCode = 400;
    throw error;
  }

  const batchId = parseValidId(
    data.batchId !== undefined ? data.batchId : data.batch_id,
    "Batch ID"
  );

  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  if (!reason) {
    const error = new Error("Adjustment reason is required");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Row-level lock on batch
    const lockRes = await client.query(
      `SELECT
        id,
        batch_number,
        medicine_id,
        quantity_in_stock,
        expiry_date,
        status
      FROM public.medicine_batches
      WHERE id = $1
      FOR UPDATE`,
      [batchId]
    );

    if (lockRes.rows.length === 0) {
      const error = new Error(`Batch with ID ${batchId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const currentBatch = lockRes.rows[0];
    const previousQuantity = parseInt(currentBatch.quantity_in_stock, 10);
    let newQuantity;

    if (data.newQuantity !== undefined || data.new_quantity !== undefined) {
      const val = data.newQuantity !== undefined ? data.newQuantity : data.new_quantity;
      newQuantity = parseInt(val, 10);
      if (Number.isNaN(newQuantity) || newQuantity < 0) {
        const error = new Error("New stock quantity must be a non-negative integer");
        error.statusCode = 400;
        throw error;
      }
    } else if (data.changeQuantity !== undefined || data.change_quantity !== undefined) {
      const val = data.changeQuantity !== undefined ? data.changeQuantity : data.change_quantity;
      const delta = parseInt(val, 10);
      if (Number.isNaN(delta) || delta === 0) {
        const error = new Error("Change quantity must be a non-zero integer");
        error.statusCode = 400;
        throw error;
      }
      newQuantity = previousQuantity + delta;
      if (newQuantity < 0) {
        const error = new Error(
          `Insufficient stock: current stock is ${previousQuantity}, cannot decrease by ${Math.abs(delta)}`
        );
        error.statusCode = 400;
        throw error;
      }
    } else {
      const error = new Error("Either changeQuantity or newQuantity must be provided");
      error.statusCode = 400;
      throw error;
    }

    // Determine new status
    let updatedStatus = currentBatch.status;
    const isExpired = new Date(currentBatch.expiry_date) < new Date(new Date().toISOString().slice(0, 10));

    if (newQuantity === 0) {
      updatedStatus = "DEPLETED";
    } else if (isExpired) {
      updatedStatus = "EXPIRED";
    } else {
      updatedStatus = "AVAILABLE";
    }

    const updateRes = await client.query(
      `UPDATE public.medicine_batches
       SET quantity_in_stock = $1,
           status = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING
         id,
         batch_number AS "batchNumber",
         medicine_id AS "medicineId",
         quantity_in_stock AS "quantityInStock",
         expiry_date AS "expiryDate",
         status,
         updated_at AS "updatedAt"`,
      [newQuantity, updatedStatus, batchId]
    );

    await client.query("COMMIT");

    const updatedBatch = updateRes.rows[0];

    return {
      batchId,
      medicineId: currentBatch.medicine_id,
      batchNumber: currentBatch.batch_number,
      previousQuantity,
      newQuantity,
      changeQuantity: newQuantity - previousQuantity,
      reason,
      status: updatedBatch.status,
      updatedAt: updatedBatch.updatedAt,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 7. List medicines currently below or at their reorder_level
 */
async function listLowStock() {
  const query = `
    SELECT
      m.id,
      m.medicine_code AS "medicineCode",
      m.name,
      m.generic_name AS "genericName",
      m.category,
      m.dosage_form AS "dosageForm",
      m.strength,
      m.unit_price AS "unitPrice",
      m.reorder_level AS "reorderLevel",
      m.status,
      COALESCE(SUM(
        CASE
          WHEN b.status = 'AVAILABLE' AND b.expiry_date >= CURRENT_DATE
          THEN b.quantity_in_stock
          ELSE 0
        END
      ), 0)::integer AS "totalStock",
      (m.reorder_level - COALESCE(SUM(
        CASE
          WHEN b.status = 'AVAILABLE' AND b.expiry_date >= CURRENT_DATE
          THEN b.quantity_in_stock
          ELSE 0
        END
      ), 0))::integer AS "deficit"
    FROM public.medicines m
    LEFT JOIN public.medicine_batches b ON b.medicine_id = m.id
    WHERE m.status = 'ACTIVE'
    GROUP BY m.id
    HAVING COALESCE(SUM(
      CASE
        WHEN b.status = 'AVAILABLE' AND b.expiry_date >= CURRENT_DATE
        THEN b.quantity_in_stock
        ELSE 0
      END
    ), 0) <= m.reorder_level
    ORDER BY "deficit" DESC, m.name ASC
  `;

  const result = await pool.query(query);
  return result.rows.map((row) => ({
    ...row,
    unitPrice: parseFloat(row.unitPrice || 0),
    totalStock: parseInt(row.totalStock, 10) || 0,
    reorderLevel: parseInt(row.reorderLevel, 10) || 0,
    deficit: Math.max(0, parseInt(row.deficit, 10) || 0),
    isLowStock: true,
  }));
}

/**
 * 8. Dispense Medicine atomically with transaction & row lock
 */
async function dispenseMedicine(data, userId = null) {
  if (!data || typeof data !== "object") {
    const error = new Error("Invalid dispensation payload");
    error.statusCode = 400;
    throw error;
  }

  const patientId = parseValidId(
    data.patientId !== undefined ? data.patientId : data.patient_id,
    "Patient ID"
  );
  const medicineId = parseValidId(
    data.medicineId !== undefined ? data.medicineId : data.medicine_id,
    "Medicine ID"
  );
  const batchId = parseValidId(
    data.batchId !== undefined ? data.batchId : data.batch_id,
    "Batch ID"
  );

  const rawQty =
    data.quantityDispensed !== undefined
      ? data.quantityDispensed
      : data.quantity !== undefined
      ? data.quantity
      : data.quantity_dispensed;
  const quantityDispensed = parseInt(rawQty, 10);
  if (Number.isNaN(quantityDispensed) || quantityDispensed <= 0) {
    const error = new Error("Quantity dispensed must be a positive integer greater than zero");
    error.statusCode = 400;
    throw error;
  }

  const rawPrescriptionId =
    data.prescriptionId !== undefined ? data.prescriptionId : data.prescription_id;
  const prescriptionId =
    rawPrescriptionId && Number(rawPrescriptionId) > 0 ? Number(rawPrescriptionId) : null;

  const rawPrescriptionItemId =
    data.prescriptionItemId !== undefined ? data.prescriptionItemId : data.prescription_item_id;
  const prescriptionItemId =
    rawPrescriptionItemId && Number(rawPrescriptionItemId) > 0
      ? Number(rawPrescriptionItemId)
      : null;

  const notes =
    data.notes && typeof data.notes === "string" && data.notes.trim()
      ? data.notes.trim()
      : null;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Verify Patient exists
    const patRes = await client.query("SELECT id FROM public.patients WHERE id = $1", [patientId]);
    if (patRes.rows.length === 0) {
      const error = new Error(`Patient with ID ${patientId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // 2. Lock Batch Row
    const batchRes = await client.query(
      `SELECT
        id,
        batch_number,
        medicine_id,
        quantity_in_stock,
        expiry_date,
        selling_price,
        status
      FROM public.medicine_batches
      WHERE id = $1
      FOR UPDATE`,
      [batchId]
    );

    if (batchRes.rows.length === 0) {
      const error = new Error(`Batch with ID ${batchId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const batch = batchRes.rows[0];

    // 3. Verify Batch belongs to selected Medicine
    if (batch.medicine_id !== medicineId) {
      const error = new Error(
        `Batch '${batch.batch_number}' does not belong to the selected medicine`
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Verify Batch is not expired
    const todayStr = new Date().toISOString().slice(0, 10);
    const isExpired = new Date(batch.expiry_date) < new Date(todayStr);
    if (isExpired || batch.status === "EXPIRED") {
      const error = new Error(
        `Cannot dispense from expired batch '${batch.batch_number}' (expired on ${batch.expiry_date})`
      );
      error.statusCode = 400;
      throw error;
    }

    // 5. Verify Sufficient Stock
    const currentStock = parseInt(batch.quantity_in_stock, 10);
    if (currentStock < quantityDispensed || batch.status === "DEPLETED") {
      const error = new Error(
        `Insufficient stock in batch '${batch.batch_number}': available ${currentStock}, requested ${quantityDispensed}`
      );
      error.statusCode = 400;
      throw error;
    }

    // 6. Calculate Price from Batch Selling Price (never client input)
    const unitPrice = parseFloat(batch.selling_price || 0);
    const totalPrice = parseFloat((unitPrice * quantityDispensed).toFixed(2));

    // 7. Update Batch Quantity & Status
    const newStock = currentStock - quantityDispensed;
    const newStatus = newStock === 0 ? "DEPLETED" : "AVAILABLE";

    await client.query(
      `UPDATE public.medicine_batches
       SET quantity_in_stock = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newStock, newStatus, batchId]
    );

    // 8. Insert Dispensation Record
    const dispRes = await client.query(
      `INSERT INTO public.medicine_dispensations (
        prescription_id,
        prescription_item_id,
        medicine_id,
        batch_id,
        patient_id,
        quantity_dispensed,
        unit_price,
        total_price,
        dispensed_by,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id,
        dispensation_number AS "dispensationNumber",
        prescription_id AS "prescriptionId",
        prescription_item_id AS "prescriptionItemId",
        medicine_id AS "medicineId",
        batch_id AS "batchId",
        patient_id AS "patientId",
        quantity_dispensed AS "quantityDispensed",
        unit_price AS "unitPrice",
        total_price AS "totalPrice",
        dispensed_by AS "dispensedBy",
        dispensed_at AS "dispensedAt",
        notes`,
      [
        prescriptionId,
        prescriptionItemId,
        medicineId,
        batchId,
        patientId,
        quantityDispensed,
        unitPrice.toFixed(2),
        totalPrice.toFixed(2),
        userId || null,
        notes,
      ]
    );

    await client.query("COMMIT");

    const record = dispRes.rows[0];

    // Non-blocking audit log
    auditService
      .logAuditEvent({
        eventType: "MEDICINE_DISPENSED",
        userId: userId || null,
        role: null,
        action: "CREATE",
        resourceType: "PHARMACY_DISPENSATION",
        resourceId: record.id,
        outcome: "SUCCESS",
      })
      .catch(() => {});

    return {
      ...record,
      unitPrice: parseFloat(record.unitPrice || 0),
      totalPrice: parseFloat(record.totalPrice || 0),
      quantityDispensed: parseInt(record.quantityDispensed, 10) || 0,
      remainingBatchStock: newStock,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 9. List Dispensation Records with Joined Metadata
 */
async function listDispensations(options = {}) {
  const { patientId, medicineId, prescriptionId } = options;
  const conditions = [];
  const params = [];

  if (patientId) {
    const pId = Number(patientId);
    if (pId && Number.isInteger(pId) && pId > 0) {
      params.push(pId);
      conditions.push(`d.patient_id = $${params.length}`);
    }
  }

  if (medicineId) {
    const mId = Number(medicineId);
    if (mId && Number.isInteger(mId) && mId > 0) {
      params.push(mId);
      conditions.push(`d.medicine_id = $${params.length}`);
    }
  }

  if (prescriptionId) {
    const rxId = Number(prescriptionId);
    if (rxId && Number.isInteger(rxId) && rxId > 0) {
      params.push(rxId);
      conditions.push(`d.prescription_id = $${params.length}`);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      d.id,
      d.dispensation_number AS "dispensationNumber",
      d.prescription_id AS "prescriptionId",
      d.prescription_item_id AS "prescriptionItemId",
      d.medicine_id AS "medicineId",
      d.batch_id AS "batchId",
      d.patient_id AS "patientId",
      d.quantity_dispensed AS "quantityDispensed",
      d.unit_price AS "unitPrice",
      d.total_price AS "totalPrice",
      d.dispensed_by AS "dispensedBy",
      d.dispensed_at AS "dispensedAt",
      d.notes,
      p.name AS "patientName",
      p.patient_id AS "patientCode",
      m.name AS "medicineName",
      m.medicine_code AS "medicineCode",
      b.batch_number AS "batchNumber",
      u.full_name AS "dispensedByName"
    FROM public.medicine_dispensations d
    JOIN public.patients p ON p.id = d.patient_id
    JOIN public.medicines m ON m.id = d.medicine_id
    JOIN public.medicine_batches b ON b.id = d.batch_id
    LEFT JOIN public.users u ON u.id = d.dispensed_by
    ${whereClause}
    ORDER BY d.dispensed_at DESC, d.id DESC
  `;

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    ...row,
    unitPrice: parseFloat(row.unitPrice || 0),
    totalPrice: parseFloat(row.totalPrice || 0),
    quantityDispensed: parseInt(row.quantityDispensed, 10) || 0,
  }));
}

module.exports = {
  listMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  addBatch,
  adjustStock,
  listLowStock,
  dispenseMedicine,
  listDispensations,
  ALLOWED_MEDICINE_STATUSES,
  ALLOWED_BATCH_STATUSES,
};
