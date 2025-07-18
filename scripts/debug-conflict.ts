#!/usr/bin/env tsx

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function debugConflict() {
  try {
    console.log("Debugging appointment conflicts for 12:00...\n");
    
    // Check what appointments exist for dentist 42 on July 18
    const result = await db.execute(sql`
      SELECT 
        a.id, 
        a.scheduled_date::text as scheduled_date_text,
        p.name as procedure_name,
        p.duration
      FROM appointments a
      JOIN procedures p ON a.procedure_id = p.id
      WHERE a.dentist_id = 42 
        AND DATE(a.scheduled_date) = '2025-07-18'
        AND a.status != 'cancelado'
      ORDER BY a.scheduled_date
    `);
    
    console.log("Existing appointments for dentist 42 on July 18:");
    for (const row of result.rows) {
      const start = row.scheduled_date_text;
      const [datePart, timePart] = start.split(' ');
      const [hour, minute] = timePart.split(':').map(Number);
      
      // Calculate end time
      const endHour = Math.floor((hour * 60 + minute + row.duration) / 60);
      const endMinute = (hour * 60 + minute + row.duration) % 60;
      
      console.log(`ID ${row.id}: ${hour}:${String(minute).padStart(2, '0')} to ${endHour}:${String(endMinute).padStart(2, '0')} (${row.procedure_name} - ${row.duration} min)`);
    }
    
    console.log("\nChecking if 12:00 conflicts with any existing appointment:");
    const newStart = 12 * 60; // 12:00 in minutes
    const newEnd = newStart + 90; // 90 minutes for Clareamento
    
    for (const row of result.rows) {
      const [datePart, timePart] = row.scheduled_date_text.split(' ');
      const [hour, minute] = timePart.split(':').map(Number);
      const existingStart = hour * 60 + minute;
      const existingEnd = existingStart + row.duration;
      
      // Check overlap
      const hasOverlap = (newStart < existingEnd && newEnd > existingStart);
      
      if (hasOverlap) {
        console.log(`CONFLICT with ID ${row.id}: ${hour}:${String(minute).padStart(2, '0')} to ${Math.floor(existingEnd/60)}:${String(existingEnd%60).padStart(2, '0')}`);
      } else {
        console.log(`No conflict with ID ${row.id}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debugConflict();