const express = require("express");

const patientController = require("../controllers/patientController");
const exportController = require("../controllers/exportController");
const {
  validateIdParam,
  validateQuery,
  validateCreatePatient,
  validateUpdatePatient,
} = require("../middleware/validation");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// EXPORT patients CSV (admin, doctor, receptionist)
router.get(
  "/export",
  requireRole(["admin", "doctor", "receptionist"]),
  exportController.exportPatients
);

// GET all patients
router.get("/", validateQuery, patientController.getPatients);

// GET one patient
router.get("/:id", validateIdParam("id"), patientController.getPatientById);

// CREATE patient
router.post("/", validateCreatePatient, patientController.createPatient);

// UPDATE patient
router.put(
  "/:id",
  validateIdParam("id"),
  validateUpdatePatient,
  patientController.updatePatient
);

// DELETE patient (Admin only)
router.delete(
  "/:id",
  requireRole("admin"),
  validateIdParam("id"),
  patientController.deletePatient
);

module.exports = router;
