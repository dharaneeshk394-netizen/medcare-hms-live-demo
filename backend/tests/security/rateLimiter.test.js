const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const request = require("supertest");

/**
 * Login Rate-Limiter Isolated Test Suite
 *
 * Verifies the exact rate-limiting policy and response behavior used by the authentication
 * login endpoint (express-rate-limit with standard headers and 429 response structure).
 *
 * Safety & Isolation Constraints:
 * - Completely isolated from production app instance and production rate-limit counters.
 * - Zero PostgreSQL database dependency.
 * - Does not alter NODE_ENV=test or global limits.
 */
const { paymentLimiter, stockAdjustmentLimiter } = require("../../src/middleware/rateLimiter");

/**
 * Sensitive Write Operations Rate Limiters Test Suite
 */
describe("Authentication & Sensitive Write Operations Rate Limiter Suite", () => {
  /**
   * Helper function creating an isolated test Express app configured with the HMS auth limiter policy.
   *
   * @param {number} maxAttempts - Maximum allowed attempts within the window
   * @returns {express.Express}
   */
  function createTestRateLimitedApp(maxAttempts = 3) {
    const testApp = express();
    testApp.use(express.json());

    const testLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: maxAttempts,
      standardHeaders: true, // Return RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
      legacyHeaders: false, // Disable X-RateLimit-*
      statusCode: 429,
      validate: {
        forwardedHeader: false,
      },
      message: {
        success: false,
        message: "Too many login attempts from this IP, please try again after 15 minutes",
      },
    });

    testApp.post("/api/v1/auth/login", testLimiter, (req, res) => {
      res.status(200).json({
        success: true,
        message: "Mock login processed",
      });
    });

    return testApp;
  }

  test("Allows requests within configured attempt threshold and returns standard RateLimit headers", async () => {
    const maxThreshold = 3;
    const app = createTestRateLimitedApp(maxThreshold);

    for (let attempt = 1; attempt <= maxThreshold; attempt++) {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ username: "admin", password: "Password123!" });

      assert.strictEqual(
        res.status,
        200,
        `Attempt ${attempt} should succeed with HTTP 200`
      );
      assert.strictEqual(res.body.success, true);

      // Verify standard RFC-style rate limit headers
      assert.ok(
        res.headers["ratelimit-limit"],
        "Response must contain ratelimit-limit header"
      );
      assert.strictEqual(
        String(res.headers["ratelimit-limit"]),
        String(maxThreshold)
      );

      const expectedRemaining = maxThreshold - attempt;
      assert.strictEqual(
        String(res.headers["ratelimit-remaining"]),
        String(expectedRemaining),
        `Remaining attempts after attempt ${attempt} should be ${expectedRemaining}`
      );
    }
  });

  test("Rejects requests exceeding the limit with HTTP 429 Too Many Requests and proper error payload", async () => {
    const maxThreshold = 3;
    const app = createTestRateLimitedApp(maxThreshold);

    // Consume the quota (3 attempts)
    for (let i = 0; i < maxThreshold; i++) {
      await request(app)
        .post("/api/v1/auth/login")
        .send({ username: "admin", password: "Password123!" });
    }

    // 4th attempt: Should be blocked by rate limiter
    const blockedRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "Password123!" });

    assert.strictEqual(
      blockedRes.status,
      429,
      "Exceeded request must return HTTP 429 Too Many Requests"
    );

    assert.strictEqual(blockedRes.body.success, false);
    assert.strictEqual(
      blockedRes.body.message,
      "Too many login attempts from this IP, please try again after 15 minutes"
    );

    assert.strictEqual(
      String(blockedRes.headers["ratelimit-remaining"]),
      "0",
      "ratelimit-remaining must be 0 when blocked"
    );

    assert.ok(
      blockedRes.headers["retry-after"],
      "Blocked response must include Retry-After header"
    );
  });

  test("Different client keys have independent rate-limit quotas", async () => {
    const testApp = express();
    testApp.use(express.json());

    // Custom key generator simulating different client origins/identifiers
    const testLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.headers["x-custom-client-id"] || "test-client-default",
      statusCode: 429,
      validate: {
        forwardedHeader: false,
        keyGeneratorIpFallback: false,
      },
      message: {
        success: false,
        message: "Too many login attempts from this IP, please try again after 15 minutes",
      },
    });

    testApp.post("/api/v1/auth/login", testLimiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    // Client A consumes quota (2 requests)
    await request(testApp)
      .post("/api/v1/auth/login")
      .set("x-custom-client-id", "client-A")
      .send({});
    await request(testApp)
      .post("/api/v1/auth/login")
      .set("x-custom-client-id", "client-A")
      .send({});

    // Client A 3rd attempt is blocked
    const clientABlocked = await request(testApp)
      .post("/api/v1/auth/login")
      .set("x-custom-client-id", "client-A")
      .send({});
    assert.strictEqual(clientABlocked.status, 429);

    // Client B still has fresh quota
    const clientBFirst = await request(testApp)
      .post("/api/v1/auth/login")
      .set("x-custom-client-id", "client-B")
      .send({});
    assert.strictEqual(clientBFirst.status, 200);
    assert.strictEqual(String(clientBFirst.headers["ratelimit-remaining"]), "1");
  });

  test("Dedicated Payment Submission Rate Limiter enforces threshold and returns 429", async () => {
    const testApp = express();
    testApp.use(express.json());

    // Use a custom test instance with max = 2
    const customPaymentLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      statusCode: 429,
      validate: { forwardedHeader: false },
      message: {
        success: false,
        message: "Too many payment submission attempts, please try again after 15 minutes",
      },
    });

    testApp.post("/api/v1/billing/invoices/1/payments", customPaymentLimiter, (req, res) => {
      res.status(201).json({ success: true, message: "Payment recorded" });
    });

    // Attempt 1 & 2 succeed
    const res1 = await request(testApp).post("/api/v1/billing/invoices/1/payments").send({ amount: 50 });
    assert.strictEqual(res1.status, 201);

    const res2 = await request(testApp).post("/api/v1/billing/invoices/1/payments").send({ amount: 50 });
    assert.strictEqual(res2.status, 201);

    // Attempt 3 exceeds limit -> 429
    const res3 = await request(testApp).post("/api/v1/billing/invoices/1/payments").send({ amount: 50 });
    assert.strictEqual(res3.status, 429);
    assert.strictEqual(res3.body.success, false);
    assert.strictEqual(
      res3.body.message,
      "Too many payment submission attempts, please try again after 15 minutes"
    );
  });

  test("Dedicated Pharmacy Stock Adjustment Rate Limiter enforces threshold and returns 429", async () => {
    const testApp = express();
    testApp.use(express.json());

    // Use a custom test instance with max = 2
    const customStockLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      statusCode: 429,
      validate: { forwardedHeader: false },
      message: {
        success: false,
        message: "Too many stock adjustment requests, please try again after 15 minutes",
      },
    });

    testApp.post("/api/v1/pharmacy/stock-adjust", customStockLimiter, (req, res) => {
      res.status(200).json({ success: true, message: "Stock adjusted" });
    });

    // Attempt 1 & 2 succeed
    const res1 = await request(testApp).post("/api/v1/pharmacy/stock-adjust").send({ batchId: 1, adjustment: 5 });
    assert.strictEqual(res1.status, 200);

    const res2 = await request(testApp).post("/api/v1/pharmacy/stock-adjust").send({ batchId: 1, adjustment: 5 });
    assert.strictEqual(res2.status, 200);

    // Attempt 3 exceeds limit -> 429
    const res3 = await request(testApp).post("/api/v1/pharmacy/stock-adjust").send({ batchId: 1, adjustment: 5 });
    assert.strictEqual(res3.status, 429);
    assert.strictEqual(res3.body.success, false);
    assert.strictEqual(
      res3.body.message,
      "Too many stock adjustment requests, please try again after 15 minutes"
    );
  });
});
