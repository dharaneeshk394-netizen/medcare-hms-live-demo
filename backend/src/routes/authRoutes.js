const express = require("express");
const { rateLimit } = require("express-rate-limit");
const authController = require("../controllers/authController");

const router = express.Router();

// Dedicated Strict Rate Limiter for Authentication Login Endpoint
// Defends against brute-force password guessing and credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: process.env.NODE_ENV === "test" ? 1000 : (Number(process.env.AUTH_RATE_LIMIT_MAX) || 10), // maximum 10 login attempts per IP per 15-minute window in production
  standardHeaders: true, // Return standard RateLimit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
  legacyHeaders: false, // Disable legacy X-RateLimit headers
  statusCode: 429,
  validate: {
    forwardedHeader: false,
  },
  message: {
    success: false,
    message: "Too many login attempts from this IP, please try again after 15 minutes",
  },
});

// POST /api/v1/auth/login (governed by dedicated authLimiter)
router.post("/login", authLimiter, authController.login);

// GET /api/v1/auth/me
router.get("/me", authController.getMe);

// POST /api/v1/auth/logout
router.post("/logout", authController.logout);

module.exports = router;
