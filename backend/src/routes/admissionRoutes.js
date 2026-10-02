const express = require("express");

const admissionController = require("../controllers/admissionController");
const {
  validateIdParam,
  validateQuery,
  validateCreateAdmission,
  validateUpdateAdmission,
} = require("../middleware/validation");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// Get all admissions
router.get(
  "/",
  validateQuery,
  admissionController.getAdmissions
);

// Get one admission
router.get(
  "/:id",
  validateIdParam("id"),
  admissionController.getAdmissionById
);

// Create admission
router.post(
  "/",
  validateCreateAdmission,
  admissionController.createAdmission
);

// Update admission
router.put(
  "/:id",
  validateIdParam("id"),
  validateUpdateAdmission,
  admissionController.updateAdmission
);

// Delete admission (Admin only)
router.delete(
  "/:id",
  requireRole("admin"),
  validateIdParam("id"),
  admissionController.deleteAdmission
);

module.exports = router;
