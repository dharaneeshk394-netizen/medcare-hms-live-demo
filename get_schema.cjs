const { pool } = require("./backend/src/config/db");
async function list() {
  const client = await pool.connect();
  const res = await client.query(`
    SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'invoices' OR table_name = 'users';
  `);
  console.log(res.rows);
  client.release();
  process.exit(0);
}
list();
