const { pool } = require("./backend/src/config/db");
async function list() {
  const client = await pool.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(res.rows);
  client.release();
  process.exit(0);
}
list();
