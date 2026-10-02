const express = require("express");
const billingController = require("../controllers/billingController");
const exportController = require("../controllers/exportController");
const {
  validateIdParam,
  validateInvoiceQuery,
  validateCreateInvoice,
  validateUpdateInvoice,
  validateCancelInvoice,
  validateAddInvoiceItem,
  validateUpdateInvoiceItem,
  validateRecordPayment,
} = require("../middleware/validation");
const { requireRole } = require("../middleware/auth");
const { paymentLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// EXPORT invoices CSV (admin, receptionist)
router.get(
  "/export",
  requireRole(["admin", "receptionist"]),
  exportController.exportInvoices
);

router.get(
  "/invoices/export",
  requireRole(["admin", "receptionist"]),
  exportController.exportInvoices
);

// GET all invoices (admin, doctor, receptionist)
router.get(
  "/invoices",
  requireRole(["admin", "doctor", "receptionist"]),
  validateInvoiceQuery,
  billingController.getInvoices
);

// GET single invoice by ID (admin, doctor, receptionist)
router.get(
  "/invoices/:id",
  requireRole(["admin", "doctor", "receptionist"]),
  validateIdParam("id"),
  billingController.getInvoiceById
);

// CREATE invoice (admin, receptionist)
router.post(
  "/invoices",
  requireRole(["admin", "receptionist"]),
  validateCreateInvoice,
  billingController.createInvoice
);

// UPDATE invoice (admin, receptionist)
router.put(
  "/invoices/:id",
  requireRole(["admin", "receptionist"]),
  validateIdParam("id"),
  validateUpdateInvoice,
  billingController.updateInvoice
);

// CANCEL invoice (admin only)
router.post(
  "/invoices/:id/cancel",
  requireRole("admin"),
  validateIdParam("id"),
  validateCancelInvoice,
  billingController.cancelInvoice
);

// ADD item to invoice (admin, receptionist)
router.post(
  "/invoices/:id/items",
  requireRole(["admin", "receptionist"]),
  validateIdParam("id"),
  validateAddInvoiceItem,
  billingController.addInvoiceItem
);

// UPDATE item in invoice (admin, receptionist)
router.put(
  "/invoices/:id/items/:itemId",
  requireRole(["admin", "receptionist"]),
  validateIdParam("id"),
  validateIdParam("itemId"),
  validateUpdateInvoiceItem,
  billingController.updateInvoiceItem
);

// REMOVE item from invoice (admin, receptionist)
router.delete(
  "/invoices/:id/items/:itemId",
  requireRole(["admin", "receptionist"]),
  validateIdParam("id"),
  validateIdParam("itemId"),
  billingController.removeInvoiceItem
);

// GET invoice payments (admin, doctor, receptionist)
router.get(
  "/invoices/:id/payments",
  requireRole(["admin", "doctor", "receptionist"]),
  validateIdParam("id"),
  billingController.getInvoicePayments
);

// RECORD payment for invoice (admin, receptionist)
router.post(
  "/invoices/:id/payments",
  paymentLimiter,
  requireRole(["admin", "receptionist"]),
  validateIdParam("id"),
  validateRecordPayment,
  billingController.recordPayment
);

module.exports = router;
