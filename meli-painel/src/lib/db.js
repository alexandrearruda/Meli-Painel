import { Pool } from "pg";

// Singleton do pool. Em dev o Next recarrega módulos com frequência,
// então guardamos no globalThis pra não abrir conexão demais.
const globalForPg = globalThis;

export const pool =
  globalForPg._meliPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (!globalForPg._meliPool) {
  globalForPg._meliPool = pool;
}

export function query(text, params) {
  return pool.query(text, params);
}
