const express = require("express");
const reportController = require("../controllers/reportController");
const exportController = require("../controllers/exportController");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// All report endpoints are restricted to admin and doctor roles
const allowedRoles = ["admin", "doctor"];

router.get("/summary", requireRole(allowedRoles), reportController.getSummary);
router.get("/financial", requireRole(allowedRoles), reportController.getFinancial);
router.get("/clinical", requireRole(allowedRoles), reportController.getClinical);
router.get("/pharmacy", requireRole(allowedRoles), reportController.getPharmacy);
router.get("/laboratory", requireRole(allowedRoles), reportController.getLaboratory);

// =========================================================================
// Report Export Endpoints
// =========================================================================

// Financial analytics report export is strictly restricted to Admin role
router.get(
  "/export/financial",
  requireRole(["admin"]),
  exportController.exportFinancialSummary
);

// Operational & clinical dataset exports
router.get(
  "/export/patients",
  requireRole(["admin", "doctor"]),
  exportController.exportPatients
);

router.get(
  "/export/appointments",
  requireRole(["admin", "doctor"]),
  exportController.exportAppointments
);

router.get(
  "/export/admissions",
  requireRole(["admin", "doctor"]),
  exportController.exportAdmissions
);

router.get(
  "/export/pharmacy",
  requireRole(["admin", "doctor"]),
  exportController.exportMedicines
);

router.get(
  "/export/laboratory",
  requireRole(["admin", "doctor"]),
  exportController.exportLabOrders
);

module.exports = router;

