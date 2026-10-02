const { pool } = require("../config/db");
const auditService = require("./auditService");

/**
 * Normalizes a database row to a structured Staff object.
 *
 * @param {Object} row - Raw SQL result row
 * @returns {Object} Normalized Staff object
 */
function formatStaffRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    staffNumber: row.staff_number,
    staff_number: row.staff_number,
    firstName: row.first_name,
    first_name: row.first_name,
    lastName: row.last_name,
    last_name: row.last_name,
    fullName: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
    full_name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
    departmentId: row.department_id,
    department_id: row.department_id,
    departmentName: row.department_name || null,
    department_name: row.department_name || null,
    designation: row.designation,
    phone: row.phone,
    email: row.email,
    dateOfJoining: row.date_of_joining
      ? typeof row.date_of_joining === "string"
        ? row.date_of_joining.slice(0, 10)
        : row.date_of_joining.toISOString().slice(0, 10)
      : null,
    date_of_joining: row.date_of_joining
      ? typeof row.date_of_joining === "string"
        ? row.date_of_joining.slice(0, 10)
        : row.date_of_joining.toISOString().slice(0, 10)
      : null,
    employmentStatus: row.employment_status,
    employment_status: row.employment_status,
    status: row.employment_status,
    createdBy: row.created_by,
    created_by: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

/**
 * Service: getStaff
 *
 * Retrieves paginated staff records with optional filtering by department,
 * status, designation, and search term.
 *
 * @param {Object} [filters={}]
 * @param {number|string} [filters.departmentId]
 * @param {string} [filters.employmentStatus]
 * @param {string} [filters.status]
 * @param {string} [filters.designation]
 * @param {string} [filters.search]
 * @param {number|string} [filters.page=1]
 * @param {number|string} [filters.limit=10]
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
async function getStaff(filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const whereClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  const deptId = filters.departmentId || filters.department_id;
  if (deptId !== undefined && deptId !== null && deptId !== "") {
    whereClauses.push(`s.department_id = $${paramIndex++}`);
    queryParams.push(Number(deptId));
  }

  const status = filters.employmentStatus || filters.employment_status || filters.status;
  if (status && String(status).toUpperCase() !== "ALL") {
    whereClauses.push(`UPPER(s.employment_status) = UPPER($${paramIndex++})`);
    queryParams.push(String(status).trim());
  }

  if (filters.designation && String(filters.designation).trim() && String(filters.designation).toUpperCase() !== "ALL") {
    whereClauses.push(`LOWER(s.designation) = LOWER($${paramIndex++})`);
    queryParams.push(String(filters.designation).trim());
  }

  if (filters.search && String(filters.search).trim()) {
    const searchPattern = `%${String(filters.search).trim()}%`;
    whereClauses.push(
      `(s.staff_number ILIKE $${paramIndex} OR s.first_name ILIKE $${paramIndex} OR s.last_name ILIKE $${paramIndex} OR s.designation ILIKE $${paramIndex} OR s.phone ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex} OR d.name ILIKE $${paramIndex})`
    );
    queryParams.push(searchPattern);
    paramIndex++;
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countQuery = `
    SELECT COUNT(*)::integer AS total
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    ${whereString}
  `;

  const countResult = await pool.query(countQuery, queryParams);
  const total = countResult.rows[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const selectQuery = `
    SELECT
      s.id,
      s.staff_number,
      s.first_name,
      s.last_name,
      s.department_id,
      d.name AS department_name,
      s.designation,
      s.phone,
      s.email,
      s.date_of_joining,
      s.employment_status,
      s.created_by,
      u.full_name AS created_by_name,
      s.created_at,
      s.updated_at
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN users u ON s.created_by = u.id
    ${whereString}
    ORDER BY s.id DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const dataQueryParams = [...queryParams, limit, offset];
  const result = await pool.query(selectQuery, dataQueryParams);

  const data = result.rows.map(formatStaffRecord);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Service: getStaffById
 *
 * Retrieves a single staff member by numeric primary key.
 *
 * @param {number|string} id - Staff primary key ID
 * @returns {Promise<Object|null>} Staff record or null if not found
 */
