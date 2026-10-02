const express = require("express");

const departmentController = require("../controllers/departmentController");
const {
  validateIdParam,
  validateQuery,
  validateCreateDepartment,
  validateUpdateDepartment,
} = require("../middleware/validation");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// Get all departments
router.get(
  "/",
  validateQuery,
  departmentController.getDepartments
);

// Get one department
router.get(
  "/:id",
  validateIdParam("id"),
  departmentController.getDepartmentById
);

// Create department (Admin only)
router.post(
  "/",
  requireRole("admin"),
  validateCreateDepartment,
  departmentController.createDepartment
);

// Update department (Admin only)
router.put(
  "/:id",
  requireRole("admin"),
  validateIdParam("id"),
  validateUpdateDepartment,
  departmentController.updateDepartment
);

// Delete department (Admin only)
router.delete(
  "/:id",
  requireRole("admin"),
  validateIdParam("id"),
  departmentController.deleteDepartment
);

module.exports = router;
