const express = require("express");
const medicalRecordController = require("../controllers/medicalRecordController");
const {
  validateIdParam,
  validateMedicalRecordQuery,
  validateCreateMedicalRecord,
  validateUpdateMedicalRecord,
} = require("../middleware/validation");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// GET all medical records (admin, doctor, receptionist)
router.get(
  "/",
  requireRole(["admin", "doctor", "receptionist"]),
  validateMedicalRecordQuery,
  medicalRecordController.getMedicalRecords
);

// GET single medical record by ID (admin, doctor, receptionist)
router.get(
  "/:id",
  requireRole(["admin", "doctor", "receptionist"]),
  validateIdParam("id"),
  medicalRecordController.getMedicalRecordById
);

// CREATE medical record (admin, doctor)
router.post(
  "/",
  requireRole(["admin", "doctor"]),
  validateCreateMedicalRecord,
  medicalRecordController.createMedicalRecord
);

// UPDATE medical record (admin, doctor)
router.put(
  "/:id",
  requireRole(["admin", "doctor"]),
  validateIdParam("id"),
  validateUpdateMedicalRecord,
  medicalRecordController.updateMedicalRecord
);

module.exports = router;
