import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    console.log('Connected to database');

    const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', '0008_purchase_module.sql'), 'utf-8');
    
    // Split the SQL into individual statements and execute them
    const statements = migrationSQL.split(';').filter(statement => statement.trim().length > 0);
    
    for (const statement of statements) {
      await sql(statement.trim());
    }
    
    console.log('Purchase module migration applied successfully');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

applyMigration();