async function getStaffById(id) {
  const numericId = Number(id);
  if (!numericId || Number.isNaN(numericId)) {
    return null;
  }

  const query = `
    SELECT
      s.id,
      s.staff_number,
      s.first_name,
      s.last_name,
      s.department_id,
      d.name AS department_name,
      s.designation,
      s.phone,
      s.email,
      s.date_of_joining,
      s.employment_status,
      s.created_by,
      u.full_name AS created_by_name,
      s.created_at,
      s.updated_at
    FROM staff s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN users u ON s.created_by = u.id
    WHERE s.id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [numericId]);
  if (result.rows.length === 0) {
    return null;
  }

  return formatStaffRecord(result.rows[0]);
}

/**
 * Service: createStaff
 *
 * Validates related records and creates a new staff member with server-generated staff_number.
 *
 * @param {Object} data - Input payload
 * @param {Object} [userContext={}] - Authenticated user context
 * @returns {Promise<Object>} Created staff record
 */
async function createStaff(data, userContext = {}) {
  const firstName = String(data.firstName || data.first_name || "").trim();
  const lastName = String(data.lastName || data.last_name || "").trim();
  const designation = String(data.designation || "").trim();
  const phone = String(data.phone || "").trim();
  const email = data.email ? String(data.email).trim() : null;
  const dateOfJoining = data.dateOfJoining || data.date_of_joining || new Date().toISOString().slice(0, 10);
  const employmentStatus = String(
    data.employmentStatus || data.employment_status || data.status || "ACTIVE"
  ).trim().toUpperCase();

  if (!firstName) {
    const error = new Error("First name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!lastName) {
    const error = new Error("Last name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!designation) {
    const error = new Error("Designation is required");
    error.statusCode = 400;
    throw error;
  }

  if (!phone) {
    const error = new Error("Phone number is required");
    error.statusCode = 400;
    throw error;
  }

  let departmentId = data.departmentId !== undefined ? data.departmentId : data.department_id;
  if (departmentId !== undefined && departmentId !== null && departmentId !== "") {
    departmentId = Number(departmentId);
    const deptCheck = await pool.query("SELECT id, name FROM departments WHERE id = $1 LIMIT 1", [departmentId]);
    if (deptCheck.rows.length === 0) {
      const error = new Error(`Department with ID ${departmentId} does not exist`);
      error.statusCode = 400;
      throw error;
    }
  } else {
    departmentId = null;
  }

  const createdBy = userContext.userId || null;

  const insertQuery = `
    INSERT INTO staff (
      first_name,
      last_name,
      department_id,
      designation,
      phone,
      email,
      date_of_joining,
      employment_status,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `;

  const result = await pool.query(insertQuery, [
    firstName,
    lastName,
    departmentId,
    designation,
    phone,
    email,
    dateOfJoining,
    employmentStatus,
    createdBy,
  ]);

  const newId = result.rows[0].id;
  const createdRecord = await getStaffById(newId);

  await auditService.logAuditEvent({
    eventType: "STAFF_CREATE",
    userId: userContext.userId || null,
    role: userContext.role || null,
    action: "CREATE",
    resourceType: "STAFF",
    resourceId: newId,
    outcome: "SUCCESS",
  });

  return createdRecord;
}

/**
 * Service: updateStaff
 *
 * Updates editable fields of an existing staff member.
 *
 * @param {number|string} id - Staff ID
 * @param {Object} data - Update payload
 * @param {Object} [userContext={}] - Authenticated user context
 * @returns {Promise<Object>} Updated staff record
 */
async function updateStaff(id, data, userContext = {}) {
  const numericId = Number(id);
  if (!numericId || Number.isNaN(numericId)) {
    const error = new Error("Valid staff ID is required");
    error.statusCode = 400;
    throw error;
  }

  const existing = await getStaffById(numericId);
  if (!existing) {
    const error = new Error("Staff member not found");
    error.statusCode = 404;
    throw error;
  }

  const updates = [];
  const queryParams = [numericId];
  let paramIndex = 2;

  if (data.firstName !== undefined || data.first_name !== undefined) {
    const val = String(data.firstName !== undefined ? data.firstName : data.first_name).trim();
    if (!val) {
      const error = new Error("First name cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    updates.push(`first_name = $${paramIndex++}`);
    queryParams.push(val);
  }

  if (data.lastName !== undefined || data.last_name !== undefined) {
    const val = String(data.lastName !== undefined ? data.lastName : data.last_name).trim();
    if (!val) {
      const error = new Error("Last name cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    updates.push(`last_name = $${paramIndex++}`);
    queryParams.push(val);
  }

  const deptId = data.departmentId !== undefined ? data.departmentId : data.department_id;
  if (deptId !== undefined) {
    if (deptId === null || deptId === "") {
      updates.push(`department_id = NULL`);
    } else {
      const numDeptId = Number(deptId);
      const deptCheck = await pool.query("SELECT id FROM departments WHERE id = $1 LIMIT 1", [numDeptId]);
      if (deptCheck.rows.length === 0) {
        const error = new Error(`Department with ID ${numDeptId} does not exist`);
        error.statusCode = 400;
        throw error;
      }
      updates.push(`department_id = $${paramIndex++}`);
      queryParams.push(numDeptId);
    }
  }

  if (data.designation !== undefined) {
    const val = String(data.designation || "").trim();
    if (!val) {
      const error = new Error("Designation cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    updates.push(`designation = $${paramIndex++}`);
    queryParams.push(val);
  }

  if (data.phone !== undefined) {
    const val = String(data.phone || "").trim();
    if (!val) {
      const error = new Error("Phone number cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    updates.push(`phone = $${paramIndex++}`);
    queryParams.push(val);
  }

  if (data.email !== undefined) {
    const val = data.email ? String(data.email).trim() : null;
    updates.push(`email = $${paramIndex++}`);
    queryParams.push(val);
  }

  if (data.dateOfJoining !== undefined || data.date_of_joining !== undefined) {
    const val = String(data.dateOfJoining !== undefined ? data.dateOfJoining : data.date_of_joining).trim();
    updates.push(`date_of_joining = $${paramIndex++}`);
    queryParams.push(val);
  }

  if (data.employmentStatus !== undefined || data.employment_status !== undefined || data.status !== undefined) {
    const val = String(
      data.employmentStatus !== undefined
        ? data.employmentStatus
        : data.employment_status !== undefined
        ? data.employment_status
        : data.status
    ).trim().toUpperCase();
    updates.push(`employment_status = $${paramIndex++}`);
    queryParams.push(val);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  const updateQuery = `
    UPDATE staff
    SET ${updates.join(", ")}
    WHERE id = $1
  `;

  await pool.query(updateQuery, queryParams);

  await auditService.logAuditEvent({
    eventType: "STAFF_UPDATE",
    userId: userContext.userId || null,
    role: userContext.role || null,
    action: "UPDATE",
    resourceType: "STAFF",
    resourceId: numericId,
    outcome: "SUCCESS",
  });

  return await getStaffById(numericId);
}

/**
 * Service: deactivateStaff
 *
 * Sets staff member employment status to INACTIVE.
 *
 * @param {number|string} id - Staff ID
 * @param {Object} [userContext={}] - Authenticated user context
 * @returns {Promise<Object>} Deactivated staff record
 */
async function deactivateStaff(id, userContext = {}) {
  return await updateStaff(id, { employmentStatus: "INACTIVE" }, userContext);
}

module.exports = {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deactivateStaff,
};
