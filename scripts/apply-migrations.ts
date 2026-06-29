// apply-migrations.ts — applies db/migrations/*.sql in order, once each.
//
//   npm run db:migrate        apply pending migrations
//   npm run db:seed           apply pending migrations, then run db/seed.sql
//
// Tracks applied migrations in a schema_migrations table so re-runs are safe.
// Each migration runs in its own transaction. Reads DATABASE_URL from the
// environment (.env.local locally, via dotenv).
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const migrationsDir = join(repoRoot, "db", "migrations");
const seedFile = join(repoRoot, "db", "seed.sql");

const runSeed = process.argv.includes("--seed");

function sslFor(connectionString: string): false | { rejectUnauthorized: boolean } {
  const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(connectionString);
  return isLocal ? false : { rejectUnauthorized: false };
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DATABASE_URL is not set. Add it to .env.local for local runs, or set it in the Render dashboard.",
    );
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: sslFor(connectionString) });
  await client.connect();
  try {
    await client.query(
      `create table if not exists schema_migrations (
         filename   text primary key,
         applied_at timestamptz not null default now()
       );`,
    );

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const filename of files) {
      const already = await client.query("select 1 from schema_migrations where filename = $1", [
        filename,
      ]);
      if ((already.rowCount ?? 0) > 0) {
        console.log(`=  skip    ${filename} (already applied)`);
        continue;
      }
      const sql = readFileSync(join(migrationsDir, filename), "utf8");
      console.log(`>  apply   ${filename}`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (filename) values ($1)", [filename]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }

    if (runSeed) {
      console.log(">  seed    db/seed.sql");
      await client.query(readFileSync(seedFile, "utf8"));
    }

    console.log("Done.");
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
