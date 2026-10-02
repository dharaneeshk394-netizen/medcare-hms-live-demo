const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const {
  getTestPool,
  isTestDbConfigured,
  closeTestDb,
  closeAppDb,
} = require("../helpers/testDb");
const {
  loginTestUser,
  createTestUser,
  deleteTestUsersByPrefix,
} = require("../helpers/authHelper");

describe("P1-01: Anti-CSRF Token Security Test Suite", () => {
  const TEST_PREFIX = "test_csrf_sec_";
  let pool;
  let testUser = null;
  let authCookie = null;
  let validCsrfToken = null;

  const testPassword = "CsrfSecurePassword123!";

  before(async () => {
    if (!isTestDbConfigured()) {
      return;
    }
    pool = getTestPool();

    // Clean any previous test users
    await deleteTestUsersByPrefix(TEST_PREFIX);

    // Create an active test user
    testUser = await createTestUser({
      fullName: "CSRF Test Admin",
      username: `${TEST_PREFIX}admin_${Date.now()}`,
      email: `${TEST_PREFIX}admin_${Date.now()}@test.local`,
      password: testPassword,
      role: "admin",
      isActive: true,
    });

    // Perform initial login
    const loginRes = await loginTestUser(testUser.username, testPassword);
    assert.equal(loginRes.status, 200, "Initial login should return 200 OK");
    authCookie = loginRes.cookie;
    validCsrfToken = loginRes.csrfToken;
    assert.ok(validCsrfToken, "Login response must include a valid CSRF token");
  });

  after(async () => {
    if (isTestDbConfigured() && pool) {
      try {
        await deleteTestUsersByPrefix(TEST_PREFIX);
      } catch (err) {
        console.warn("Cleanup error in csrf.test.js:", err.message);
      }
    }
    await closeTestDb();
    await closeAppDb();
  });

  test("TEST 1.1 — Safe GET endpoints bypass CSRF requirements", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", authCookie);

    assert.equal(res.status, 200, "Safe GET /auth/me should succeed without CSRF token header");
    assert.ok(res.body.data.csrfToken, "GET /auth/me must return current session CSRF token");
  });

  test("TEST 1.2 — Public login endpoint (POST /api/v1/auth/login) bypasses CSRF checks", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        identifier: testUser.username,
        password: testPassword,
      });

    assert.equal(res.status, 200, "Public login must succeed without prior CSRF token");
    assert.ok(res.body.data.csrfToken, "Login response must supply new CSRF token");
    assert.ok(
      res.headers["set-cookie"]?.some((c) => c.includes("hms_csrf")),
      "Login must issue hms_csrf cookie"
    );
  });

  test("TEST 1.3 — Authenticated mutating request WITHOUT X-CSRF-Token is rejected with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/v1/patients")
      .set("Cookie", authCookie)
      .send({
        name: "CSRF Blocked Patient",
        age: 30,
        gender: "Male",
        phone: "555-0100",
        status: "Active",
      });

    assert.equal(res.status, 403, "Mutating request without CSRF token must return 403 Forbidden");
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /CSRF token/i);
  });

  test("TEST 1.4 — Authenticated mutating request with INVALID X-CSRF-Token is rejected with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/v1/patients")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", "invalid_forged_csrf_token_1234567890abcdef")
      .send({
        name: "CSRF Blocked Patient",
        age: 30,
        gender: "Male",
        phone: "555-0100",
        status: "Active",
      });

    assert.equal(res.status, 403, "Mutating request with bogus CSRF token must return 403 Forbidden");
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /CSRF token/i);
  });

  test("TEST 1.5 — Authenticated mutating request WITH VALID X-CSRF-Token succeeds", async () => {
    const res = await request(app)
      .post("/api/v1/patients")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", validCsrfToken)
      .send({
        name: "CSRF Verified Patient",
        age: 35,
        gender: "Female",
        phone: "555-0199",
        status: "Active",
      });

    assert.equal(res.status, 201, "Mutating request with valid CSRF token must succeed (201 Created)");
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id, "Created patient should have an ID");
  });

  test("TEST 1.6 — Logout WITHOUT X-CSRF-Token is rejected with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", authCookie);

    assert.equal(res.status, 403, "Logout without CSRF token must be rejected with 403 Forbidden");
  });

  test("TEST 1.7 — Logout WITH VALID X-CSRF-Token succeeds and clears cookies", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", authCookie)
      .set("X-CSRF-Token", validCsrfToken);

    assert.equal(res.status, 200, "Logout with valid CSRF token must succeed (200 OK)");
    assert.equal(res.body.success, true);

    // Verify session invalidation
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", authCookie);
    assert.equal(meRes.status, 401, "Session should be invalidated after clean logout");
  });
});
