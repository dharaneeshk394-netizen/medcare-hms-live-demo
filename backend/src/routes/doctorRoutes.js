const express = require("express");

const doctorController = require("../controllers/doctorController");
const {
  validateIdParam,
  validateQuery,
  validateCreateDoctor,
  validateUpdateDoctor,
} = require("../middleware/validation");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// Get all doctors
router.get("/", validateQuery, doctorController.getDoctors);

// Get one doctor by ID
router.get("/:id", validateIdParam("id"), doctorController.getDoctorById);

// Create doctor (Admin only)
router.post(
  "/",
  requireRole("admin"),
  validateCreateDoctor,
  doctorController.createDoctor
);

// Update doctor (Admin only)
router.put(
  "/:id",
  requireRole("admin"),
  validateIdParam("id"),
  validateUpdateDoctor,
  doctorController.updateDoctor
);

// Delete doctor (Admin only)
router.delete(
  "/:id",
  requireRole("admin"),
  validateIdParam("id"),
  doctorController.deleteDoctor
);

module.exports = router;
