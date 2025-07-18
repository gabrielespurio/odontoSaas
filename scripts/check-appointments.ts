#!/usr/bin/env tsx

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkAppointments() {
  try {
    console.log("Checking all appointments in the database...\n");
    
    const result = await db.execute(sql`
      SELECT 
        a.id, 
        a.scheduled_date,
        a.dentist_id,
        p.name as patient_name,
        pr.name as procedure_name,
        pr.duration
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN procedures pr ON a.procedure_id = pr.id
      WHERE a.status != 'cancelado'
      ORDER BY a.scheduled_date
    `);
    
    console.log("All active appointments:");
    console.log("ID | Scheduled Date | Dentist | Patient | Procedure | Duration");
    console.log("-".repeat(80));
    
    for (const row of result.rows) {
      console.log(`${row.id} | ${row.scheduled_date} | ${row.dentist_id} | ${row.patient_name} | ${row.procedure_name} | ${row.duration} min`);
    }
    
    console.log("\n\nChecking appointments for dentist 42 on 2025-07-18:");
    
    const dentist42Result = await db.execute(sql`
      SELECT 
        a.id, 
        a.scheduled_date,
        pr.name as procedure_name,
        pr.duration
      FROM appointments a
      JOIN procedures pr ON a.procedure_id = pr.id
      WHERE a.dentist_id = 42 
        AND DATE(a.scheduled_date) = '2025-07-18'
        AND a.status != 'cancelado'
      ORDER BY a.scheduled_date
    `);
    
    console.log("\nAppointments for dentist 42 on July 18:");
    for (const row of dentist42Result.rows) {
      const startTime = new Date(row.scheduled_date);
      const endTime = new Date(startTime.getTime() + row.duration * 60000);
      console.log(`ID ${row.id}: ${row.scheduled_date} to ${endTime.toISOString()} (${row.procedure_name} - ${row.duration} min)`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkAppointments();