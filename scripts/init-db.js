import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;

async function createAdminUser() {
  const pool = new Pool({ connectionString: "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" });
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Insert admin user
    await pool.query(`
      INSERT INTO users (username, name, email, role, password) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (username) DO NOTHING
    `, ['admin', 'Administrator', 'admin@dental.com', 'admin', hashedPassword]);
    
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

async function createSampleData() {
  const pool = new Pool({ connectionString: "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" });
  
  try {
    // Create procedure categories
    const categoryResult = await pool.query(`
      SELECT COUNT(*) FROM procedure_categories
    `);
    
    if (parseInt(categoryResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO procedure_categories (name, description) 
        VALUES 
          ('Preventive', 'Preventive dental procedures'),
          ('Restorative', 'Restorative dental procedures'),
          ('Cosmetic', 'Cosmetic dental procedures')
      `);
    }
    
    // Create procedures
    const procedureResult = await pool.query(`
      SELECT COUNT(*) FROM procedures
    `);
    
    if (parseInt(procedureResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO procedures (name, description, duration, price, category) 
        VALUES 
          ('Cleaning', 'Professional teeth cleaning', 30, 100.00, 'Preventive'),
          ('Filling', 'Dental filling', 60, 150.00, 'Restorative'),
          ('Whitening', 'Teeth whitening', 90, 300.00, 'Cosmetic'),
          ('Root Canal', 'Root canal treatment', 120, 500.00, 'Restorative'),
          ('Crown', 'Dental crown', 90, 800.00, 'Restorative')
      `);
    }
    
    // Create sample patients
    const patientResult = await pool.query(`
      SELECT COUNT(*) FROM patients
    `);
    
    if (parseInt(patientResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO patients (name, cpf, email, phone, birth_date, address) 
        VALUES 
          ('João Silva', '12345678901', 'joao@email.com', '(11) 99999-9999', '1990-01-01', 'Rua A, 123, São Paulo, SP, 01234-567'),
          ('Maria Santos', '12345678902', 'maria@email.com', '(11) 88888-8888', '1985-05-15', 'Rua B, 456, São Paulo, SP, 01234-568'),
          ('Pedro Oliveira', '12345678903', 'pedro@email.com', '(11) 77777-7777', '1992-12-10', 'Rua C, 789, São Paulo, SP, 01234-569')
      `);
    }
    
    console.log('Sample data created successfully');
  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    await pool.end();
  }
}

async function init() {
  await createAdminUser();
  await createSampleData();
  console.log('Database initialization completed');
}

init();