import { Pool } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({ connectionString: DATABASE_URL });

async function fixAppointmentStatus() {
  const client = await pool.connect();
  
  try {
    console.log("Checking current appointment statuses...");
    const result = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM appointments 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log("Current status distribution:");
    result.rows.forEach(row => {
      console.log(`- ${row.status}: ${row.count}`);
    });
    
    // Update invalid statuses to correct Portuguese values
    console.log("\nUpdating invalid statuses...");
    
    const updates = [
      { from: 'confirmed', to: 'agendado' },
      { from: 'scheduled', to: 'agendado' },
      { from: 'attended', to: 'concluido' },
      { from: 'cancelled', to: 'cancelado' },
      { from: 'in_progress', to: 'em_atendimento' }
    ];
    
    for (const update of updates) {
      const updateResult = await client.query(
        `UPDATE appointments SET status = $1 WHERE status = $2`,
        [update.to, update.from]
      );
      
      if (updateResult.rowCount > 0) {
        console.log(`Updated ${updateResult.rowCount} appointments from '${update.from}' to '${update.to}'`);
      }
    }
    
    console.log("\nChecking updated status distribution...");
    const finalResult = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM appointments 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log("Final status distribution:");
    finalResult.rows.forEach(row => {
      console.log(`- ${row.status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error("Error fixing appointment statuses:", error);
  } finally {
    client.release();
  }
}

// Run the fix
fixAppointmentStatus().then(() => {
  console.log("Status fix completed!");
  process.exit(0);
}).catch(err => {
  console.error("Failed to fix statuses:", err);
  process.exit(1);
});