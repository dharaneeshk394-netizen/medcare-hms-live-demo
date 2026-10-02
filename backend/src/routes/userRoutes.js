const express = require("express");
const userController = require("../controllers/userController");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// All user management routes require admin role
const adminOnly = requireRole(["admin"]);

router.get("/", adminOnly, userController.getUsers);
router.get("/:id", adminOnly, userController.getUserById);
router.put("/:id/role", adminOnly, userController.updateRole);
router.put("/:id/status", adminOnly, userController.updateStatus);

module.exports = router;
