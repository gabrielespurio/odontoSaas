import { Pool, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const sql = `
      INSERT INTO users (username, password, name, email, role, is_active, data_scope, force_password_change)
      VALUES ('admin', $1, 'Administrator', 'admin@odontosync.com', 'admin', true, 'all', false)
      ON CONFLICT (username) DO UPDATE SET
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        data_scope = EXCLUDED.data_scope,
        force_password_change = EXCLUDED.force_password_change;
    `;
    
    await pool.query(sql, [hashedPassword]);
    console.log('Admin user created successfully!');
    
    // Also create a sample dentist user
    const dentistPassword = await bcrypt.hash('dentist123', 10);
    const dentistSql = `
      INSERT INTO users (username, password, name, email, role, is_active, data_scope, force_password_change)
      VALUES ('dentist1', $1, 'Dr. João Silva', 'dentist@odontosync.com', 'Dentista', true, 'all', false)
      ON CONFLICT (username) DO UPDATE SET
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        data_scope = EXCLUDED.data_scope,
        force_password_change = EXCLUDED.force_password_change;
    `;
    
    await pool.query(dentistSql, [dentistPassword]);
    console.log('Dentist user created successfully!');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();