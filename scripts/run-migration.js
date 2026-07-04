import { readFileSync } from 'fs';
import pg from 'pg';
import dns from 'dns';
import 'dotenv/config';

const { Pool } = pg;

async function resolveHost(host) {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
  try {
    const addrs = await resolver.resolve4(host);
    return addrs[0];
  } catch {
    const addrs = await resolver.resolve6(host);
    return addrs[0];
  }
}

const dbHost = process.env.DB_HOST || 'db.ijfwdtemkkoiombxtyip.supabase.co';
const dbPort = parseInt(process.env.DB_PORT || '5432');
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'Asdfghjkl123';
const dbName = process.env.DB_NAME || 'postgres';

const pool = new Pool({
  host: await resolveHost(dbHost),
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  ssl: { rejectUnauthorized: false },
});

const migrationFile = process.argv[2] || '001_create_tables.sql';
const sql = readFileSync(
  new URL(`../supabase/migrations/${migrationFile}`, import.meta.url),
  'utf-8'
);

async function runMigration() {
  console.log('Executando migration...');

  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const client = await pool.connect();
  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      console.log(`  [${i + 1}/${statements.length}] Executando...`);
      await client.query(stmt);
    }
    console.log('Migration concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migration:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
