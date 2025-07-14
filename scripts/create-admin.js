import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;

async function createAdmin() {
  const pool = new Pool({ 
    connectionString: "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" 
  });
  
  try {
    // Check tables
    const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log('Available tables:', tables.rows.map(r => r.table_name));
    
    // Check current users
    const existingUsers = await pool.query('SELECT id, username, name, role FROM users');
    console.log('Existing users:', existingUsers.rows);
    
    // Delete existing admin if exists
    await pool.query('DELETE FROM users WHERE username = $1', ['admin']);
    
    // Create new admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const result = await pool.query(`
      INSERT INTO users (username, name, email, role, password, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, username, name, role
    `, ['admin', 'Administrator', 'admin@dental.com', 'admin', hashedPassword, true]);
    
    console.log('✅ Admin user created successfully:', result.rows[0]);
    
    // Verify the creation
    const verifyUser = await pool.query('SELECT id, username, name, email, role, is_active FROM users WHERE username = $1', ['admin']);
    console.log('✅ Verification - Admin user exists:', verifyUser.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();