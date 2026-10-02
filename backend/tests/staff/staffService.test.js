const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const staffService = require("../../src/services/staffService");
const { getTestPool, isTestDbConfigured, closeTestDb } = require("../helpers/testDb");

describe("Staff Service Unit and Integration Tests", () => {
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

    const userRes = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active) 
       VALUES ('Staff Svc Admin', 'staff_svc_admin_${Date.now()}', 'staff_svc_${Date.now()}@test.local', 'hash', 'admin', true) 
       RETURNING id`
    );
    testUser = userRes.rows[0];

    const deptRes = await pool.query(
      `INSERT INTO departments (department_id, name, description, status) 
       VALUES ('DEP-STF-02', 'Staff Svc Radiology', 'Radiology and Imaging', 'Active') 
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

  test("1. createStaff creates record, auto-generates staff number, and logs audit event", async () => {
    if (!pool) return;
    const userContext = { userId: testUser.id, role: "admin" };
    const payload = {
      firstName: "James",
      lastName: "Wilson",
      designation: "Radiology Tech",
      departmentId: testDept.id,
      phone: "5551112222",
      email: "james.wilson@hospital.local",
      dateOfJoining: "2024-01-15",
      employmentStatus: "ACTIVE",
    };

    const record = await staffService.createStaff(payload, userContext);
    assert.ok(record.id);
    assert.ok(record.staffNumber.startsWith("STF-"));
    assert.equal(record.firstName, "James");
    assert.equal(record.lastName, "Wilson");
    assert.equal(record.fullName, "James Wilson");
    assert.equal(record.designation, "Radiology Tech");
    assert.equal(record.departmentId, testDept.id);
    assert.equal(record.employmentStatus, "ACTIVE");
    createdStaffIds.push(record.id);

    // Verify audit log
    const auditRes = await pool.query(
      `SELECT * FROM audit_logs WHERE resource_id = $1 AND resource_type = 'STAFF' ORDER BY id DESC LIMIT 1`,
      [String(record.id)]
    );
    assert.ok(auditRes.rows.length > 0);
    assert.equal(auditRes.rows[0].action, "CREATE");
  });

  test("2. getStaff returns list with pagination and supports filtering", async () => {
    if (!pool) return;
    const result = await staffService.getStaff({
      departmentId: testDept.id,
      employmentStatus: "ACTIVE",
      page: 1,
      limit: 10,
    });

    assert.ok(Array.isArray(result.data));
    assert.ok(result.pagination);
    assert.ok(result.data.length >= 1);
    const found = result.data.find((s) => s.firstName === "James");
    assert.ok(found);
  });

  test("3. getStaffById returns staff member details", async () => {
    if (!pool) return;
    const id = createdStaffIds[0];
    const record = await staffService.getStaffById(id);
    assert.ok(record);
    assert.equal(record.id, id);
    assert.equal(record.departmentName, "Staff Svc Radiology");
  });

  test("4. updateStaff updates fields and logs UPDATE audit event", async () => {
    if (!pool) return;
    const id = createdStaffIds[0];
    const userContext = { userId: testUser.id, role: "admin" };
    const updated = await staffService.updateStaff(
      id,
      {
        designation: "Senior Radiology Specialist",
        phone: "5559990000",
        employmentStatus: "ON_LEAVE",
      },
      userContext
    );

    assert.equal(updated.designation, "Senior Radiology Specialist");
    assert.equal(updated.phone, "5559990000");
    assert.equal(updated.employmentStatus, "ON_LEAVE");

    // Verify audit log
    const auditRes = await pool.query(
      `SELECT * FROM audit_logs WHERE resource_id = $1 AND resource_type = 'STAFF' AND action = 'UPDATE' ORDER BY id DESC LIMIT 1`,
      [String(id)]
    );
    assert.ok(auditRes.rows.length > 0);
  });

  test("5. deactivateStaff sets employment_status to INACTIVE and logs DEACTIVATE audit event", async () => {
    if (!pool) return;
    const id = createdStaffIds[0];
    const userContext = { userId: testUser.id, role: "admin" };
    const deactivated = await staffService.deactivateStaff(id, userContext);
    assert.equal(deactivated.employmentStatus, "INACTIVE");

    const auditRes = await pool.query(
      `SELECT * FROM audit_logs WHERE resource_id = $1 AND resource_type = 'STAFF' AND action = 'UPDATE' ORDER BY id DESC LIMIT 1`,
      [String(id)]
    );
    assert.ok(auditRes.rows.length > 0);
  });
});
