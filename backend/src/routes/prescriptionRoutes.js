const express = require("express");
const prescriptionController = require("../controllers/prescriptionController");
const {
  validateIdParam,
  validatePrescriptionQuery,
  validateCreatePrescription,
  validateUpdatePrescription,
  validateAddPrescriptionItem,
  validateUpdatePrescriptionItem,
} = require("../middleware/validation");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// GET all prescriptions (admin, doctor, receptionist)
router.get(
  "/",
  requireRole(["admin", "doctor", "receptionist"]),
  validatePrescriptionQuery,
  prescriptionController.getPrescriptions
);

// GET single prescription by ID (admin, doctor, receptionist)
router.get(
  "/:id",
  requireRole(["admin", "doctor", "receptionist"]),
  validateIdParam("id"),
  prescriptionController.getPrescriptionById
);

// CREATE prescription (admin, doctor)
router.post(
  "/",
  requireRole(["admin", "doctor"]),
  validateCreatePrescription,
  prescriptionController.createPrescription
);

// UPDATE prescription (admin, doctor)
router.put(
  "/:id",
  requireRole(["admin", "doctor"]),
  validateIdParam("id"),
  validateUpdatePrescription,
  prescriptionController.updatePrescription
);

// CANCEL prescription (admin, doctor)
router.post(
  "/:id/cancel",
  requireRole(["admin", "doctor"]),
  validateIdParam("id"),
  prescriptionController.cancelPrescription
);

// ADD item to prescription (admin, doctor)
router.post(
  "/:id/items",
  requireRole(["admin", "doctor"]),
  validateIdParam("id"),
  validateAddPrescriptionItem,
  prescriptionController.addPrescriptionItem
);

// UPDATE item in prescription (admin, doctor)
router.put(
  "/items/:itemId",
  requireRole(["admin", "doctor"]),
  validateIdParam("itemId"),
  validateUpdatePrescriptionItem,
  prescriptionController.updatePrescriptionItem
);

// REMOVE item from prescription (admin, doctor)
router.delete(
  "/items/:itemId",
  requireRole(["admin", "doctor"]),
  validateIdParam("itemId"),
  prescriptionController.removePrescriptionItem
);

module.exports = router;
