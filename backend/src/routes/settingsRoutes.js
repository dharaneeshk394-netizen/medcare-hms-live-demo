const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { requireRole } = require("../middleware/auth");

/**
 * Hospital System Settings API Routes
 *
 * GET /api/v1/settings -> Authenticated users (view settings/hospital profile)
 * PUT /api/v1/settings -> Admin only (update settings)
 */

// Authenticated hospital staff roles can view settings (for printables, headers, etc.)
const anyStaffRole = requireRole(["admin", "doctor", "receptionist"]);
const adminOnly = requireRole(["admin"]);

router.get("/", anyStaffRole, settingsController.getSettings);
router.put("/", adminOnly, settingsController.updateSettings);

module.exports = router;
