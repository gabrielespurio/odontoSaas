import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcrypt";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  const username = "admin_vps";
  const email = "admin@vps.com";
  const password = "admin_password_123";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const query = `
      INSERT INTO users (username, password, name, email, role, "companyId", "isActive", "forcePasswordChange", "dataScope")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (username) DO UPDATE 
      SET password = $2, email = $4, "isActive" = true
      RETURNING id;
    `;
    
    const values = [username, hashedPassword, "Admin VPS", email, "Administrador", 1, true, false, "all"];
    
    const res = await pool.query(query, values);
    console.log(`Successfully created/updated admin user!`);
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${res.rows[0].id}`);
    
  } catch (err) {
    console.error("Error creating admin user:", err);
  } finally {
    await pool.end();
  }
}

createAdmin();