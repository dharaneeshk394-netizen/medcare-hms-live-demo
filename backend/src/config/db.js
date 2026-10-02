const { Pool } = require("pg");

/**
 * PostgreSQL Database Connection Configuration
 *
 * Supports:
 * 1. Hosted PostgreSQL via DATABASE_URL connection string (with secure SSL verification by default)
 * 2. Google Cloud SQL via Unix Domain Socket (SQL_HOST starting with '/')
 * 3. Local / Discrete PostgreSQL via DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 * 4. Dedicated Test Database isolation via TEST_DB_NAME in test environments
 */

const isProduction = process.env.NODE_ENV === "production";
const isTestEnv = process.env.NODE_ENV === "test";
const devDbName =
  process.env.SQL_DB_NAME || process.env.DB_NAME || "hospital_management";

// Valid PostgreSQL identifier regex (standard alphanumeric + underscore, 1 to 63 chars)
const VALID_PG_IDENTIFIER_REGEX = /^[a-zA-Z0-9_]{1,63}$/;

/**
 * Check if a host is local (localhost, 127.0.0.1, ::1, or unix domain socket)
 */
function isLocalHost(hostname) {
  if (!hostname) return true;
  const cleanHost = hostname.toLowerCase().trim();
  return (
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "::1" ||
    cleanHost.startsWith("/")
  );
}

/**
 * Configure SSL for PostgreSQL connection.
 *
 * Policy:
 * 1. In production (NODE_ENV=production), TLS is strictly mandatory for all remote PostgreSQL connections
 *    (whether configured via DATABASE_URL, DB_HOST, or SQL_HOST).
 * 2. In production, rejecting remote configurations that explicitly attempt to disable TLS
 *    (via sslmode=disable, DB_SSL=false/disable/0, or PGSSLMODE=disable).
 * 3. Strict certificate verification (rejectUnauthorized: true) is enforced by default whenever TLS is active.
 * 4. DB_SSL_REJECT_UNAUTHORIZED=false is strictly rejected in production with a fatal error.
 * 5. Localhost and Unix domain sockets (such as Google Cloud SQL sockets) do not require TLS by default in development.
 */
function getSslConfig(targetHost, urlSslMode, isDatabaseUrl) {
  const isRemote = !isLocalHost(targetHost);

  const envSslRaw = (process.env.DB_SSL || process.env.PGSSLMODE || "")
    .toLowerCase()
    .trim();

  const isExplicitlyDisabledByEnv =
    envSslRaw === "false" || envSslRaw === "disable" || envSslRaw === "0";

  const isExplicitlyEnabledByEnv =
    envSslRaw === "true" ||
    envSslRaw === "require" ||
    envSslRaw === "verify-ca" ||
    envSslRaw === "verify-full" ||
    envSslRaw === "1";

  const isExplicitlyDisabledByUrl = urlSslMode === "disable";

  const isExplicitlyEnabledByUrl =
    urlSslMode === "require" ||
    urlSslMode === "verify-ca" ||
    urlSslMode === "verify-full" ||
    urlSslMode === "prefer" ||
    urlSslMode === "no-verify";

  // Production security invariant checks
  if (isProduction) {
    if (process.env.DB_SSL_REJECT_UNAUTHORIZED === "false") {
      throw new Error(
        "SECURITY ERROR: Disabling TLS certificate verification (DB_SSL_REJECT_UNAUTHORIZED=false) is strictly forbidden in production. Rejecting database pool initialization."
      );
    }

    if (isRemote) {
      if (isExplicitlyDisabledByUrl || isExplicitlyDisabledByEnv) {
        throw new Error(
          "SECURITY ERROR: Disabling TLS (via sslmode=disable, DB_SSL=false, or PGSSLMODE=disable) for a remote database host in production is strictly forbidden. Rejecting database pool initialization."
        );
      }
    }
  }

  // Determine whether SSL/TLS is enabled
  let sslRequired = false;

  if (isExplicitlyEnabledByUrl) {
    sslRequired = true;
  } else if (isExplicitlyDisabledByUrl) {
    sslRequired = false;
  } else if (isExplicitlyEnabledByEnv) {
    sslRequired = true;
  } else if (isExplicitlyDisabledByEnv) {
    sslRequired = false;
  } else if (isRemote && (isProduction || isDatabaseUrl)) {
    // Remote hosts in production or via remote connection strings default to requiring TLS
    sslRequired = true;
  }

  if (!sslRequired) {
    return false;
  }

  // Handle certificate verification override in non-production environments only
  if (process.env.DB_SSL_REJECT_UNAUTHORIZED === "false") {
    if (isProduction) {
      throw new Error(
        "SECURITY ERROR: Disabling TLS certificate verification (DB_SSL_REJECT_UNAUTHORIZED=false) is strictly forbidden in production. Rejecting database pool initialization."
      );
    }
    console.warn(
      "SECURITY WARNING: TLS certificate verification is disabled for non-production environment. Do NOT use this setting in production."
    );
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: false };
}

