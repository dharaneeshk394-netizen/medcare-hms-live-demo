const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { getTestPool, isTestDbConfigured, closeTestDb } = require("../helpers/testDb");

describe("Staff Database Schema & Constraints Tests", () => {
  let pool;
  let testUser, testDept;
  const createdStaffIds = [];

  before(async () => {
    if (!isTestDbConfigured()) return;
    pool = getTestPool();

    // Ensure staff table and sequences exist
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS public.staff_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
      CREATE SEQUENCE IF NOT EXISTS public.staff_number_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

      CREATE TABLE IF NOT EXISTS public.staff (
        id integer NOT NULL DEFAULT nextval('public.staff_id_seq'::regclass),
        staff_number character varying(30) NOT NULL DEFAULT ('STF-'::text || lpad((nextval('public.staff_number_seq'::regclass))::text, 6, '0'::text)),
        first_name character varying(100) NOT NULL,
        last_name character varying(100) NOT NULL,
        department_id integer,
        designation character varying(100) NOT NULL,
        phone character varying(30) NOT NULL,
        email character varying(150),
        date_of_joining date NOT NULL DEFAULT CURRENT_DATE,
        employment_status character varying(30) NOT NULL DEFAULT 'ACTIVE'::character varying,
        created_by integer,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT staff_pkey PRIMARY KEY (id),
        CONSTRAINT staff_staff_number_key UNIQUE (staff_number),
        CONSTRAINT staff_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL,
        CONSTRAINT staff_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT staff_employment_status_check CHECK (((employment_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'ON_LEAVE'::character varying, 'TERMINATED'::character varying])::text[])))
      );
    `);

    // Create a test user and department
    const userRes = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active) 
       VALUES ('Staff DB Admin', 'staff_db_admin_${Date.now()}', 'staff_db_${Date.now()}@test.local', 'hash', 'admin', true) 
       RETURNING id`
    );
    testUser = userRes.rows[0];

    const deptRes = await pool.query(
      `INSERT INTO departments (department_id, name, description, status) 
       VALUES ('DEP-STF-01', 'Staff Test Nursing', 'General Nursing Dept', 'Active') 
       RETURNING id`
    );
    testDept = deptRes.rows[0];
  });

  after(async () => {
    if (!pool) return;
    if (createdStaffIds.length > 0) {
      await pool.query("DELETE FROM staff WHERE id = ANY($1)", [createdStaffIds]);
    }
    if (testDept) await pool.query("DELETE FROM departments WHERE id = $1", [testDept.id]);
    if (testUser) await pool.query("DELETE FROM users WHERE id = $1", [testUser.id]);
    await closeTestDb();
  });

  test("1. staff table exists", async () => {
    if (!pool) return;
    const res = await pool.query("SELECT to_regclass('public.staff') as st");
    assert.ok(res.rows[0].st, "staff table should exist");
  });

  test("2. insertion with auto-generated staff_number works", async () => {
    if (!pool) return;
    const res = await pool.query(
      `INSERT INTO staff (first_name, last_name, designation, department_id, phone, email, created_by)
       VALUES ('Maria', 'Santos', 'Registered Nurse', $1, '5551234567', 'maria.santos@test.local', $2)
       RETURNING id, staff_number, employment_status`,
      [testDept.id, testUser.id]
    );

    assert.ok(res.rows[0].id > 0);
    assert.ok(res.rows[0].staff_number.startsWith("STF-"));
    assert.equal(res.rows[0].employment_status, "ACTIVE");
    createdStaffIds.push(res.rows[0].id);
  });

  test("3. employment_status check constraint rejects invalid status", async () => {
    if (!pool) return;
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO staff (first_name, last_name, designation, phone, employment_status)
           VALUES ('Invalid', 'Status', 'Tech', '5559998888', 'TERMINATED_INVALID')`
        );
      },
      (err) => {
        return err.code === "23514"; // check constraint violation
      }
    );
  });

  test("4. foreign key to departments is properly configured with ON DELETE SET NULL", async () => {
    if (!pool) return;
    const shortId = `D_${Date.now().toString().slice(-8)}`;
    const tempDept = await pool.query(
      `INSERT INTO departments (department_id, name, description, status) VALUES ($1, 'Temp Dept', 'Desc', 'Active') RETURNING id`,
      [shortId]
    );
    const staffMember = await pool.query(
      `INSERT INTO staff (first_name, last_name, designation, department_id, phone)
       VALUES ('Temp', 'Staff', 'Assistant', $1, '5557776666')
       RETURNING id, department_id`,
      [tempDept.rows[0].id]
    );
    createdStaffIds.push(staffMember.rows[0].id);

    // Delete temp department
    await pool.query("DELETE FROM departments WHERE id = $1", [tempDept.rows[0].id]);

    // Check that staff department_id became null
    const checkRes = await pool.query("SELECT department_id FROM staff WHERE id = $1", [staffMember.rows[0].id]);
    assert.equal(checkRes.rows[0].department_id, null);
  });
});
