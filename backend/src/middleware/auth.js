const authService = require("../services/authService");
const auditService = require("../services/auditService");

/**
 * Middleware: requireAuth
 *
 * Verifies that the client has an active authenticated session and that
 * the user account still exists and is marked active in the database.
 */
async function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.user || !req.session.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in to continue.",
      });
    }

    // Verify against DB to ensure account has not been disabled or deleted
    const user = await authService.getUserById(req.session.user.id);
    if (!user || !user.isActive) {
      req.session.destroy(() => {});
      res.clearCookie("hms_sid");
      return res.status(401).json({
        success: false,
        message: "Your session has expired or the account is no longer active. Please log in again.",
      });
    }

    // Attach validated user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error("Authentication middleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication check.",
    });
  }
}

/**
 * Middleware factory: requireRole
 *
 * Checks that the authenticated user's role matches one of the allowed roles.
 * Must be placed after requireAuth.
 *
 * @param {string|string[]} allowedRoles
 */
function requireRole(allowedRoles) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return function (req, res, next) {
    const userRole = req.user?.role || req.session?.user?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!rolesArray.includes(userRole)) {
      auditService.logAuditEvent({
        eventType: "AUTH_ACCESS_DENIED",
        userId: req.user?.id || req.session?.user?.id || null,
        role: userRole,
        action: "ACCESS",
        resourceType: req.baseUrl ? req.baseUrl.replace(/^\/api\/v1\/?/, "").toUpperCase() : null,
        resourceId: req.params?.id ? String(req.params.id) : null,
        outcome: "FAILURE",
        ipAddress: req.ip,
      });

      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions for this resource.",
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
