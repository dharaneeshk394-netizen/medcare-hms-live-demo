const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");

/**
 * Find user by username or email for authentication verification.
 * Internal use only — includes password_hash and is_active.
 *
 * @param {string} identifier - Username or email address
 * @returns {Promise<Object|null>}
 */
async function findUserForAuth(identifier) {
  if (!identifier || typeof identifier !== "string") {
    return null;
  }

  const cleanIdentifier = identifier.trim().toLowerCase();

  const result = await pool.query(
    `
      SELECT
        id,
        full_name,
        username,
        email,
        password_hash,
        role,
        is_active,
        doctor_id
      FROM users
      WHERE LOWER(username) = $1 OR LOWER(email) = $1
      LIMIT 1
    `,
    [cleanIdentifier]
  );

  return result.rows[0] || null;
}

/**
 * Get safe user details by ID.
 * Excludes password_hash completely.
 *
 * @param {number|string} id - User ID
 * @returns {Promise<Object|null>}
 */
async function getUserById(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT
        id,
        full_name AS "fullName",
        username,
        email,
        role,
        is_active AS "isActive",
        doctor_id AS "doctorId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [numericId]
  );

  return result.rows[0] || null;
}

/**
 * Verify a plain-text password against a bcrypt hash.
 *
 * @param {string} plainPassword
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) {
    return false;
  }
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Hash a plain-text password using bcrypt.
 *
 * @param {string} plainPassword
 * @param {number} saltRounds - Default 12
 * @returns {Promise<string>}
 */
async function hashPassword(plainPassword, saltRounds = 12) {
  return bcrypt.hash(plainPassword, saltRounds);
}

module.exports = {
  findUserForAuth,
  getUserById,
  verifyPassword,
  hashPassword,
};