function buildPoolConfig() {
  // Unconditionally reject certificate verification bypass in production before any pool initialization
  if (isProduction && process.env.DB_SSL_REJECT_UNAUTHORIZED === "false") {
    throw new Error(
      "SECURITY ERROR: Disabling TLS certificate verification (DB_SSL_REJECT_UNAUTHORIZED=false) is strictly forbidden in production. Rejecting database pool initialization."
    );
  }

  const rawDatabaseUrl = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.trim()
    : null;

  let targetHost = "127.0.0.1";
  let urlSslMode = null;
  let sanitizedDatabaseUrl = rawDatabaseUrl;

  if (rawDatabaseUrl) {
    try {
      const parsedUrl = new URL(rawDatabaseUrl);
      targetHost = parsedUrl.hostname;
      const modeParam = parsedUrl.searchParams.get("sslmode");
      if (modeParam) {
        urlSslMode = modeParam.toLowerCase().trim();
      }
      // Sanitize URL by stripping sslmode and ssl query params to prevent pg-connection-string conflicts
      parsedUrl.searchParams.delete("sslmode");
      parsedUrl.searchParams.delete("ssl");
      sanitizedDatabaseUrl = parsedUrl.toString();
    } catch {
      if (!rawDatabaseUrl.startsWith("/")) {
        targetHost = "remote";
      }
    }
  } else {
    if (isTestEnv) {
      targetHost =
        process.env.TEST_DB_HOST ||
        process.env.SQL_HOST ||
        process.env.DB_HOST ||
        "127.0.0.1";
    } else {
      targetHost =
        process.env.SQL_HOST ||
        process.env.DB_HOST ||
        "127.0.0.1";
    }
  }

  const ssl = getSslConfig(targetHost, urlSslMode, Boolean(rawDatabaseUrl));

  // 1. Strict Test Mode Isolation & Safeguards
  if (isTestEnv) {
    const rawTestDb = process.env.TEST_DB_NAME;
    const testDbName = rawTestDb ? rawTestDb.trim() : "";

    // Fail-closed validation for test database name
    if (!testDbName) {
      throw new Error(
        "SAFETY ERROR: In test mode (NODE_ENV=test), TEST_DB_NAME must be explicitly configured with a non-empty value. Automated tests are aborted to prevent accidental interaction with development or production databases."
      );
    }

    if (!VALID_PG_IDENTIFIER_REGEX.test(testDbName)) {
      throw new Error(
        "SAFETY ERROR: TEST_DB_NAME (" +
          testDbName +
          ") is not a valid PostgreSQL identifier. It must be 1-63 characters containing only letters, numbers, and underscores."
      );
    }

    if (testDbName === devDbName) {
      throw new Error(
        "SAFETY ERROR: In test mode (NODE_ENV=test), TEST_DB_NAME (" +
          testDbName +
          ") cannot match the development/production database name (" +
          devDbName +
          "). Automated tests are aborted to prevent accidental interaction with development or production databases."
      );
    }

    // Note: Validating the database name is a defensive safeguard against unintentional misconfiguration;
    // it does not replace physical database provisioning and environment boundary controls.

    if (rawDatabaseUrl) {
      try {
        const url = new URL(rawDatabaseUrl);
        url.pathname = `/${testDbName}`;
        url.searchParams.delete("sslmode");
        url.searchParams.delete("ssl");
        return {
          connectionString: url.toString(),
          ...(ssl ? { ssl } : {}),
          max: Number(process.env.DB_POOL_MAX) || 10,
          connectionTimeoutMillis: 15000,
        };
      } catch {
        // If DATABASE_URL is not a standard URL, fallback to discrete test configuration
      }
    }

    const host =
      process.env.TEST_DB_HOST ||
      process.env.SQL_HOST ||
      process.env.DB_HOST ||
      "127.0.0.1";
    const isUnixSocket = host.startsWith("/");
    const port = isUnixSocket
      ? undefined
      : Number(process.env.TEST_DB_PORT || process.env.DB_PORT) || 5432;
    const user =
      process.env.TEST_DB_USER ||
      process.env.SQL_USER ||
      process.env.DB_USER ||
      "postgres";
    const password =
      process.env.TEST_DB_PASSWORD ||
      process.env.SQL_PASSWORD ||
      process.env.DB_PASSWORD ||
      "";

    return {
      host,
      ...(port ? { port } : {}),
      database: testDbName,
      user,
      password,
      ...(ssl ? { ssl } : {}),
      max: Number(process.env.DB_POOL_MAX) || 10,
      connectionTimeoutMillis: 15000,
    };
  }

  // 2. Hosted PostgreSQL using connection string (DATABASE_URL) in development / production
  if (rawDatabaseUrl) {
    return {
      connectionString: sanitizedDatabaseUrl,
      ...(ssl ? { ssl } : {}),
      max: Number(process.env.DB_POOL_MAX) || 10,
      connectionTimeoutMillis: 15000,
    };
  }

  // 3. Discrete environment variable fallback (Local Development / Google Cloud SQL)
  const host = process.env.SQL_HOST || process.env.DB_HOST || "127.0.0.1";
  const isUnixSocket = host.startsWith("/");
  const port = isUnixSocket
    ? undefined
    : Number(process.env.DB_PORT) || 5432;
  const database = devDbName;
  const user = process.env.SQL_USER || process.env.DB_USER || "postgres";
  const password =
    process.env.SQL_PASSWORD || process.env.DB_PASSWORD || "";

  return {
    host,
    ...(port ? { port } : {}),
    database,
    user,
    password,
    ...(ssl ? { ssl } : {}),
    max: Number(process.env.DB_POOL_MAX) || 10,
    connectionTimeoutMillis: 15000,
  };
}

const poolConfig = buildPoolConfig();
const pool = new Pool(poolConfig);

pool.on("error", (error) => {
  console.error(
    "Unexpected PostgreSQL pool error:",
    error.message || "Database error"
  );
});

async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log("PostgreSQL database connected successfully");
    client.release();
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
    throw error;
  }
}

module.exports = {
  pool,
  testDatabaseConnection,
};



