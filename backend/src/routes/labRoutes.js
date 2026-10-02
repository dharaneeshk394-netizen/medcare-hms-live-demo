const express = require("express");
const labController = require("../controllers/labController");
const exportController = require("../controllers/exportController");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// -------------------------------------------------------------
// Lab Test Catalog Endpoints
// -------------------------------------------------------------

// GET /api/v1/lab/tests
router.get(
  "/tests",
  requireRole(["admin", "doctor", "receptionist"]),
  labController.getTests
);

// GET /api/v1/lab/tests/:id
router.get(
  "/tests/:id",
  requireRole(["admin", "doctor", "receptionist"]),
  labController.getTestById
);

// POST /api/v1/lab/tests
router.post(
  "/tests",
  requireRole(["admin"]),
  labController.createTest
);

// -------------------------------------------------------------
// Lab Order Endpoints
// -------------------------------------------------------------

// GET /api/v1/lab/orders/export
router.get(
  "/orders/export",
  requireRole(["admin", "doctor", "receptionist"]),
  exportController.exportLabOrders
);

// GET /api/v1/lab/export
router.get(
  "/export",
  requireRole(["admin", "doctor", "receptionist"]),
  exportController.exportLabOrders
);

// GET /api/v1/lab/orders
router.get(
  "/orders",
  requireRole(["admin", "doctor", "receptionist"]),
  labController.getOrders
);

// GET /api/v1/lab/orders/:id
router.get(
  "/orders/:id",
  requireRole(["admin", "doctor", "receptionist"]),
  labController.getOrderById
);

// POST /api/v1/lab/orders
router.post(
  "/orders",
  requireRole(["admin", "doctor"]),
  labController.createOrder
);

// PUT /api/v1/lab/orders/:id/sample
router.put(
  "/orders/:id/sample",
  requireRole(["admin", "doctor", "receptionist"]),
  labController.recordSpecimen
);

// POST /api/v1/lab/orders/:id/results
router.post(
  "/orders/:id/results",
  requireRole(["admin", "doctor"]),
  labController.recordResults
);

// PUT /api/v1/lab/orders/:id/cancel
router.put(
  "/orders/:id/cancel",
  requireRole(["admin", "doctor"]),
  labController.cancelOrder
);

module.exports = router;
