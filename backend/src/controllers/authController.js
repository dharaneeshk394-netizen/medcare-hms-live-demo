const crypto = require("crypto");
const authService = require("../services/authService");
const auditService = require("../services/auditService");

/**
 * Handle user login
 * POST /api/v1/auth/login
 */
async function login(req, res) {
  try {
    const { username, email, identifier, password } = req.body || {};
    const userIdentifier = (identifier || username || email || "").trim();

    if (!userIdentifier || !password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required",
      });
    }

    const user = await authService.findUserForAuth(userIdentifier);

    // Generic failure message prevents user enumeration
    if (!user || !user.is_active) {
      auditService.logAuditEvent({
        eventType: "AUTH_LOGIN_FAILURE",
        userId: null,
        role: null,
        action: "LOGIN",
        resourceType: "AUTH",
        resourceId: null,
        outcome: "FAILURE",
        ipAddress: req.ip,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const isMatch = await authService.verifyPassword(password, user.password_hash);
    if (!isMatch) {
      auditService.logAuditEvent({
        eventType: "AUTH_LOGIN_FAILURE",
        userId: null,
        role: null,
        action: "LOGIN",
        resourceType: "AUTH",
        resourceId: null,
        outcome: "FAILURE",
        ipAddress: req.ip,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Session fixation mitigation: regenerate session ID on successful login
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error("Session regeneration failed:", regenErr);
        return res.status(500).json({
          success: false,
          message: "Internal server error during session creation",
        });
      }

      // Generate new CSRF token for the authenticated session
      const csrfToken = crypto.randomBytes(32).toString("hex");
      req.session.csrfToken = csrfToken;

      // Store minimal safe user attributes in session
      req.session.user = {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
        doctorId: user.doctor_id,
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save failed:", saveErr);
          return res.status(500).json({
            success: false,
            message: "Internal server error during session persistence",
          });
        }

        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("hms_csrf", csrfToken, {
          httpOnly: false,
          sameSite: "lax",
          secure: isProduction,
          path: "/",
        });

        auditService.logAuditEvent({
          eventType: "AUTH_LOGIN_SUCCESS",
          userId: user.id,
          role: user.role,
          action: "LOGIN",
          resourceType: "AUTH",
          resourceId: null,
          outcome: "SUCCESS",
          ipAddress: req.ip,
        });

        return res.status(200).json({
          success: true,
          message: "Login successful",
          data: {
            id: user.id,
            fullName: user.full_name,
            username: user.username,
            email: user.email,
            role: user.role,
            doctorId: user.doctor_id,
            isActive: user.is_active,
            is_active: user.is_active,
            csrfToken,
          },
        });
      });
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during login",
    });
  }
}

/**
 * Get currently authenticated user details
 * GET /api/v1/auth/me
 */
async function getMe(req, res) {
  try {
    if (!req.session || !req.session.user || !req.session.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated. Please log in.",
      });
    }

    const user = await authService.getUserById(req.session.user.id);
    if (!user || !user.isActive) {
      req.session.destroy(() => {});
      res.clearCookie("hms_sid");
      res.clearCookie("hms_csrf");
      return res.status(401).json({
        success: false,
        message: "User session is invalid or user account has been deactivated.",
      });
    }

    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("hms_csrf", req.session.csrfToken, {
      httpOnly: false,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    });

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        doctorId: user.doctorId,
        isActive: user.isActive,
        is_active: user.isActive,
        csrfToken: req.session.csrfToken,
      },
    });
  } catch (error) {
    console.error("Error getting session user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve authenticated user information",
    });
  }
}

/**
 * Handle user logout
 * POST /api/v1/auth/logout
 */
async function logout(req, res) {
  try {
    const userId = req.user?.id || req.session?.user?.id || null;
    const userRole = req.user?.role || req.session?.user?.role || null;

    if (!req.session) {
      res.clearCookie("hms_sid");
      res.clearCookie("hms_csrf");
      if (userId) {
        auditService.logAuditEvent({
          eventType: "AUTH_LOGOUT",
          userId: userId,
          role: userRole,
          action: "LOGOUT",
          resourceType: "AUTH",
          resourceId: null,
          outcome: "SUCCESS",
          ipAddress: req.ip,
        });
      }
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    }

    req.session.destroy((err) => {
      res.clearCookie("hms_sid");
      res.clearCookie("hms_csrf");
      if (err) {
        console.error("Error destroying session during logout:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to log out cleanly",
        });
      }

      auditService.logAuditEvent({
        eventType: "AUTH_LOGOUT",
        userId: userId,
        role: userRole,
        action: "LOGOUT",
        resourceType: "AUTH",
        resourceId: null,
        outcome: "SUCCESS",
        ipAddress: req.ip,
      });

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.clearCookie("hms_sid");
    res.clearCookie("hms_csrf");
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }
}

module.exports = {
  login,
  getMe,
  logout,
};
