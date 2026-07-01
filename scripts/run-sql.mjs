// Applies a .sql file directly against Supabase Postgres via POSTGRES_URL_NON_POOLING.
// Usage: node scripts/run-sql.mjs supabase/migrations/000x_name.sql
import { readFile } from "node:fs/promises";
import { Client } from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql.mjs <path-to-sql-file>");
  process.exit(1);
}

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING;
if (!rawConnectionString) {
  console.error("Missing POSTGRES_URL_NON_POOLING env var (yarn vercel env pull or check .env.local)");
  process.exit(1);
}
// Strip sslmode from the URL so it doesn't override the explicit `ssl` option below.
const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]+/, "");

const sql = await readFile(file, "utf8");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log(`Applied ${file}`);
} finally {
  await client.end();
}
