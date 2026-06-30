// Roda o schema.sql contra o DATABASE_URL.
// Uso: npm run db:setup
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida. Copie .env.example para .env e preencha.");
    process.exit(1);
  }

  const sql = await readFile(join(__dirname, "..", "db", "schema.sql"), "utf8");
  const client = new pg.Client({ connectionString: url });

  await client.connect();
  await client.query(sql);
  await client.end();

  console.log("Banco pronto: tabela meli_accounts criada.");
}

main().catch((err) => {
  console.error("Falha ao preparar o banco:", err.message);
  process.exit(1);
});
