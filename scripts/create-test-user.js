import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;

async function createTestUser() {
  const pool = new Pool({ 
    connectionString: "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" 
  });
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // Create admin user first
    const adminHashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (username, name, email, role, password, data_scope, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      ON CONFLICT (username) DO UPDATE SET
        password = $5,
        data_scope = $6,
        is_active = $7
    `, ['admin', 'Administrator', 'admin@dental.com', 'admin', adminHashedPassword, 'all', true]);
    
    // Create dentist user with "own" scope
    await pool.query(`
      INSERT INTO users (username, name, email, role, password, data_scope, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      ON CONFLICT (username) DO UPDATE SET
        password = $5,
        data_scope = $6,
        is_active = $7
    `, ['dentista1', 'Dentista Teste 1', 'dentista1@teste.com', 'Dentista', hashedPassword, 'own', true]);
    
    // Create another dentist user with "all" scope
    await pool.query(`
      INSERT INTO users (username, name, email, role, password, data_scope, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      ON CONFLICT (username) DO UPDATE SET
        password = $5,
        data_scope = $6,
        is_active = $7
    `, ['dentista2', 'Dentista Teste 2', 'dentista2@teste.com', 'Dentista', hashedPassword, 'all', true]);
    
    // Create some appointments for testing
    await pool.query(`
      INSERT INTO appointments (patient_id, dentist_id, procedure_id, scheduled_date, status, notes) 
      VALUES 
        (1, (SELECT id FROM users WHERE username = 'dentista1'), 1, '2025-07-15 10:00:00', 'agendado', 'Agendamento do dentista 1'),
        (2, (SELECT id FROM users WHERE username = 'dentista2'), 2, '2025-07-15 14:00:00', 'agendado', 'Agendamento do dentista 2')
      ON CONFLICT DO NOTHING
    `);
    
    console.log('Test users created successfully');
    console.log('- admin@dental.com (password: admin123) - scope: all');
    console.log('- dentista1@teste.com (password: 123456) - scope: own');
    console.log('- dentista2@teste.com (password: 123456) - scope: all');
    
    // Show current users
    const result = await pool.query(`
      SELECT id, username, name, email, role, data_scope, is_active 
      FROM users 
      ORDER BY id
    `);
    
    console.log('\nCurrent users in database:');
    result.rows.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - ${user.role} - scope: ${user.data_scope}`);
    });
    
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();