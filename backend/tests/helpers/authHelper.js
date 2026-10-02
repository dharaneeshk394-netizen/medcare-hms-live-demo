const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const { getTestPool, isTestDbConfigured } = require("./testDb");

/**
 * Authentication Test Helper
 *
 * Provides reusable test-session acquisition, cookie extraction,
 * and test user lifecycle helpers for automated integration and security tests.
 *
 * All user creation and mutation operations strictly require a configured test database.
 */

let lastCsrfToken = "";

/**
 * Perform a test login request using credentials against the Express app
 * @param {string} identifier
 * @param {string} password
 * @returns {Promise<{ status: number, cookie: string, csrfToken: string, body: any }>}
 */
async function loginTestUser(identifier, password) {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ identifier, password });

  const setCookie = response.headers["set-cookie"];
  let cookie = "";
  let csrfToken = response.body?.data?.csrfToken || "";

  if (setCookie && Array.isArray(setCookie) && setCookie.length > 0) {
    const sidCookie = setCookie.find((c) => c.startsWith("hms_sid="))?.split(";")[0];
    const csrfCookie = setCookie.find((c) => c.startsWith("hms_csrf="))?.split(";")[0];

    if (sidCookie) {
      cookie = sidCookie;
    }
    if (!csrfToken && csrfCookie) {
      const match = csrfCookie.match(/hms_csrf=([^;]+)/);
      if (match) {
        csrfToken = decodeURIComponent(match[1]);
      }
    }
  }

  if (csrfToken) {
    lastCsrfToken = csrfToken;
  }

  return {
    status: response.status,
    cookie,
    csrfToken,
    body: response.body,
  };
}

/**
 * Get the latest CSRF token from test logins
 */
function getLastCsrfToken() {
  return lastCsrfToken;
}

/**
 * Perform a test /auth/me request with or without a session cookie
 * @param {string} [cookie]
 * @returns {Promise<{ status: number, body: any }>}
 */
async function getMeTestUser(cookie) {
  const req = request(app).get("/api/v1/auth/me");
  if (cookie) {
    req.set("Cookie", cookie);
  }
  const response = await req;
  return {
    status: response.status,
    body: response.body,
  };
}

/**
 * Perform a test logout request with the given session cookie and CSRF token
 * @param {string} [cookie]
 * @param {string} [csrfToken]
 * @returns {Promise<{ status: number, body: any }>}
 */
async function logoutTestUser(cookie, csrfToken) {
  let token = csrfToken || lastCsrfToken;
  if (!token && cookie) {
    const match = cookie.match(/hms_csrf=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  const req = request(app).post("/api/v1/auth/logout");
  if (cookie) {
    req.set("Cookie", cookie);
  }
  if (token) {
    req.set("X-CSRF-Token", token);
  }
  const response = await req;
  return {
    status: response.status,
    body: response.body,
  };
}

/**
 * Create a temporary test user in the isolated TEST database.
 * NEVER creates users in development or production databases.
 *
 * @param {Object} userData
 * @param {string} userData.fullName
 * @param {string} userData.username
 * @param {string} userData.email
 * @param {string} userData.password
 * @param {string} [userData.role="admin"]
 * @param {boolean} [userData.isActive=true]
 * @param {number|null} [userData.doctorId=null]
 * @returns {Promise<Object>}
 */
async function createTestUser({
  fullName,
  username,
  email,
  password,
  role = "admin",
  isActive = true,
  doctorId = null,
}) {
  if (!isTestDbConfigured()) {
    throw new Error(
      "SAFETY ERROR: Cannot create test users without a dedicated TEST_DB_NAME configured."
    );
  }

  const pool = getTestPool();
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `
      INSERT INTO users (full_name, username, email, password_hash, role, is_active, doctor_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, full_name, username, email, role, is_active, doctor_id
    `,
    [fullName, username.toLowerCase(), email.toLowerCase(), passwordHash, role, isActive, doctorId]
  );

  return result.rows[0];
}

/**
 * Delete a temporary test user from the isolated TEST database.
 *
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function deleteTestUser(userId) {
  if (!isTestDbConfigured()) {
    return;
  }
  const pool = getTestPool();
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
}

/**
 * Clean up all test users created with a specific username prefix.
 *
 * @param {string} prefix
 * @returns {Promise<void>}
 */
async function deleteTestUsersByPrefix(prefix) {
  if (!isTestDbConfigured()) {
    return;
  }
  const pool = getTestPool();
  await pool.query("DELETE FROM users WHERE username LIKE $1", [`${prefix}%`]);
}

module.exports = {
  loginTestUser,
  getMeTestUser,
  logoutTestUser,
  createTestUser,
  deleteTestUser,
  deleteTestUsersByPrefix,
};
