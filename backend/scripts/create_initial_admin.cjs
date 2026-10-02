/**
 * Dedicated One-Time Initial Administrator Creation Script
 *
 * This administrative CLI utility prompts for initial admin credentials
 * via secure, interactive terminal input. Passwords are typed invisibly
 * and hashed with bcrypt (cost factor 12) before persistence.
 *
 * Usage:
 *   node backend/scripts/create_initial_admin.cjs
 *
 * Safety Constraints:
 * - Credentials are NEVER hard-coded, logged, or written to disk.
 * - Password input is masked while typing.
 * - Enforces single-admin initialization: refuses to run if an administrator exists.
 * - Does not alter or touch any clinical HMS tables.
 */

const readline = require("readline");
const { Writable } = require("stream");
const { pool } = require("../src/config/db");
const { hashPassword } = require("../src/services/authService");

// Standard email validation pattern
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Prompt user for visible text input.
 */
function promptInput(queryText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(queryText, (answer) => {
      rl.close();
      resolve(answer ? answer.trim() : "");
    });
  });
}

/**
 * Prompt user for masked/hidden password input.
 * Characters typed into the terminal will not be echoed back.
 */
function promptHiddenInput(queryText) {
  return new Promise((resolve) => {
    let isMuted = false;

    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!isMuted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });

    process.stdout.write(queryText);
    isMuted = true;

    rl.question("", (answer) => {
      isMuted = false;
      process.stdout.write("\n");
      rl.close();
      resolve(answer || "");
    });
  });
}

/**
 * Main execution routine.
 */
async function run() {
  console.log("\n=======================================================");
  console.log("  Hospital Management System — Initial Admin Provisioning");
  console.log("=======================================================\n");

  let client;

  try {
    // 1. Connect to PostgreSQL and verify database access
    client = await pool.connect();

    // 2. Pre-check: Ensure no administrator account already exists
    const existingAdminCheck = await client.query(
      "SELECT id, username FROM public.users WHERE role = $1 LIMIT 1;",
      ["admin"]
    );

    if (existingAdminCheck.rows.length > 0) {
      console.warn(
        "Notice: An administrator account already exists in the system."
      );
      console.warn("For safety, this initial setup script cannot be re-run.");
      return;
    }

    // 3. Acquire credentials via environment variables (non-interactive) or terminal prompts (interactive)
    let fullName = "";
    let username = "";
    let email = "";
    let password = "";

    const envFullName = process.env.ADMIN_FULL_NAME;
    const envUsername = process.env.ADMIN_USERNAME;
    const envEmail = process.env.ADMIN_EMAIL;
    const envPassword = process.env.ADMIN_PASSWORD;

    const hasEnvCredentials = Boolean(
      envFullName && envUsername && envEmail && envPassword
    );

    if (hasEnvCredentials) {
      console.log("Detected ADMIN_* environment variables. Running in non-interactive mode.");

      fullName = (envFullName || "").trim();
      username = (envUsername || "").toLowerCase().trim();
      email = (envEmail || "").toLowerCase().trim();
      password = envPassword || "";

      if (!fullName || fullName.length < 2 || fullName.length > 100) {
        console.error("Validation error: ADMIN_FULL_NAME must be between 2 and 100 characters.");
        return;
      }

      if (!username || !/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
        console.error("Validation error: ADMIN_USERNAME must be 3-50 characters (letters, numbers, '.', '_', '-').");
        return;
      }

      if (!email || !EMAIL_REGEX.test(email) || email.length > 150) {
        console.error("Validation error: ADMIN_EMAIL must be a valid email address.");
        return;
      }

      if (!password || password.length < 10) {
        console.error("Validation error: ADMIN_PASSWORD must be at least 10 characters long.");
        return;
      }
    } else {
      console.log("No complete set of ADMIN_* environment variables detected. Starting interactive mode.\n");

      fullName = await promptInput("Enter Administrator Full Name: ");
      if (!fullName || fullName.length < 2 || fullName.length > 100) {
        console.error(
          "Validation error: Full name is required and must be between 2 and 100 characters."
        );
        return;
      }

      const rawUsername = await promptInput("Enter Admin Username: ");
      username = rawUsername.toLowerCase().trim();
      if (!username || !/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
        console.error(
          "Validation error: Username must be 3-50 characters (letters, numbers, '.', '_', '-')."
        );
        return;
      }

      const rawEmail = await promptInput("Enter Admin Email: ");
      email = rawEmail.toLowerCase().trim();
      if (!email || !EMAIL_REGEX.test(email) || email.length > 150) {
        console.error("Validation error: A valid email address is required.");
        return;
      }

      password = await promptHiddenInput(
        "Enter Password (minimum 10 characters, hidden): "
      );
      if (!password || password.length < 10) {
        console.error(
          "Validation error: Password must be at least 10 characters long."
        );
        return;
      }

      const passwordConfirm = await promptHiddenInput(
        "Confirm Password (hidden): "
      );
      if (password !== passwordConfirm) {
        console.error("Validation error: Password confirmation does not match.");
        return;
      }
    }

    // 4. Begin transaction for safe atomic persistence
    await client.query("BEGIN");

    // 5. Verify username and email uniqueness
    const conflictCheck = await client.query(
      `
        SELECT username, email
        FROM public.users
        WHERE LOWER(username) = $1 OR LOWER(email) = $2
        LIMIT 1;
      `,
      [username, email]
    );

    if (conflictCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      console.error(
        "Conflict error: A user with this username or email already exists."
      );
      return;
    }

    // 6. Hash password using authService helper with cost factor 12
    const passwordHash = await hashPassword(password, 12);

    // 7. Insert the initial administrator record
    const insertQuery = `
      INSERT INTO public.users (
        full_name,
        username,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, 'admin', true)
      RETURNING id, full_name, username, email, role, is_active, created_at;
    `;

    const insertResult = await client.query(insertQuery, [
      fullName,
      username,
      email,
      passwordHash,
    ]);

    await client.query("COMMIT");

    const createdAdmin = insertResult.rows[0];

    // 8. Output safe metadata ONLY — never output passwords or hashes
    console.log("\n=======================================================");
    console.log("  Initial Administrator Account Provisioned Successfully");
    console.log("=======================================================");
    console.log(`  User ID:    ${createdAdmin.id}`);
    console.log(`  Full Name:  ${createdAdmin.full_name}`);
    console.log(`  Username:   ${createdAdmin.username}`);
    console.log(`  Email:      ${createdAdmin.email}`);
    console.log(`  Role:       ${createdAdmin.role}`);
    console.log(`  Active:     ${createdAdmin.is_active}`);
    console.log(`  Created At: ${createdAdmin.created_at}`);
    console.log("=======================================================\n");
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Suppress rollback errors
      }
    }
    console.error("Failed to provision initial administrator:", error.message);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Only execute when invoked directly from CLI
if (require.main === module) {
  run().catch((err) => {
    console.error("Unexpected execution error:", err.message);
    process.exit(1);
  });
}

module.exports = { run };
