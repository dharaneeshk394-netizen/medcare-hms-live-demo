const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { isTestDbConfigured, closeTestDb, closeAppDb } = require("../helpers/testDb");
const {
  loginTestUser,
  getMeTestUser,
  logoutTestUser,
  createTestUser,
  deleteTestUsersByPrefix,
} = require("../helpers/authHelper");

describe("Authentication Automated Test Suite", () => {
  const TEST_PREFIX = "test_auth_suite_";
  let activeTestUser = null;
  let inactiveTestUser = null;
  const testPassword = "ValidTestPassword123!";

  before(async () => {
    if (isTestDbConfigured()) {
      // Clean up any leftover test users with this prefix
      await deleteTestUsersByPrefix(TEST_PREFIX);

      // Create a valid active test user in the TEST database
      activeTestUser = await createTestUser({
        fullName: "Test Auth User",
        username: `${TEST_PREFIX}active_${Date.now()}`,
        email: `${TEST_PREFIX}active_${Date.now()}@hospital-test.local`,
        password: testPassword,
        role: "admin",
        isActive: true,
      });

      // Create an inactive test user in the TEST database
      inactiveTestUser = await createTestUser({
        fullName: "Test Inactive User",
        username: `${TEST_PREFIX}inactive_${Date.now()}`,
        email: `${TEST_PREFIX}inactive_${Date.now()}@hospital-test.local`,
        password: testPassword,
        role: "doctor",
        isActive: false,
      });
    }
  });

  after(async () => {
    if (isTestDbConfigured()) {
      await deleteTestUsersByPrefix(TEST_PREFIX);
      await closeTestDb();
    }
    await closeAppDb();
  });

  test("TEST 1 — Valid login returns HTTP 200, safe user profile, and session cookie", async (t) => {
    if (!isTestDbConfigured() || !activeTestUser) {
      t.skip(
        "SAFETY HALT: Dedicated TEST_DB_NAME is not configured. Skipping active user login test to protect development database integrity."
      );
      return;
    }

    const { status, cookie, body } = await loginTestUser(
      activeTestUser.username,
      testPassword
    );

    assert.equal(status, 200, "Valid login must return HTTP 200");
    assert.equal(body.success, true, "Response success must be true");
    assert.ok(body.data, "Response data object must exist");
    assert.equal(body.data.id, activeTestUser.id, "Returned user ID must match test user");
    assert.equal(body.data.username, activeTestUser.username, "Returned username must match test user");
    assert.equal(body.data.role, activeTestUser.role, "Returned role must match test user");

    // Security assertions: sensitive fields must NEVER be returned
    assert.equal(body.data.password, undefined, "Plaintext password must not be present in response");
    assert.equal(body.data.password_hash, undefined, "password_hash must not be present in response");
    assert.equal(body.data.passwordHash, undefined, "passwordHash must not be present in response");
    assert.equal(body.SESSION_SECRET, undefined, "SESSION_SECRET must not be present in response");

    // Session cookie assertion
    assert.ok(cookie, "Session cookie header must be issued");
    assert.ok(cookie.startsWith("hms_sid="), "Cookie name must be hms_sid");
  });

  test("TEST 2 — Invalid login returns HTTP 401 with generic error message", async (t) => {
    if (!isTestDbConfigured()) {
      t.skip(
        "SAFETY HALT: Dedicated TEST_DB_NAME is not configured. Skipping invalid login test to avoid inserting audit rows into development database."
      );
      return;
    }

    const { status, cookie, body } = await loginTestUser(
      "nonexistent_test_user_99999",
      "WrongPassword123!"
    );

    assert.equal(status, 401, "Invalid login must return HTTP 401");
    assert.equal(body.success, false, "Response success must be false");
    assert.equal(
      body.message,
      "Invalid username or password",
      "Must return generic invalid credentials message"
    );

    // Security assertions: no sensitive data leakage
    assert.equal(body.password, undefined, "Password must not be leaked");
    assert.equal(body.password_hash, undefined, "Password hash must not be leaked");
    assert.equal(body.SESSION_SECRET, undefined, "SESSION_SECRET must not be leaked");
    assert.equal(cookie, "", "No authenticated session cookie should be issued on failure");
  });

  test("TEST 3 — /auth/me without authentication returns HTTP 401", async () => {
    const { status, body } = await getMeTestUser();

    assert.equal(status, 401, "/auth/me without session must return HTTP 401");
    assert.equal(body.success, false, "Response success must be false");
    assert.equal(
      body.message,
      "Not authenticated. Please log in.",
      "Must return unauthenticated error message"
    );
    assert.equal(body.data, undefined, "No user data must be returned");
  });

  test("TEST 4 — /auth/me with valid session returns HTTP 200 and safe user profile", async (t) => {
    if (!isTestDbConfigured() || !activeTestUser) {
      t.skip(
        "SAFETY HALT: Dedicated TEST_DB_NAME is not configured. Skipping authenticated /auth/me test to protect development database integrity."
      );
      return;
    }

    const loginRes = await loginTestUser(activeTestUser.username, testPassword);
    assert.equal(loginRes.status, 200, "Login must succeed before /auth/me test");
    const sessionCookie = loginRes.cookie;

    const { status, body } = await getMeTestUser(sessionCookie);

    assert.equal(status, 200, "/auth/me with valid session must return HTTP 200");
    assert.equal(body.success, true, "Response success must be true");
    assert.ok(body.data, "User data must be present");
    assert.equal(body.data.id, activeTestUser.id, "User ID must match authenticated user");
    assert.equal(body.data.username, activeTestUser.username, "Username must match");
    assert.equal(body.data.role, activeTestUser.role, "Role must match");

    // Security assertions
    assert.equal(body.data.password, undefined, "Password must not be present");
    assert.equal(body.data.password_hash, undefined, "password_hash must not be present");
    assert.equal(body.data.passwordHash, undefined, "passwordHash must not be present");
    assert.equal(body.SESSION_SECRET, undefined, "SESSION_SECRET must not be present");
  });

  test("TEST 5 — Logout returns HTTP 200 and destroys active session", async (t) => {
    if (!isTestDbConfigured() || !activeTestUser) {
      t.skip(
        "SAFETY HALT: Dedicated TEST_DB_NAME is not configured. Skipping logout test to protect development database integrity."
      );
      return;
    }

    const loginRes = await loginTestUser(activeTestUser.username, testPassword);
    assert.equal(loginRes.status, 200, "Login must succeed before logout test");
    const sessionCookie = loginRes.cookie;

    const { status, body } = await logoutTestUser(sessionCookie);

    assert.equal(status, 200, "Logout must return HTTP 200");
    assert.equal(body.success, true, "Response success must be true");
    assert.equal(body.message, "Logged out successfully", "Must return success message");
  });

  test("TEST 6 — /auth/me after logout returns HTTP 401 confirming session invalidation", async (t) => {
    if (!isTestDbConfigured() || !activeTestUser) {
      t.skip(
        "SAFETY HALT: Dedicated TEST_DB_NAME is not configured. Skipping post-logout /auth/me test to protect development database integrity."
      );
      return;
    }

    const loginRes = await loginTestUser(activeTestUser.username, testPassword);
    assert.equal(loginRes.status, 200, "Login must succeed");
    const sessionCookie = loginRes.cookie;

    const logoutRes = await logoutTestUser(sessionCookie);
    assert.equal(logoutRes.status, 200, "Logout must succeed");

    const meRes = await getMeTestUser(sessionCookie);
    assert.equal(
      meRes.status,
      401,
      "/auth/me with destroyed session cookie must return HTTP 401"
    );
    assert.equal(meRes.body.success, false, "Response success must be false");
  });

  test("TEST 7 — Inactive user login returns HTTP 401 and generic authentication failure", async (t) => {
    if (!isTestDbConfigured() || !inactiveTestUser) {
      t.skip(
        "SAFETY HALT: Dedicated TEST_DB_NAME is not configured. Skipping inactive user login test to protect development database integrity."
      );
      return;
    }

    const { status, cookie, body } = await loginTestUser(
      inactiveTestUser.username,
      testPassword
    );

    assert.equal(status, 401, "Inactive user login must return HTTP 401");
    assert.equal(body.success, false, "Response success must be false");
    assert.equal(
      body.message,
      "Invalid username or password",
      "Inactive user must receive generic error message without account status leakage"
    );
    assert.equal(cookie, "", "Inactive user must not receive an authenticated session cookie");
  });
});
