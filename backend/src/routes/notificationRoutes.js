const express = require("express");
const notificationController = require("../controllers/notificationController");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// GET all notifications for the authenticated user
router.get(
  "/",
  requireRole(["admin", "doctor", "receptionist"]),
  notificationController.getNotifications
);

// GET unread count for the authenticated user
router.get(
  "/unread-count",
  requireRole(["admin", "doctor", "receptionist"]),
  notificationController.getUnreadCount
);

// PUT mark single notification as read
router.put(
  "/:id/read",
  requireRole(["admin", "doctor", "receptionist"]),
  notificationController.markAsRead
);

// PUT mark all notifications as read for current user
router.put(
  "/read-all",
  requireRole(["admin", "doctor", "receptionist"]),
  notificationController.markAllAsRead
);

// POST create/dispatch notification (admin only)
router.post(
  "/",
  requireRole(["admin"]),
  notificationController.createNotification
);

module.exports = router;
