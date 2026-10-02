const notificationService = require("../services/notificationService");

function getSessionUserId(req) {
  const userId = req.user?.id || req.session?.user?.id;
  if (!userId) {
    const error = new Error("User session not found or unauthenticated");
    error.statusCode = 401;
    throw error;
  }
  return userId;
}

/**
 * GET /api/v1/notifications
 * Roles: admin, doctor, receptionist
 */
async function getNotifications(req, res) {
  try {
    const userId = getSessionUserId(req);
    const notifications = await notificationService.listNotifications(userId, req.query);
    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Error in getNotifications:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve notifications",
    });
  }
}

/**
 * GET /api/v1/notifications/unread-count
 * Roles: admin, doctor, receptionist
 */
async function getUnreadCount(req, res) {
  try {
    const userId = getSessionUserId(req);
    const count = await notificationService.getUnreadCount(userId);
    res.status(200).json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve unread notification count",
    });
  }
}

/**
 * PUT /api/v1/notifications/:id/read
 * Roles: admin, doctor, receptionist
 */
async function markAsRead(req, res) {
  try {
    const userId = getSessionUserId(req);
    const updated = await notificationService.markAsRead(req.params.id, userId);
    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: updated,
    });
  } catch (error) {
    console.error("Error in markAsRead:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update notification status",
    });
  }
}

/**
 * PUT /api/v1/notifications/read-all
 * Roles: admin, doctor, receptionist
 */
async function markAllAsRead(req, res) {
  try {
    const userId = getSessionUserId(req);
    const result = await notificationService.markAllAsRead(userId);
    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: result,
    });
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to mark all notifications as read",
    });
  }
}

/**
 * POST /api/v1/notifications
 * Roles: admin
 */
async function createNotification(req, res) {
  try {
    const creatorId = req.user?.id || req.session?.user?.id || null;
    const created = await notificationService.createNotification(req.body, creatorId);
    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: created,
    });
  } catch (error) {
    console.error("Error in createNotification:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create notification",
    });
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
};
