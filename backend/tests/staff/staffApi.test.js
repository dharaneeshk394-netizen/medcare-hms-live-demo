const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const { getTestPool, isTestDbConfigured, closeTestDb, closeAppDb } = require("../helpers/testDb");
const { loginTestUser, createTestUser, deleteTestUsersByPrefix } = require("../helpers/authHelper");

describe("Staff API & RBAC Integration Tests", () => {
  const TEST_PREFIX = "test_stf_api_";
  let pool;

  let adminUser = null;
  let adminCookie = null;
  let adminCsrf = null;

  let doctorUser = null;
  let doctorCookie = null;
  let doctorCsrf = null;

  let receptionistUser = null;
  let receptionistCookie = null;
  let receptionistCsrf = null;

  let testDept = null;
  const createdStaffIds = [];
  const testPassword = "Password123!";

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

    await deleteTestUsersByPrefix(TEST_PREFIX);

    // Create Admin user
    adminUser = await createTestUser({
      fullName: "Staff API Admin",
      username: `${TEST_PREFIX}admin_${Date.now()}`,
      email: `${TEST_PREFIX}admin_${Date.now()}@test.local`,
      password: testPassword,
      role: "admin",
      isActive: true,
    });
    const adminLogin = await loginTestUser(adminUser.username, testPassword);
    adminCookie = adminLogin.cookie;
    adminCsrf = adminLogin.csrfToken;

    // Create Doctor user
    doctorUser = await createTestUser({
      fullName: "Staff API Doctor",
      username: `${TEST_PREFIX}doc_${Date.now()}`,
      email: `${TEST_PREFIX}doc_${Date.now()}@test.local`,
      password: testPassword,
      role: "doctor",
      isActive: true,
    });
    const docLogin = await loginTestUser(doctorUser.username, testPassword);
    doctorCookie = docLogin.cookie;
    doctorCsrf = docLogin.csrfToken;

    // Create Receptionist user
    receptionistUser = await createTestUser({
      fullName: "Staff API Receptionist",
      username: `${TEST_PREFIX}rec_${Date.now()}`,
      email: `${TEST_PREFIX}rec_${Date.now()}@test.local`,
      password: testPassword,
      role: "receptionist",
      isActive: true,
    });
    const recLogin = await loginTestUser(receptionistUser.username, testPassword);
    receptionistCookie = recLogin.cookie;
    receptionistCsrf = recLogin.csrfToken;

    // Create Test Department
    const deptRes = await pool.query(
      `INSERT INTO departments (department_id, name, description, status) 
       VALUES ('DEP-STF-03', 'Staff API Lab', 'Clinical Pathology & Lab', 'Active') 
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
    await deleteTestUsersByPrefix(TEST_PREFIX);
    await closeTestDb();
    await closeAppDb();
  });

  test("1. GET /api/v1/staff without auth returns 401", async () => {
    if (!pool) return;
    const res = await request(app).get("/api/v1/staff");
    assert.equal(res.status, 401);
  });

  test("2. POST /api/v1/staff as receptionist returns 403 Forbidden", async () => {
    if (!pool) return;
    const res = await request(app)
      .post("/api/v1/staff")
      .set("Cookie", receptionistCookie)
      .set("X-CSRF-Token", receptionistCsrf)
      .send({
        firstName: "Lucy",
        lastName: "Heart",
        designation: "Nurse",
        phone: "5552223333",
      });

    assert.equal(res.status, 403);
  });

  test("3. POST /api/v1/staff as doctor returns 403 Forbidden", async () => {
    if (!pool) return;
    const res = await request(app)
      .post("/api/v1/staff")
      .set("Cookie", doctorCookie)
      .set("X-CSRF-Token", doctorCsrf)
      .send({
        firstName: "Lucy",
        lastName: "Heart",
        designation: "Nurse",
        phone: "5552223333",
      });

    assert.equal(res.status, 403);
  });

  test("4. POST /api/v1/staff with invalid phone returns 400 Bad Request", async () => {
    if (!pool) return;
    const res = await request(app)
      .post("/api/v1/staff")
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({
        firstName: "Lucy",
        lastName: "Heart",
        designation: "Nurse",
        phone: "123", // invalid phone
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test("5. POST /api/v1/staff as admin creates staff member (201 Created)", async () => {
    if (!pool) return;
    const res = await request(app)
      .post("/api/v1/staff")
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({
        firstName: "Elena",
        lastName: "Rostova",
        designation: "Medical Laboratory Technologist",
        departmentId: testDept.id,
        phone: "5554445555",
        email: "elena.rostova@hospital.local",
        dateOfJoining: "2024-03-01",
        employmentStatus: "ACTIVE",
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.staffNumber.startsWith("STF-"));
    createdStaffIds.push(res.body.data.id);
  });

  test("6. GET /api/v1/staff as doctor succeeds (200 OK)", async () => {
    if (!pool) return;
    const res = await request(app)
      .get("/api/v1/staff")
      .set("Cookie", doctorCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  test("7. GET /api/v1/staff/:id returns details (200 OK)", async () => {
    if (!pool) return;
    const id = createdStaffIds[0];
    const res = await request(app)
      .get(`/api/v1/staff/${id}`)
      .set("Cookie", receptionistCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, id);
    assert.equal(res.body.data.departmentName, "Staff API Lab");
  });

  test("8. PUT /api/v1/staff/:id as admin updates staff member (200 OK)", async () => {
    if (!pool) return;
    const id = createdStaffIds[0];
    const res = await request(app)
      .put(`/api/v1/staff/${id}`)
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf)
      .send({
        designation: "Lead Laboratory Technologist",
        phone: "5558889999",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.designation, "Lead Laboratory Technologist");
  });

  test("9. PATCH /api/v1/staff/:id/deactivate as admin deactivates staff (200 OK)", async () => {
    if (!pool) return;
    const id = createdStaffIds[0];
    const res = await request(app)
      .patch(`/api/v1/staff/${id}/deactivate`)
      .set("Cookie", adminCookie)
      .set("X-CSRF-Token", adminCsrf);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.employmentStatus, "INACTIVE");
  });
});
