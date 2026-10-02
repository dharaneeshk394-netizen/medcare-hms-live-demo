const express = require("express");
const staffController = require("../controllers/staffController");
const {
  validateIdParam,
  validateStaffQuery,
  validateCreateStaff,
  validateUpdateStaff,
} = require("../middleware/validation");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// GET all staff members (admin, doctor, receptionist)
router.get(
  "/",
  requireRole(["admin", "doctor", "receptionist"]),
  validateStaffQuery,
  staffController.getStaff
);

// GET single staff member by ID (admin, doctor, receptionist)
router.get(
  "/:id",
  requireRole(["admin", "doctor", "receptionist"]),
  validateIdParam("id"),
  staffController.getStaffById
);

// CREATE staff member (admin only)
router.post(
  "/",
  requireRole(["admin"]),
  validateCreateStaff,
  staffController.createStaff
);

// UPDATE staff member (admin only)
router.put(
  "/:id",
  requireRole(["admin"]),
  validateIdParam("id"),
  validateUpdateStaff,
  staffController.updateStaff
);

// DEACTIVATE staff member (admin only)
router.patch(
  "/:id/deactivate",
  requireRole(["admin"]),
  validateIdParam("id"),
  staffController.deactivateStaff
);

module.exports = router;
