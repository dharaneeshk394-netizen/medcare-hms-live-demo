const { pool } = require("../config/db");

// Get all departments
async function getAllDepartments() {
  const result = await pool.query(`
    SELECT
      id,
      department_id AS "departmentId",
      name,
      description,
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM departments
    ORDER BY id ASC
  `);

  return result.rows;
}

// Get one department by ID
async function getDepartmentById(id) {
  const result = await pool.query(
    `
      SELECT
        id,
        department_id AS "departmentId",
        name,
        description,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM departments
      WHERE id = $1
    `,
    [Number(id)]
  );

  return result.rows[0] || null;
}

// Create department
async function createDepartment(departmentData) {
  const {
    name,
    description,
    status = "Active",
  } = departmentData;

  const result = await pool.query(
    `
      INSERT INTO departments (
        department_id,
        name,
        description,
        status
      )
      VALUES (
        'TEMP',
        $1,
        $2,
        $3
      )
      RETURNING id
    `,
    [
      name,
      description || null,
      status,
    ]
  );

  const department = result.rows[0];

  const departmentId = `DEP${String(
    department.id
  ).padStart(3, "0")}`;

  const updatedResult = await pool.query(
    `
      UPDATE departments
      SET
        department_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        department_id AS "departmentId",
        name,
        description,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [departmentId, department.id]
  );

  return updatedResult.rows[0];
}

// Update department
async function updateDepartment(id, departmentData) {
  const {
    name,
    description,
    status,
  } = departmentData;

  const result = await pool.query(
    `
      UPDATE departments
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING
        id,
        department_id AS "departmentId",
        name,
        description,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      name ?? null,
      description ?? null,
      status ?? null,
      Number(id),
    ]
  );

  return result.rows[0] || null;
}

// Delete department
async function deleteDepartment(id) {
  const result = await pool.query(
    `
      DELETE FROM departments
      WHERE id = $1
      RETURNING
        id,
        department_id AS "departmentId",
        name,
        description,
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [Number(id)]
  );

  return result.rows[0] || null;
}

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};