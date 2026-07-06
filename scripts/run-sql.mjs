// Applies a .sql file directly against the control plane's Postgres database.
// Usage: node scripts/run-sql.mjs db/migrations/000x_name.sql
import { readFile } from "node:fs/promises";
import { Client } from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql.mjs <path-to-sql-file>");
  process.exit(1);
}

const connectionString = process.env.DB_CONTROL_PLANE;
if (!connectionString) {
  console.error("Missing DB_CONTROL_PLANE env var (check .env.local)");
  process.exit(1);
}

const sql = await readFile(file, "utf8");
const client = new Client({ connectionString });
await client.connect();
try {
  await client.query(sql);
  console.log(`Applied ${file}`);
} finally {
  await client.end();
}
