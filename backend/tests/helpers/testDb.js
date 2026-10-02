const { Pool } = require("pg");

/**
 * Test Database Helper
 *
 * Dedicated to test environments to ensure zero accidental mutations
 * or destructive actions against development or production databases.
 */

const devDbName =
  process.env.SQL_DB_NAME || process.env.DB_NAME || "hospital_management";

function isTestDbConfigured() {
  const testDb = process.env.TEST_DB_NAME;
  return Boolean(testDb && testDb.trim().length > 0 && testDb !== devDbName);
}

// Host determination matching existing config pattern
const host =
  process.env.TEST_DB_HOST ||
  process.env.SQL_HOST ||
  process.env.DB_HOST ||
  "127.0.0.1";
const isUnixSocket = host.startsWith("/");

const port = isUnixSocket
  ? undefined
  : Number(process.env.TEST_DB_PORT || process.env.DB_PORT) || 5432;

const database = process.env.TEST_DB_NAME || null;

const user =
  process.env.TEST_DB_USER ||
  process.env.SQL_ADMIN_USER ||
  process.env.SQL_USER ||
  process.env.DB_USER ||
  "postgres";

const password =
  process.env.TEST_DB_PASSWORD ||
  process.env.SQL_ADMIN_PASSWORD ||
  process.env.SQL_PASSWORD ||
  process.env.DB_PASSWORD ||
  "";

let testPool = null;

function getTestPool() {
  if (!isTestDbConfigured()) {
    throw new Error(
      "SAFETY ERROR: Dedicated TEST_DB_NAME environment variable is not configured. Automated database tests are aborted to prevent accidental interaction with the development/Cloud SQL database."
    );
  }

  if (!testPool) {
    testPool = new Pool({
      host,
      ...(port ? { port } : {}),
      database,
      user,
      password,
      max: 5,
      connectionTimeoutMillis: 10000,
    });

    testPool.on("error", (err) => {
      console.error("Unexpected test database pool error:", err);
    });
  }
  return testPool;
}

async function closeTestDb() {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

async function closeAppDb() {
  try {
    const { pool } = require("../../src/config/db");
    if (pool) {
      await pool.end();
    }
  } catch {
    // Ignore if app pool was not initialized
  }
}

module.exports = {
  isTestDbConfigured,
  getTestPool,
  closeTestDb,
  closeAppDb,
};
