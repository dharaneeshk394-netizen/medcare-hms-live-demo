const { pool } = require("./backend/src/config/db");
async function run() {
  const client = await pool.connect();
  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname IN ('invoices', 'invoice_items', 'audit_logs') AND n.nspname = 'public';
  `);
  console.log(res.rows);
  client.release();
  process.exit(0);
}
run();
