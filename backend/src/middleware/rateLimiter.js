const { rateLimit } = require("express-rate-limit");

/**
 * Sensitive Write Operations Rate Limiters
 *
 * Dedicated rate limiting policies for high-value financial & inventory mutation endpoints:
 * 1. Payment Submissions (POST /api/v1/billing/invoices/:id/payments)
 * 2. Pharmacy Stock Adjustments (POST /api/v1/pharmacy/stock-adjust)
 */

// Dedicated Rate Limiter for Payment Submissions
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: process.env.PAYMENT_RATE_LIMIT_MAX
    ? Number(process.env.PAYMENT_RATE_LIMIT_MAX)
    : process.env.NODE_ENV === "test"
    ? 1000
    : 30, // maximum 30 payment requests per IP per 15-minute window in production
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  validate: {
    forwardedHeader: false,
  },
  message: {
    success: false,
    message: "Too many payment submission attempts, please try again after 15 minutes",
  },
});

// Dedicated Rate Limiter for Pharmacy Stock Adjustments
const stockAdjustmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: process.env.STOCK_ADJUST_RATE_LIMIT_MAX
    ? Number(process.env.STOCK_ADJUST_RATE_LIMIT_MAX)
    : process.env.NODE_ENV === "test"
    ? 1000
    : 30, // maximum 30 stock adjustment requests per IP per 15-minute window in production
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  validate: {
    forwardedHeader: false,
  },
  message: {
    success: false,
    message: "Too many stock adjustment requests, please try again after 15 minutes",
  },
});

module.exports = {
  paymentLimiter,
  stockAdjustmentLimiter,
};
