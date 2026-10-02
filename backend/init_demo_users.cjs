const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

/**
 * Check if a host is local (localhost, 127.0.0.1, ::1, or unix domain socket)
 */
function isLocalHost(hostname) {
  if (!hostname) return true;
  const cleanHost = hostname.toLowerCase().trim();
  return (
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === '::1' ||
    cleanHost.startsWith('/')
  );
}

// Support DATABASE_URL, standard PostgreSQL environment variables (PG* / DB_*), and Cloud SQL variables (SQL_*)
let poolConfig = {};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  if (!process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')) {
    if (process.env.DB_SSL !== 'false' && process.env.PGSSLMODE !== 'disable') {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  }
} else {
  const host = process.env.PGHOST || process.env.SQL_HOST || process.env.DB_HOST || '127.0.0.1';
  const isUnixSocket = host.startsWith('/');
  const port = isUnixSocket ? undefined : Number(process.env.PGPORT || process.env.DB_PORT) || 5432;
  const database = process.env.PGDATABASE || process.env.SQL_DB_NAME || process.env.DB_NAME || 'hospital_management';
  const user = process.env.PGUSER || process.env.SQL_USER || process.env.SQL_ADMIN_USER || process.env.DB_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DB_PASSWORD || '';

  poolConfig = {
    host,
    ...(port ? { port } : {}),
    database,
    user,
    password,
  };

  if (!isLocalHost(host) && (process.env.DB_SSL === 'true' || process.env.PGSSLMODE === 'require')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

async function initDemoUsers() {
  const client = await pool.connect();

  async function safeQuery(sql, params = []) {
    try {
      return await client.query(sql, params);
    } catch (err) {
      if (err.code === '42501' || err.message.includes('must be owner') || err.message.includes('permission denied')) {
        return null;
      }
      throw err;
    }
  }

  try {
    console.log('--- Initializing MedCare HMS Demo Users ---');

    // 1. Ensure prerequisites for doctor foreign key exist
    console.log('1. Ensuring doctor profile for Dr. Sarah Mitchell exists...');
    await safeQuery(`
      INSERT INTO public.departments (id, department_id, name, description, status)
      VALUES (1, 'DEP-001', 'Cardiology & Heart Care', 'Comprehensive cardiovascular diagnostics and clinical care', 'Active')
      ON CONFLICT (id) DO NOTHING;
    `);

    await safeQuery(`
      INSERT INTO public.doctors (id, doctor_id, name, specialization, phone, email, department, status)
      VALUES (1, 'DOC-001', 'Dr. Sarah Mitchell', 'Cardiology', '555-0101', 'sarah.mitchell@medcare-hms.local', 'Cardiology & Heart Care', 'Active')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Prepare hashed password
    console.log('2. Preparing demo user accounts with secure bcrypt hashing (10 rounds)...');
    const demoPasswordHash = bcrypt.hashSync('Demo@1234', 10);

    const demoUsers = [
      {
        id: 1,
        full_name: 'MedCare Administrator',
        username: 'admin',
        email: 'admin@medcare-hms.local',
        role: 'admin',
        is_active: true,
        doctor_id: null,
      },
      {
        id: 2,
        full_name: 'Dr. Sarah Mitchell',
        username: 'dr.sarah',
        email: 'sarah.mitchell@medcare-hms.local',
        role: 'doctor',
        is_active: true,
        doctor_id: 1,
      },
      {
        id: 3,
        full_name: 'Emily Davis',
        username: 'receptionist',
        email: 'receptionist@medcare-hms.local',
        role: 'receptionist',
        is_active: true,
        doctor_id: null,
      },
    ];

    for (const u of demoUsers) {
      // Check if user already exists by username
      const existingUser = await client.query('SELECT id, username FROM public.users WHERE username = $1;', [u.username]);

      if (existingUser.rows.length === 0) {
        // Insert new demo user without modifying any existing accounts
        await client.query(
          `INSERT INTO public.users (id, full_name, username, email, password_hash, role, is_active, doctor_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (username) DO NOTHING;`,
          [u.id, u.full_name, u.username, u.email, demoPasswordHash, u.role, u.is_active, u.doctor_id]
        );
        console.log(`  ✓ Created demo user: ${u.username} (${u.role})`);
      } else {
        console.log(`  - Demo user ${u.username} already exists (preserving existing password & state)`);
      }
    }

    // 3. Synchronize users sequence
    console.log('3. Synchronizing users sequence counter...');
    await safeQuery(`SELECT setval('public.users_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM public.users), 1), 3), true);`);
    await safeQuery(`SELECT setval('public.doctors_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM public.doctors), 1), 1), true);`);
    await safeQuery(`SELECT setval('public.departments_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM public.departments), 1), 1), true);`);

    console.log('>>> DEMO USERS INITIALIZATION COMPLETED SUCCESSFULLY <<<');
  } catch (err) {
    console.error('DEMO USERS INITIALIZATION FAILED:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDemoUsers();
