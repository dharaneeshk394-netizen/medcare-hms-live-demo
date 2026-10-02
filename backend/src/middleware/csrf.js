const crypto = require("crypto");

/**
 * Ensures an anti-CSRF token exists in the session and synchronizes
 * the readable 'hms_csrf' cookie for the frontend client.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
function ensureCsrfToken(req, res) {
  if (req.session && req.session.user) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("hms_csrf", req.session.csrfToken, {
      httpOnly: false, // Must be readable by client-side JS to attach to custom request headers
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    });
  }
}

/**
 * Middleware: csrfProtection
 *
 * Enforces Double-Submit / Session-bound Anti-CSRF verification for all
 * authenticated state-changing HTTP operations (POST, PUT, PATCH, DELETE).
 *
 * Rules:
 * 1. Safe HTTP methods (GET, HEAD, OPTIONS) bypass CSRF checks.
 * 2. Unauthenticated public entry points (e.g. POST /api/v1/auth/login) bypass checks to establish session.
 * 3. Unauthenticated requests without an active session bypass CSRF to let requireAuth return 401.
 * 4. Authenticated requests with an active session MUST provide a valid X-CSRF-Token header
 *    matching the server-side session token.
 */
function csrfProtection(req, res, next) {
  // 1. Safe HTTP methods do not alter server state
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    ensureCsrfToken(req, res);
    return next();
  }

  // 2. Public login endpoint creates the initial session and issues CSRF token
  const isLoginRoute =
    req.originalUrl === "/api/v1/auth/login" ||
    req.path === "/login" ||
    req.path === "/api/v1/auth/login";

  if (isLoginRoute) {
    return next();
  }

  // 3. If no authenticated user session exists, let requireAuth handle 401 Unauthorized
  if (!req.session || !req.session.user) {
    return next();
  }

  ensureCsrfToken(req, res);

  const sessionToken = req.session.csrfToken;
  const headerToken =
    req.headers["x-csrf-token"] ||
    req.headers["x-xsrf-token"] ||
    (req.body && req.body._csrf);

  if (!sessionToken || !headerToken || typeof headerToken !== "string") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Missing CSRF token for state-changing request.",
    });
  }

  try {
    const sessionBuf = Buffer.from(sessionToken, "utf8");
    const headerBuf = Buffer.from(headerToken, "utf8");

    if (
      sessionBuf.length !== headerBuf.length ||
      !crypto.timingSafeEqual(sessionBuf, headerBuf)
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Invalid CSRF token.",
      });
    }
  } catch (_err) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Invalid CSRF token format.",
    });
  }

  next();
}

module.exports = {
  csrfProtection,
  ensureCsrfToken,
};
