const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("child_process");
const { pool } = require("../../src/config/db");

describe("Buyer Installation & Setup System Suite", () => {
  describe("1. Environment & Setup Diagnostic Script Execution", () => {
    test("setup_check.cjs executes successfully and exits with code 0 in valid environment", () => {
      const output = execSync("node backend/scripts/setup_check.cjs", {
        encoding: "utf-8",
        env: {
          ...process.env,
          NODE_ENV: "test",
        },
      });

      assert.ok(output.includes("MEDCARE HOSPITAL MANAGEMENT SYSTEM (HMS)"));
      assert.ok(output.includes("Buyer Installation & Environment Diagnostic Checker"));
      assert.ok(output.includes("Node.js Runtime Compatibility"));
      assert.ok(output.includes("Checking PostgreSQL Database Connectivity"));
      assert.ok(output.includes("Verifying Core Database Schema & Tables"));
      assert.ok(output.includes("DIAGNOSTIC SUMMARY"));
    });

    test("setup_check.cjs masks passwords and never leaks database or session secrets", () => {
      const output = execSync("node backend/scripts/setup_check.cjs", {
        encoding: "utf-8",
        env: {
          ...process.env,
          NODE_ENV: "test",
          DB_PASSWORD: "SuperSecretTestPassword123!",
          SESSION_SECRET: "SecretSessionSigningKeyThatMustNeverBePrintedInLogs123!",
        },
      });

      assert.ok(!output.includes("SuperSecretTestPassword123!"), "Raw database password must not be exposed in stdout");
      assert.ok(!output.includes("SecretSessionSigningKeyThatMustNeverBePrintedInLogs123!"), "Raw session secret must not be exposed in stdout");
      assert.ok(output.includes("****"), "Passwords must be safely masked");
    });
  });

  describe("2. Database Schema & Tables Completeness", () => {
    test("all 23 core database tables exist in the public schema", async () => {
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

      const res = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `);

      const existing = new Set(res.rows.map((r) => r.table_name));
      for (const table of requiredTables) {
        assert.ok(existing.has(table), `Table ${table} must exist in the database`);
      }
    });

    test("all document sequence generators exist and are active", async () => {
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

      const res = await pool.query(`
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public';
      `);

      const existing = new Set(res.rows.map((r) => r.sequence_name));
      for (const seq of requiredSequences) {
        assert.ok(existing.has(seq), `Sequence ${seq} must exist in the database`);
      }
    });
  });

  describe("3. System Settings & Demo Accounts Integrity", () => {
    test("system_settings table contains the default hospital profile record (id = 1)", async () => {
      const res = await pool.query("SELECT * FROM public.system_settings WHERE id = 1;");
      assert.strictEqual(res.rows.length, 1);
      const settings = res.rows[0];
      assert.ok(settings.hospital_name, "Hospital name must be configured");
      assert.ok(settings.currency_code, "Currency code must be configured");
      assert.ok(settings.currency_symbol, "Currency symbol must be configured");
    });

    test("required demo user accounts exist with active status", async () => {
      const res = await pool.query("SELECT username, role, is_active FROM public.users;");
      const users = res.rows;

      const admin = users.find((u) => u.username === "admin" && u.role === "admin" && u.is_active);
      const doctor = users.find((u) => u.username === "dr.sarah" && u.role === "doctor" && u.is_active);
      const receptionist = users.find((u) => u.username === "receptionist" && u.role === "receptionist" && u.is_active);

      assert.ok(admin, "Active admin user must exist");
      assert.ok(doctor, "Active doctor user (dr.sarah) must exist");
      assert.ok(receptionist, "Active receptionist user must exist");
    });
  });
});
