const staffService = require("../services/staffService");

/**
 * Controller: getStaff
 * GET /api/v1/staff
 */
async function getStaff(req, res) {
  try {
    const {
      page,
      limit,
      departmentId,
      department_id,
      employmentStatus,
      employment_status,
      status,
      designation,
      search,
    } = req.query;

    const filters = {
      departmentId: departmentId || department_id,
      employmentStatus: employmentStatus || employment_status || status,
      designation,
      search,
      page,
      limit,
    };

    const result = await staffService.getStaff(filters);
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error getting staff members:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to retrieve staff records",
    });
  }
}

/**
 * Controller: getStaffById
 * GET /api/v1/staff/:id
 */
async function getStaffById(req, res) {
  try {
    const record = await staffService.getStaffById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Error getting staff member:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to retrieve staff record",
    });
  }
}

/**
 * Controller: createStaff
 * POST /api/v1/staff
 */
async function createStaff(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
    };

    const record = await staffService.createStaff(req.body, userContext);
    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error creating staff member:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create staff member",
    });
  }
}

/**
 * Controller: updateStaff
 * PUT /api/v1/staff/:id
 */
async function updateStaff(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
    };

    const record = await staffService.updateStaff(req.params.id, req.body, userContext);
    res.status(200).json({
      success: true,
      message: "Staff member updated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error updating staff member:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update staff member",
    });
  }
}

/**
 * Controller: deactivateStaff
 * PATCH /api/v1/staff/:id/deactivate
 */
async function deactivateStaff(req, res) {
  try {
    const userRole = req.user?.role || req.session?.user?.role;
    const userContext = {
      userId: req.user?.id || req.session?.user?.id || null,
      role: userRole || null,
    };

    const record = await staffService.deactivateStaff(req.params.id, userContext);
    res.status(200).json({
      success: true,
      message: "Staff member deactivated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error deactivating staff member:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to deactivate staff member",
    });
  }
}

module.exports = {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deactivateStaff,
};
