/**
 * MedCare Hospital Management System (HMS)
 * Buyer Setup & Environment Diagnostic Tool
 *
 * Runs non-destructive health checks to verify:
 * 1. Node.js runtime compatibility
 * 2. Environment variables & session security configuration
 * 3. PostgreSQL database connectivity
 * 4. Database tables and schema integrity
 * 5. Sequence generators
 * 6. Hospital profile and system settings initialization
 * 7. Active administrator account presence
 *
 * Usage:
 *   npm run setup:check
 *   node backend/scripts/setup_check.cjs
 */

const path = require("path");
const fs = require("fs");

// Load .env if present
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
} catch {
  // dotenv might already be loaded
}

const { pool } = require("../src/config/db");

// ANSI formatting helpers
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
};

function logHeader() {
  console.log("");
  console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  MEDCARE HOSPITAL MANAGEMENT SYSTEM (HMS)            ${colors.reset}`);
  console.log(`${colors.bold}  Buyer Installation & Environment Diagnostic Checker ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}`);
  console.log("");
}

async function runDiagnostics() {
  logHeader();

  let hasErrors = false;
  let hasWarnings = false;

  // -------------------------------------------------------------
  // 1. Node.js Runtime Check
  // -------------------------------------------------------------
  console.log(`${colors.bold}[1/6] Checking Node.js Runtime Compatibility...${colors.reset}`);
  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.split(".")[0], 10);

  if (majorVersion >= 20) {
    console.log(`  ${colors.green}✓${colors.reset} Node.js v${nodeVersion} detected (Compatible LTS version >= v20.0.0)`);
  } else if (majorVersion >= 18) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Node.js v${nodeVersion} detected (v20+ LTS is recommended for best performance)`);
    hasWarnings = true;
  } else {
    console.log(`  ${colors.red}✗${colors.reset} Node.js v${nodeVersion} detected. MedCare HMS requires Node.js v20.0.0 or higher.`);
    hasErrors = true;
  }

  // -------------------------------------------------------------
  // 2. Environment Configuration Check
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[2/6] Checking Environment Variables & Security Configuration...${colors.reset}`);

  const envPath = path.resolve(__dirname, "../../.env");
  const envExists = fs.existsSync(envPath);
  if (envExists) {
    console.log(`  ${colors.green}✓${colors.reset} .env configuration file found in project root`);
  } else {
    console.log(`  ${colors.yellow}⚠${colors.reset} .env file not found in root. Using process environment variables or defaults.`);
    console.log(`    ${colors.dim}Tip: Copy .env.example to .env to configure local settings.${colors.reset}`);
    hasWarnings = true;
  }

  const isProduction = process.env.NODE_ENV === "production";
  console.log(`  ${colors.green}✓${colors.reset} Runtime Environment: ${colors.bold}${process.env.NODE_ENV || "development"}${colors.reset}`);

  const port = process.env.PORT || 3000;
  console.log(`  ${colors.green}✓${colors.reset} Server Port: ${colors.bold}${port}${colors.reset}`);

  // Check SESSION_SECRET
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    if (isProduction) {
      console.log(`  ${colors.red}✗${colors.reset} SESSION_SECRET is not configured! A strong secret is required in production.`);
      hasErrors = true;
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} SESSION_SECRET is not set. A development fallback will be used.`);
      console.log(`    ${colors.dim}Note: Define a strong SESSION_SECRET in .env for persistent login sessions.${colors.reset}`);
      hasWarnings = true;
    }
  } else if (sessionSecret.length < 32) {
    if (isProduction) {
      console.log(`  ${colors.red}✗${colors.reset} SESSION_SECRET is too short (${sessionSecret.length} chars). Production requires >= 32 chars.`);
      hasErrors = true;
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} SESSION_SECRET is ${sessionSecret.length} characters (>= 32 chars recommended).`);
      hasWarnings = true;
    }
  } else {
    console.log(`  ${colors.green}✓${colors.reset} SESSION_SECRET is securely configured (${sessionSecret.length} characters)`);
  }

  // -------------------------------------------------------------
  // 3. PostgreSQL Database Connection Check
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[3/6] Checking PostgreSQL Database Connectivity...${colors.reset}`);

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  if (hasDatabaseUrl) {
    try {
      const parsed = new URL(process.env.DATABASE_URL.trim());
      console.log(`  ${colors.green}✓${colors.reset} Database Mode: Connection String (Host: ${parsed.hostname}, Database: ${parsed.pathname.replace("/", "") || "default"})`);
    } catch {
      console.log(`  ${colors.green}✓${colors.reset} Database Mode: Custom Connection String`);
    }
  } else {
    const host = process.env.PGHOST || process.env.SQL_HOST || process.env.DB_HOST || "127.0.0.1";
    const database = process.env.PGDATABASE || process.env.SQL_DB_NAME || process.env.DB_NAME || "hospital_management";
    const user = process.env.PGUSER || process.env.SQL_USER || process.env.SQL_ADMIN_USER || process.env.DB_USER || "postgres";
    const hasPass = Boolean(process.env.PGPASSWORD || process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DB_PASSWORD);

    console.log(`  ${colors.green}✓${colors.reset} Database Mode: Discrete Configuration`);
    console.log(`    - Host: ${host}`);
    console.log(`    - Database: ${database}`);
    console.log(`    - User: ${user}`);
    console.log(`    - Password: ${hasPass ? "**** (Configured)" : "[Empty / Not Set]"}`);
  }

  let client = null;
  try {
    client = await pool.connect();
    const versionRes = await client.query("SELECT version();");
    const pgVersion = versionRes.rows[0].version.split(" ")[1] || "Unknown";
    console.log(`  ${colors.green}✓${colors.reset} Connected to PostgreSQL successfully (Engine: PostgreSQL ${pgVersion})`);
  } catch (dbErr) {
    console.log(`  ${colors.red}✗${colors.reset} Database Connection Failed: ${dbErr.message}`);
    console.log(`\n  ${colors.yellow}Troubleshooting tips:${colors.reset}`);
    console.log(`    1. Ensure your PostgreSQL server is active and accepting connections.`);
    console.log(`    2. Verify credentials in .env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD or DATABASE_URL).`);
    console.log(`    3. If the database does not exist yet, create it using:`);
    console.log(`       createdb -U postgres hospital_management`);
    console.log(`    4. Initialize tables by running:`);
    console.log(`       npm run db:seed`);
    console.log("");
    await pool.end();
    process.exit(1);
  }

  // -------------------------------------------------------------
  // 4. Schema & Table Integrity Check
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[4/6] Verifying Core Database Schema & Tables...${colors.reset}`);

  const requiredTables = [
    "users",
    "session",
    "departments",
    "doctors",
    "patients",
    "appointments",
    "admissions",
    "prescriptions",
    "prescription_items",
    "medical_records",
    "staff",
    "invoices",
    "invoice_items",
    "payments",
    "medicines",
    "medicine_batches",
    "medicine_dispensations",
    "lab_test_catalog",
    "lab_orders",
    "lab_order_items",
    "notifications",
    "system_settings",
    "audit_logs",
  ];

  try {
    const tableRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);

    const existingTables = new Set(tableRes.rows.map((r) => r.table_name));
    const missingTables = requiredTables.filter((t) => !existingTables.has(t));

    if (missingTables.length === 0) {
      console.log(`  ${colors.green}✓${colors.reset} All ${requiredTables.length} core database tables are present and verified:`);
      const tableListFormatted = requiredTables.map((t) => `${colors.dim}${t}${colors.reset}`).join(", ");
      console.log(`    ${tableListFormatted}`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Missing ${missingTables.length} table(s): ${missingTables.join(", ")}`);
      console.log(`    ${colors.yellow}Action Required: Run 'npm run db:seed' to create tables and initialize schema.${colors.reset}`);
      hasErrors = true;
    }
  } catch (schemaErr) {
    console.log(`  ${colors.red}✗${colors.reset} Error querying schema tables: ${schemaErr.message}`);
    hasErrors = true;
  }

  // -------------------------------------------------------------
  // 5. Sequence Generators Check
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[5/6] Verifying Sequence Generators...${colors.reset}`);

  const requiredSequences = [
    "prescription_number_seq",
    "medical_record_number_seq",
    "staff_number_seq",
    "invoice_number_seq",
    "payment_number_seq",
    "medicine_code_seq",
    "dispensation_number_seq",
    "lab_order_number_seq",
    "lab_test_code_seq",
  ];

  try {
    const seqRes = await client.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public';
    `);

    const existingSequences = new Set(seqRes.rows.map((r) => r.sequence_name));
    const missingSequences = requiredSequences.filter((s) => !existingSequences.has(s));

    if (missingSequences.length === 0) {
      console.log(`  ${colors.green}✓${colors.reset} All ${requiredSequences.length} business document sequence generators are active`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} Missing ${missingSequences.length} sequence(s): ${missingSequences.join(", ")}`);
      console.log(`    ${colors.dim}Run 'npm run db:seed' to create all missing sequences.${colors.reset}`);
      hasWarnings = true;
    }
  } catch (seqErr) {
    console.log(`  ${colors.yellow}⚠${colors.reset} Sequence check notice: ${seqErr.message}`);
    hasWarnings = true;
  }

  // -------------------------------------------------------------
  // 6. Hospital Settings & Demo Accounts Check
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[6/6] Verifying System Settings & Demo Accounts...${colors.reset}`);

  // Check system_settings table
  try {
    const settingsRes = await client.query("SELECT hospital_name, currency_code, currency_symbol, tax_name, tax_rate FROM public.system_settings WHERE id = 1;");
    if (settingsRes.rows.length > 0) {
      const s = settingsRes.rows[0];
      console.log(`  ${colors.green}✓${colors.reset} Hospital Profile Configured: "${colors.bold}${s.hospital_name}${colors.reset}" (Currency: ${s.currency_code} / ${s.currency_symbol}, Tax: ${s.tax_name} ${s.tax_rate}%)`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} System settings record not found. Run 'npm run db:seed' to seed default hospital branding.`);
      hasWarnings = true;
    }
  } catch {
    console.log(`  ${colors.yellow}⚠${colors.reset} Could not inspect system_settings table.`);
    hasWarnings = true;
  }

  // Check demo users
  try {
    const usersRes = await client.query(`
      SELECT username, role, is_active
      FROM public.users
      ORDER BY id ASC;
    `);

    const adminUser = usersRes.rows.find((u) => u.role === "admin" && u.is_active);
    const doctorUser = usersRes.rows.find((u) => u.role === "doctor" && u.is_active);
    const receptionistUser = usersRes.rows.find((u) => u.role === "receptionist" && u.is_active);

    if (adminUser) {
      console.log(`  ${colors.green}✓${colors.reset} Active Administrator account found: "${colors.bold}${adminUser.username}${colors.reset}"`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} No active Administrator account found! Run 'npm run db:seed' to create the default admin.`);
      hasErrors = true;
    }

    if (doctorUser) {
      console.log(`  ${colors.green}✓${colors.reset} Active Doctor demo account found: "${doctorUser.username}"`);
    }
    if (receptionistUser) {
      console.log(`  ${colors.green}✓${colors.reset} Active Receptionist demo account found: "${receptionistUser.username}"`);
    }
    console.log(`  ${colors.green}✓${colors.reset} Total system user accounts: ${usersRes.rows.length}`);
  } catch (userErr) {
    console.log(`  ${colors.red}✗${colors.reset} Could not query user accounts: ${userErr.message}`);
    hasErrors = true;
  }

  // Release client & pool
  if (client) client.release();
  await pool.end();

  // -------------------------------------------------------------
  // Diagnostic Summary
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bold}  DIAGNOSTIC SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}`);

  if (!hasErrors && !hasWarnings) {
    console.log(`\n  ${colors.bold}${colors.green}>>> ALL SYSTEMS OPERATIONAL & READY TO RUN <<<${colors.reset}`);
    console.log(`\n  To start the application in development mode:`);
    console.log(`    ${colors.bold}npm run dev${colors.reset}`);
    console.log(`\n  To build and run in production:`);
    console.log(`    ${colors.bold}npm run build${colors.reset}`);
    console.log(`    ${colors.bold}npm start${colors.reset}`);
    console.log(`\n  Default Demo Login Credentials:`);
    console.log(`    - Administrator: ${colors.bold}admin${colors.reset} / ${colors.bold}Demo@1234${colors.reset}`);
    console.log(`    - Doctor:        ${colors.bold}dr.sarah${colors.reset} / ${colors.bold}Demo@1234${colors.reset}`);
    console.log(`    - Receptionist:  ${colors.bold}receptionist${colors.reset} / ${colors.bold}Demo@1234${colors.reset}`);
    console.log(`\n  ${colors.dim}Security Notice: Always change default passwords before deploying to production.${colors.reset}\n`);
    process.exit(0);
  } else if (!hasErrors && hasWarnings) {
    console.log(`\n  ${colors.bold}${colors.yellow}>>> SETUP READY WITH MINOR NOTICES <<<${colors.reset}`);
    console.log(`  Review the warnings above to optimize your configuration.`);
    console.log(`  You can start the application with: ${colors.bold}npm run dev${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n  ${colors.bold}${colors.red}>>> SETUP INCOMPLETE — ACTION REQUIRED <<<${colors.reset}`);
    console.log(`  Please resolve the errors highlighted above before launching.`);
    console.log(`  If you have not initialized the database yet, run:`);
    console.log(`    ${colors.bold}npm run db:seed${colors.reset}\n`);
    process.exit(1);
  }
}

runDiagnostics().catch((err) => {
  console.error(`\n${colors.red}Fatal Diagnostic Error:${colors.reset}`, err.message);
  process.exit(1);
});
