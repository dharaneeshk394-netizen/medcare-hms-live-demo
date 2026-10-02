const { pool } = require("../config/db");

/**
 * Log a security audit event to the audit_logs table.
 * Non-blocking: Errors are caught and logged to console.error, never breaking business execution.
 *
 * @param {Object} eventParams
 * @param {string} eventParams.eventType - e.g. 'AUTH_LOGIN_SUCCESS', 'PATIENT_DELETE'
 * @param {number|null} [eventParams.userId] - Authenticated user ID (or null)
 * @param {string|null} [eventParams.role] - User role (or null)
 * @param {string} eventParams.action - 'LOGIN', 'LOGOUT', 'ACCESS', 'CREATE', 'UPDATE', 'DELETE'
 * @param {string|null} [eventParams.resourceType] - 'AUTH', 'PATIENT', 'DOCTOR', etc.
 * @param {string|number|null} [eventParams.resourceId] - Identifier of the affected resource
 * @param {string} eventParams.outcome - 'SUCCESS' or 'FAILURE'
 * @param {string|null} [eventParams.ipAddress] - Client IP address
 */
async function logAuditEvent({
  eventType,
  userId = null,
  role = null,
  action,
  resourceType = null,
  resourceId = null,
  outcome,
  ipAddress = null,
}) {
  try {
    const resId =
      resourceId !== null && resourceId !== undefined
        ? String(resourceId)
        : null;
    const uId =
      userId !== null && userId !== undefined ? Number(userId) || null : null;

    await pool.query(
      `INSERT INTO audit_logs (
        event_type,
        user_id,
        role,
        action,
        resource_type,
        resource_id,
        outcome,
        ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        eventType,
        uId,
        role || null,
        action,
        resourceType || null,
        resId,
        outcome,
        ipAddress || null,
      ]
    );
  } catch (err) {
    // Non-blocking: record error safely without interrupting the primary application workflow
    console.error("Audit logging error:", err.message);
  }
}

module.exports = {
  logAuditEvent,
};
