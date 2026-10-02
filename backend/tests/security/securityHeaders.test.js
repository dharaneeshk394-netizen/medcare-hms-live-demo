const { describe, test, after } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const request = require("supertest");
const app = require("../../src/app");
const { closeAppDb } = require("../helpers/testDb");

/**
 * Security Headers Automated Test Suite
 *
 * Verifies that Helmet security headers (CSP, Frameguard, MIME-sniffing, X-Powered-By)
 * behave strictly according to configuration in production and development environments.
 *
 * Zero database requirement: These tests verify HTTP response headers without requiring
 * an active PostgreSQL database connection.
 */

describe("Security Headers Automated Test Suite", () => {
  /**
   * Helper to query the Express app under specific isolated environment variables
   * using a fresh Node.js subprocess to prevent global environment contamination.
   */
  function fetchHeadersInIsolatedEnv(envVars, targetPath = "/health") {
    const runnerScript = `
      const env = ${JSON.stringify(envVars)};
      for (const [key, value] of Object.entries(env)) {
        if (value === null) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      const request = require("supertest");
      const app = require("./backend/src/app.js");

      async function run() {
        try {
          const res = await request(app).get(${JSON.stringify(targetPath)});
          console.log(JSON.stringify({
            status: res.status,
            csp: res.headers["content-security-policy"] || null,
            xfo: res.headers["x-frame-options"] || null,
            xcto: res.headers["x-content-type-options"] || null,
            xPoweredBy: res.headers["x-powered-by"] || null,
            body: res.body
          }));
        } catch (err) {
          console.error("Test subprocess error:", err);
          process.exit(1);
        }
      }
      run();
    `;

    const output = execFileSync("node", ["-e", runnerScript], {
      encoding: "utf8",
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    return JSON.parse(output.trim());
  }

  // ==========================================
  // 1. PRODUCTION ENVIRONMENT SECURITY HEADERS
  // ==========================================
  describe("Production Mode Security Headers (NODE_ENV=production)", () => {
    const prodEnv = {
      NODE_ENV: "production",
      SESSION_SECRET: "test_isolated_production_secret_32_characters_minimum",
    };

    test("TEST 1.1 — Production /health includes complete Content-Security-Policy header", () => {
      const result = fetchHeadersInIsolatedEnv(prodEnv, "/health");

      assert.strictEqual(result.status, 200, "Expected HTTP 200 on /health");
      assert.ok(result.csp, "Content-Security-Policy header must be present in production");

      // Verify all required individual CSP directives
      assert.ok(
        result.csp.includes("default-src 'self'"),
        "CSP must contain default-src 'self'"
      );
      assert.ok(
        result.csp.includes("script-src 'self'"),
        "CSP must contain script-src 'self'"
      );
      assert.ok(
        result.csp.includes("style-src 'self' 'unsafe-inline'"),
        "CSP must contain style-src 'self' 'unsafe-inline'"
      );
      assert.ok(
        result.csp.includes("img-src 'self' data: blob:"),
        "CSP must contain img-src 'self' data: blob:"
      );
      assert.ok(
        result.csp.includes("font-src 'self'"),
        "CSP must contain font-src 'self'"
      );
      assert.ok(
        result.csp.includes("connect-src 'self'"),
        "CSP must contain connect-src 'self'"
      );
      assert.ok(
        result.csp.includes("object-src 'none'"),
        "CSP must contain object-src 'none'"
      );
      assert.ok(
        result.csp.includes("base-uri 'self'"),
        "CSP must contain base-uri 'self'"
      );
      assert.ok(
        result.csp.includes("form-action 'self'"),
        "CSP must contain form-action 'self'"
      );
      assert.ok(
        result.csp.includes("frame-ancestors 'self'"),
        "CSP must contain frame-ancestors 'self'"
      );

      // Verify absence of dangerous wildcard origins
      assert.strictEqual(
        result.csp.includes("*"),
        false,
        "CSP must not contain wildcard origins"
      );
      assert.strictEqual(
        result.csp.includes("'unsafe-eval'"),
        false,
        "CSP must not allow 'unsafe-eval'"
      );
    });

    test("TEST 1.2 — Production /health includes X-Frame-Options: SAMEORIGIN", () => {
      const result = fetchHeadersInIsolatedEnv(prodEnv, "/health");
      assert.strictEqual(
        result.xfo,
        "SAMEORIGIN",
        "X-Frame-Options must be set to SAMEORIGIN in production"
      );
    });

    test("TEST 1.3 — Production /health includes X-Content-Type-Options: nosniff", () => {
      const result = fetchHeadersInIsolatedEnv(prodEnv, "/health");
      assert.strictEqual(
        result.xcto,
        "nosniff",
        "X-Content-Type-Options must be set to nosniff in production"
      );
    });

    test("TEST 1.4 — Production /health suppresses X-Powered-By header", () => {
      const result = fetchHeadersInIsolatedEnv(prodEnv, "/health");
      assert.strictEqual(
        result.xPoweredBy,
        null,
        "X-Powered-By header must not be sent in production"
      );
    });

    test("TEST 1.5 — Production API version route /api/v1 includes identical security headers", () => {
      const result = fetchHeadersInIsolatedEnv(prodEnv, "/api/v1");
      assert.strictEqual(result.status, 200);
      assert.ok(result.csp, "CSP must be present on /api/v1");
      assert.strictEqual(result.xfo, "SAMEORIGIN", "X-Frame-Options must be SAMEORIGIN on /api/v1");
      assert.strictEqual(result.xcto, "nosniff", "X-Content-Type-Options must be nosniff on /api/v1");
      assert.strictEqual(result.xPoweredBy, null, "X-Powered-By must be absent on /api/v1");
    });

    test("TEST 1.6 — Production 404 API error response preserves security headers", () => {
      const result = fetchHeadersInIsolatedEnv(prodEnv, "/api/v1/non-existent-route-for-test");
      assert.strictEqual(result.status, 404);
      assert.ok(result.csp, "CSP must be present on 404 responses");
      assert.strictEqual(result.xfo, "SAMEORIGIN", "X-Frame-Options must be SAMEORIGIN on 404 responses");
      assert.strictEqual(result.xcto, "nosniff", "X-Content-Type-Options must be nosniff on 404 responses");
      assert.strictEqual(result.xPoweredBy, null, "X-Powered-By must be absent on 404 responses");
    });
  });

  // ============================================
  // 2. DEVELOPMENT ENVIRONMENT SECURITY HEADERS
  // ============================================
  describe("Development Mode Security Headers (NODE_ENV=development)", () => {
    const devEnv = {
      NODE_ENV: "development",
    };

    test("TEST 2.1 — Development mode omits CSP to preserve Vite HMR and dev tooling", () => {
      const result = fetchHeadersInIsolatedEnv(devEnv, "/health");
      assert.strictEqual(
        result.csp,
        null,
        "CSP must be disabled in development mode"
      );
    });

    test("TEST 2.2 — Development mode omits X-Frame-Options to allow preview framing", () => {
      const result = fetchHeadersInIsolatedEnv(devEnv, "/health");
      assert.strictEqual(
        result.xfo,
        null,
        "X-Frame-Options must be disabled in development mode"
      );
    });

    test("TEST 2.3 — Development mode retains X-Content-Type-Options: nosniff", () => {
      const result = fetchHeadersInIsolatedEnv(devEnv, "/health");
      assert.strictEqual(
        result.xcto,
        "nosniff",
        "X-Content-Type-Options must remain active in development mode"
      );
    });

    test("TEST 2.4 — Development mode suppresses X-Powered-By", () => {
      const result = fetchHeadersInIsolatedEnv(devEnv, "/health");
      assert.strictEqual(
        result.xPoweredBy,
        null,
        "X-Powered-By must be disabled in development mode"
      );
    });
  });

  // ============================================
  // 3. IN-PROCESS TEST ENVIRONMENT VERIFICATION
  // ============================================
  describe("In-Process Express App Security Headers", () => {
    test("TEST 3.1 — Direct Supertest request against app instance verifies baseline headers", async () => {
      const res = await request(app).get("/health");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(
        res.headers["x-content-type-options"],
        "nosniff",
        "X-Content-Type-Options must be nosniff on in-process app"
      );
      assert.strictEqual(
        res.headers["x-powered-by"],
        undefined,
        "X-Powered-By must be undefined on in-process app"
      );
    });
  });

  after(async () => {
    await closeAppDb();
  });
});
