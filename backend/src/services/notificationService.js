const { pool } = require("../config/db");
const auditService = require("./auditService");

const ALLOWED_NOTIFICATION_TYPES = [
  "APPOINTMENT",
  "LAB_RESULT",
  "PHARMACY",
  "ADMISSION",
  "BILLING",
  "SYSTEM",
];

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
 * 1. List notifications for a specific user with optional filters
 */
async function listNotifications(userId, filters = {}) {
  const validUserId = parseValidId(userId, "User ID");
  const conditions = ["n.user_id = $1"];
  const params = [validUserId];

  if (filters.isRead !== undefined && filters.isRead !== null && filters.isRead !== "") {
    const isReadBool = String(filters.isRead).toLowerCase() === "true";
    params.push(isReadBool);
    conditions.push(`n.is_read = $${params.length}`);
  }

  if (filters.type && typeof filters.type === "string" && filters.type !== "All") {
    const normalizedType = filters.type.trim().toUpperCase();
    if (ALLOWED_NOTIFICATION_TYPES.includes(normalizedType)) {
      params.push(normalizedType);
      conditions.push(`n.type = $${params.length}`);
    }
  }

  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);

  params.push(limit);
  const limitClause = `LIMIT $${params.length}`;
  params.push(offset);
  const offsetClause = `OFFSET $${params.length}`;

  const query = `
    SELECT
      n.id,
      n.user_id AS "userId",
      n.title,
      n.message,
      n.type,
      n.link,
      n.is_read AS "isRead",
      n.read_at AS "readAt",
      n.created_at AS "createdAt"
    FROM public.notifications n
    WHERE ${conditions.join(" AND ")}
    ORDER BY n.created_at DESC
    ${limitClause} ${offsetClause}
  `;

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    ...row,
    isRead: Boolean(row.isRead),
  }));
}

/**
 * 2. Get unread notification count for a specific user
 */
async function getUnreadCount(userId) {
  const validUserId = parseValidId(userId, "User ID");

  const query = `
    SELECT COUNT(*)::integer AS "unreadCount"
    FROM public.notifications
    WHERE user_id = $1 AND is_read = false
  `;

  const result = await pool.query(query, [validUserId]);
  return parseInt(result.rows[0].unreadCount, 10) || 0;
}

/**
 * 3. Mark single notification as read with strict IDOR ownership check
 */
async function markAsRead(notificationId, userId) {
  const validNotificationId = parseValidId(notificationId, "Notification ID");
  const validUserId = parseValidId(userId, "User ID");

  const query = `
    UPDATE public.notifications
    SET is_read = true, read_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND user_id = $2
    RETURNING
      id,
      user_id AS "userId",
      title,
      message,
      type,
      link,
      is_read AS "isRead",
      read_at AS "readAt",
      created_at AS "createdAt"
  `;

  const result = await pool.query(query, [validNotificationId, validUserId]);

  if (result.rows.length === 0) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  const row = result.rows[0];
  return {
    ...row,
    isRead: Boolean(row.isRead),
  };
}

/**
 * 4. Mark all unread notifications as read for a specific user
 */
async function markAllAsRead(userId) {
  const validUserId = parseValidId(userId, "User ID");

  const query = `
    UPDATE public.notifications
    SET is_read = true, read_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND is_read = false
    RETURNING id
  `;

  const result = await pool.query(query, [validUserId]);
  const updatedCount = result.rowCount || 0;

  auditService
    .logAuditEvent({
      eventType: "NOTIFICATION_READ_ALL",
      userId: validUserId,
      role: null,
      action: "UPDATE",
      resourceType: "NOTIFICATION",
      resourceId: null,
      outcome: "SUCCESS",
    })
    .catch(() => {});

  return {
    success: true,
    updatedCount,
  };
}

/**
 * 5. Create a new notification
 */
async function createNotification(data, creatorId = null) {
  if (!data || typeof data !== "object") {
    const error = new Error("Invalid notification payload");
    error.statusCode = 400;
    throw error;
  }

  const targetUserId = parseValidId(data.userId || data.user_id, "Target User ID");

  if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
    const error = new Error("Notification title is required");
    error.statusCode = 400;
    throw error;
  }

  if (!data.message || typeof data.message !== "string" || !data.message.trim()) {
    const error = new Error("Notification message is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedType =
    data.type && ALLOWED_NOTIFICATION_TYPES.includes(String(data.type).toUpperCase())
      ? String(data.type).toUpperCase()
      : "SYSTEM";

  const link = data.link && typeof data.link === "string" ? data.link.trim() : null;

  // Verify target user exists
  const userCheck = await pool.query("SELECT id FROM public.users WHERE id = $1", [targetUserId]);
  if (userCheck.rows.length === 0) {
    const error = new Error(`User with ID ${targetUserId} not found`);
    error.statusCode = 404;
    throw error;
  }

  const query = `
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      user_id AS "userId",
      title,
      message,
      type,
      link,
      is_read AS "isRead",
      read_at AS "readAt",
      created_at AS "createdAt"
  `;

  const result = await pool.query(query, [
    targetUserId,
    data.title.trim(),
    data.message.trim(),
    normalizedType,
    link,
  ]);

  const created = result.rows[0];

  auditService
    .logAuditEvent({
      eventType: "NOTIFICATION_DISPATCH",
      userId: creatorId,
      role: null,
      action: "CREATE",
      resourceType: "NOTIFICATION",
      resourceId: created.id,
      outcome: "SUCCESS",
    })
    .catch(() => {});

  return {
    ...created,
    isRead: Boolean(created.isRead),
  };
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  ALLOWED_NOTIFICATION_TYPES,
};
