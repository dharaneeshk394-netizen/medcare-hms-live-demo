const { pool } = require("../config/db");

function validateDateParam(dateStr, paramName) {
  if (!dateStr) return null;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof dateStr !== "string" || !regex.test(dateStr)) {
    const error = new Error(`Invalid ${paramName} format. Expected YYYY-MM-DD`);
    error.statusCode = 400;
    throw error;
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid ${paramName} date value`);
    error.statusCode = 400;
    throw error;
  }
  return dateStr;
}

/**
 * List audit logs with read-only parameterized filtering and pagination.
 */
async function listAuditLogs(filters = {}) {
  const conditions = [];
  const params = [];

  // Date filtering
  const startDate = validateDateParam(filters.startDate, "startDate");
  const endDate = validateDateParam(filters.endDate, "endDate");

  if (startDate) {
    params.push(startDate);
    conditions.push(`a.created_at >= $${params.length}::timestamp`);
  }
  if (endDate) {
    params.push(`${endDate} 23:59:59`);
    conditions.push(`a.created_at <= $${params.length}::timestamp`);
  }

  // Event type filtering
  if (filters.eventType && typeof filters.eventType === "string" && filters.eventType.trim()) {
    params.push(filters.eventType.trim());
    conditions.push(`a.event_type = $${params.length}`);
  }

  // User ID filtering
  if (filters.userId !== undefined && filters.userId !== null && filters.userId !== "") {
    const uId = parseInt(filters.userId, 10);
    if (!Number.isNaN(uId) && uId > 0) {
      params.push(uId);
      conditions.push(`a.user_id = $${params.length}`);
    }
  }

  // Action filtering
  if (filters.action && typeof filters.action === "string" && filters.action.trim()) {
    params.push(filters.action.trim().toUpperCase());
    conditions.push(`a.action = $${params.length}`);
  }

  // Outcome filtering
  if (filters.outcome && typeof filters.outcome === "string" && filters.outcome.trim()) {
    params.push(filters.outcome.trim().toUpperCase());
    conditions.push(`a.outcome = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count query
  const countQuery = `
    SELECT COUNT(*)::integer AS count
    FROM public.audit_logs a
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
      a.id,
      a.event_type AS "eventType",
      a.user_id AS "userId",
      a.role,
      a.action,
      a.resource_type AS "resourceType",
      a.resource_id AS "resourceId",
      a.outcome,
      a.ip_address AS "ipAddress",
      a.created_at AS "createdAt",
      u.full_name AS "userName",
      u.username
    FROM public.audit_logs a
    LEFT JOIN public.users u ON u.id = a.user_id
    ${whereClause}
    ORDER BY a.created_at DESC, a.id DESC
    ${limitClause} ${offsetClause}
  `;

  const dataResult = await pool.query(dataQuery, paginatedParams);

  return {
    totalCount,
    limit,
    offset,
    logs: dataResult.rows,
  };
}

module.exports = {
  listAuditLogs,
};
