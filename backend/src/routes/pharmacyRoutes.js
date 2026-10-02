const express = require("express");
const pharmacyController = require("../controllers/pharmacyController");
const exportController = require("../controllers/exportController");
const { requireRole } = require("../middleware/auth");
const { stockAdjustmentLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// GET /api/v1/pharmacy/export
router.get(
  "/export",
  requireRole(["admin", "doctor", "receptionist"]),
  exportController.exportMedicines
);

// GET /api/v1/pharmacy/medicines/export
router.get(
  "/medicines/export",
  requireRole(["admin", "doctor", "receptionist"]),
  exportController.exportMedicines
);

// GET all medicines (catalog & aggregated stock)
router.get(
  "/medicines",
  requireRole(["admin", "doctor", "receptionist"]),
  pharmacyController.getMedicines
);

// GET low-stock medicines list
router.get(
  "/low-stock",
  requireRole(["admin", "doctor", "receptionist"]),
  pharmacyController.getLowStock
);

// GET dispensation history (pending service slice)
router.get(
  "/dispensations",
  requireRole(["admin", "doctor", "receptionist"]),
  pharmacyController.getDispensations
);

// GET single medicine by ID (with batches)
router.get(
  "/medicines/:id",
  requireRole(["admin", "doctor", "receptionist"]),
  pharmacyController.getMedicineById
);

// CREATE medicine catalog item
router.post(
  "/medicines",
  requireRole(["admin"]),
  pharmacyController.createMedicine
);

// UPDATE medicine catalog item
router.put(
  "/medicines/:id",
  requireRole(["admin"]),
  pharmacyController.updateMedicine
);

// ADD inventory batch
router.post(
  "/batches",
  requireRole(["admin"]),
  pharmacyController.addBatch
);

// ADJUST batch stock
router.post(
  "/stock-adjust",
  stockAdjustmentLimiter,
  requireRole(["admin"]),
  pharmacyController.adjustStock
);

// DISPENSE medicine (admin, doctor, receptionist)
router.post(
  "/dispense",
  requireRole(["admin", "doctor", "receptionist"]),
  pharmacyController.dispenseMedicine
);

module.exports = router;
