const userService = require("../services/userService");

function getSessionAdminId(req) {
  const userId = req.user?.id || req.session?.user?.id;
  if (!userId) {
    const error = new Error("Admin session not found or unauthenticated");
    error.statusCode = 401;
    throw error;
  }
  return userId;
}

/**
 * GET /api/v1/users
 * Admin only list users.
 */
async function getUsers(req, res) {
  try {
    const result = await userService.listUsers(req.query);
    res.status(200).json({
      success: true,
      count: result.users.length,
      totalCount: result.totalCount,
      limit: result.limit,
      offset: result.offset,
      data: result.users,
    });
  } catch (error) {
    console.error("Error in getUsers controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve users",
    });
  }
}

/**
 * GET /api/v1/users/:id
 * Admin only get single user profile.
 */
async function getUserById(req, res) {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error in getUserById controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve user profile",
    });
  }
}

/**
 * PUT /api/v1/users/:id/role
 * Admin only update user role.
 */
async function updateRole(req, res) {
  try {
    const adminId = getSessionAdminId(req);
    const { role } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;

    const updated = await userService.updateUserRole(req.params.id, role, adminId, ipAddress);
    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error in updateRole controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update user role",
    });
  }
}

/**
 * PUT /api/v1/users/:id/status
 * Admin only update user active status.
 */
async function updateStatus(req, res) {
  try {
    const adminId = getSessionAdminId(req);
    const { isActive } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;

    const updated = await userService.updateUserStatus(req.params.id, isActive, adminId, ipAddress);
    res.status(200).json({
      success: true,
      message: "User account status updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error in updateStatus controller:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update user status",
    });
  }
}

module.exports = {
  getUsers,
  getUserById,
  updateRole,
  updateStatus,
};
