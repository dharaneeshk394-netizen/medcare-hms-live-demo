const express = require("express");
const auditLogController = require("../controllers/auditLogController");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/v1/audit-logs - Restricted to admin role only
router.get(
  "/",
  requireRole(["admin"]),
  auditLogController.getAuditLogs
);

module.exports = router;
