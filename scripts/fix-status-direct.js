import { db } from '../server/db.js';
import { appointments } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixStatusValues() {
  console.log("Starting status fix...");
  
  try {
    // Map of old status values to new ones
    const statusMap = {
      'confirmed': 'agendado',
      'scheduled': 'agendado', 
      'attended': 'concluido',
      'cancelled': 'cancelado',
      'in_progress': 'em_atendimento'
    };
    
    // Get all appointments with old status values
    const allAppointments = await db.select().from(appointments);
    
    console.log("Found", allAppointments.length, "appointments");
    
    let updatedCount = 0;
    
    for (const appointment of allAppointments) {
      if (statusMap[appointment.status]) {
        console.log(`Updating appointment ${appointment.id} from '${appointment.status}' to '${statusMap[appointment.status]}'`);
        
        await db.update(appointments)
          .set({ status: statusMap[appointment.status] })
          .where(eq(appointments.id, appointment.id));
        
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} appointments`);
    
    // Check final status distribution
    const finalAppointments = await db.select().from(appointments);
    const statusCounts = {};
    
    finalAppointments.forEach(apt => {
      statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
    });
    
    console.log("Final status distribution:");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`- ${status}: ${count}`);
    });
    
  } catch (error) {
    console.error("Error fixing statuses:", error);
  }
}

fixStatusValues().then(() => {
  console.log("Status fix completed!");
  process.exit(0);
}).catch(err => {
  console.error("Failed to fix statuses:", err);
  process.exit(1);
});