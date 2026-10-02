const { pool } = require("../config/db");
const auditService = require("./auditService");

const ALLOWED_ROLES = ["admin", "doctor", "receptionist"];

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
 * List users with pagination, search, and filters.
 * Excludes password_hash entirely.
 */
async function listUsers(filters = {}) {
  const conditions = [];
  const params = [];

  // Search by name, username, or email
  if (filters.search && typeof filters.search === "string" && filters.search.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(full_name) LIKE $${params.length} OR LOWER(username) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`);
  }

  // Filter by role
  if (filters.role && typeof filters.role === "string" && filters.role !== "All") {
    const normalizedRole = filters.role.trim().toLowerCase();
    if (ALLOWED_ROLES.includes(normalizedRole)) {
      params.push(normalizedRole);
      conditions.push(`role = $${params.length}`);
    }
  }

  // Filter by active status (is_active boolean)
  if (filters.isActive !== undefined && filters.isActive !== null && filters.isActive !== "") {
    const isActiveBool = String(filters.isActive).toLowerCase() === "true";
    params.push(isActiveBool);
    conditions.push(`is_active = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count query
  const countQuery = `
    SELECT COUNT(*)::integer AS count
    FROM public.users
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const totalCount = countResult.rows[0].count;

  // Pagination
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);

  const paginatedParams = [...params];
  paginatedParams.push(limit);
  const limitClause = `LIMIT $${paginatedParams.length}`;
  paginatedParams.push(offset);
  const offsetClause = `OFFSET $${paginatedParams.length}`;

  const dataQuery = `
    SELECT
      id,
      full_name AS "fullName",
      username,
      email,
      role,
      is_active AS "isActive",
      doctor_id AS "doctorId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM public.users
    ${whereClause}
    ORDER BY id ASC
    ${limitClause} ${offsetClause}
  `;

  const dataResult = await pool.query(dataQuery, paginatedParams);

  return {
    totalCount,
    limit,
    offset,
    users: dataResult.rows,
  };
}

/**
 * Get single user by ID. Excludes password_hash.
 */
async function getUserById(id) {
  const validId = parseValidId(id, "User ID");

  const query = `
    SELECT
      id,
      full_name AS "fullName",
      username,
      email,
      role,
      is_active AS "isActive",
      doctor_id AS "doctorId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM public.users
    WHERE id = $1
  `;

  const result = await pool.query(query, [validId]);
  if (result.rows.length === 0) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

/**
 * Update user role. Admin only.
 */
async function updateUserRole(id, newRole, adminUserId, ipAddress = null) {
  const validId = parseValidId(id, "User ID");

  if (!newRole || typeof newRole !== "string" || !ALLOWED_ROLES.includes(newRole.trim().toLowerCase())) {
    const error = new Error(`Invalid role. Allowed roles are: ${ALLOWED_ROLES.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedRole = newRole.trim().toLowerCase();

  const query = `
    UPDATE public.users
    SET role = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING
      id,
      full_name AS "fullName",
      username,
      email,
      role,
      is_active AS "isActive",
      doctor_id AS "doctorId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const result = await pool.query(query, [normalizedRole, validId]);
  if (result.rows.length === 0) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const updatedUser = result.rows[0];

  auditService
    .logAuditEvent({
      eventType: "USER_ROLE_UPDATE",
      userId: adminUserId,
      role: "admin",
      action: "UPDATE",
      resourceType: "USER",
      resourceId: validId,
      outcome: "SUCCESS",
      ipAddress,
    })
    .catch(() => {});

  return updatedUser;
}

/**
 * Update user active status (is_active). Admin only.
 */
async function updateUserStatus(id, isActive, adminUserId, ipAddress = null) {
  const validId = parseValidId(id, "User ID");

  if (typeof isActive !== "boolean") {
    const error = new Error("isActive status must be a boolean (true or false)");
    error.statusCode = 400;
    throw error;
  }

  const query = `
    UPDATE public.users
    SET is_active = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING
      id,
      full_name AS "fullName",
      username,
      email,
      role,
      is_active AS "isActive",
      doctor_id AS "doctorId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  const result = await pool.query(query, [isActive, validId]);
  if (result.rows.length === 0) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const updatedUser = result.rows[0];

  auditService
    .logAuditEvent({
      eventType: "USER_STATUS_UPDATE",
      userId: adminUserId,
      role: "admin",
      action: "UPDATE",
      resourceType: "USER",
      resourceId: validId,
      outcome: "SUCCESS",
      ipAddress,
    })
    .catch(() => {});

  return updatedUser;
}

module.exports = {
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  ALLOWED_ROLES,
};
