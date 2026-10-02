const express = require("express");

const appointmentController = require("../controllers/appointmentController");
const exportController = require("../controllers/exportController");
const {
  validateIdParam,
  validateQuery,
  validateCreateAppointment,
  validateUpdateAppointment,
} = require("../middleware/validation");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// EXPORT appointments CSV (admin, doctor, receptionist)
router.get(
  "/export",
  requireRole(["admin", "doctor", "receptionist"]),
  exportController.exportAppointments
);

// Get all appointments
router.get("/", validateQuery, appointmentController.getAppointments);

// Get one appointment by ID
router.get("/:id", validateIdParam("id"), appointmentController.getAppointmentById);

// Create appointment
router.post("/", validateCreateAppointment, appointmentController.createAppointment);

// Update appointment
router.put(
  "/:id",
  validateIdParam("id"),
  validateUpdateAppointment,
  appointmentController.updateAppointment
);

// Delete appointment (Admin only)
router.delete(
  "/:id",
  requireRole("admin"),
  validateIdParam("id"),
  appointmentController.deleteAppointment
);

module.exports = router;
