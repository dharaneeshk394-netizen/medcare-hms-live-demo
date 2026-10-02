const departmentService = require("../services/departmentService");
const auditService = require("../services/auditService");

// Get all departments
async function getDepartments(req, res) {
  try {
    const departments =
      await departmentService.getAllDepartments();

    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments,
    });
  } catch (error) {
    console.error(
      "Error getting departments:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to get departments",
    });
  }
}

// Get department by ID
async function getDepartmentById(req, res) {
  try {
    const department =
      await departmentService.getDepartmentById(
        req.params.id
      );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error(
      "Error getting department:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to get department",
    });
  }
}

// Create department
async function createDepartment(req, res) {
  try {
    const {
      name,
      description,
      status,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department name is required",
      });
    }

    const department =
      await departmentService.createDepartment({
        name: name.trim(),
        description: description || "",
        status: status || "Active",
      });

    auditService.logAuditEvent({
      eventType: "DEPARTMENT_CREATE",
      userId: req.user?.id || req.session?.user?.id || null,
      role: req.user?.role || req.session?.user?.role || null,
      action: "CREATE",
      resourceType: "DEPARTMENT",
      resourceId: department.id,
      outcome: "SUCCESS",
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    console.error(
      "Error creating department:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Department name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create department",
    });
  }
}

// Update department
async function updateDepartment(req, res) {
  try {
    const department =
      await departmentService.updateDepartment(
        req.params.id,
        req.body
      );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    auditService.logAuditEvent({
      eventType: "DEPARTMENT_UPDATE",
      userId: req.user?.id || req.session?.user?.id || null,
      role: req.user?.role || req.session?.user?.role || null,
      action: "UPDATE",
      resourceType: "DEPARTMENT",
      resourceId: String(req.params.id),
      outcome: "SUCCESS",
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    console.error(
      "Error updating department:",
      error
    );

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Department name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update department",
    });
  }
}

// Delete department
async function deleteDepartment(req, res) {
  try {
    const department =
      await departmentService.deleteDepartment(
        req.params.id
      );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    auditService.logAuditEvent({
      eventType: "DEPARTMENT_DELETE",
      userId: req.user?.id || req.session?.user?.id || null,
      role: req.user?.role || req.session?.user?.role || null,
      action: "DELETE",
      resourceType: "DEPARTMENT",
      resourceId: String(req.params.id),
      outcome: "SUCCESS",
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Department deleted successfully",
      data: department,
    });
  } catch (error) {
    console.error(
      "Error deleting department:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to delete department",
    });
  }
}

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};