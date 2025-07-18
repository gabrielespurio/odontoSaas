#!/usr/bin/env tsx

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function fixTimezoneIssues() {
  try {
    console.log("Fixing timezone issues in the database...");
    
    // 1. First, let's check current appointments
    const checkResult = await db.execute(sql`
      SELECT id, scheduled_date, scheduled_date AT TIME ZONE 'America/Sao_Paulo' as brazil_time
      FROM appointments
      ORDER BY id
    `);
    
    console.log("\nCurrent appointments:");
    for (const row of checkResult.rows) {
      console.log(`ID: ${row.id}, UTC: ${row.scheduled_date}, Brazil: ${row.brazil_time}`);
    }
    
    // 2. Update all appointment times to be stored as Brazil timezone
    // This converts existing UTC times to Brazil time
    const updateResult = await db.execute(sql`
      UPDATE appointments 
      SET scheduled_date = scheduled_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'
    `);
    
    console.log(`\nUpdated ${updateResult.rowCount} appointments to Brazil timezone`);
    
    // 3. Do the same for consultations
    const consultUpdateResult = await db.execute(sql`
      UPDATE consultations 
      SET date = date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'
    `);
    
    console.log(`Updated ${consultUpdateResult.rowCount} consultations to Brazil timezone`);
    
    // 4. Verify the fix
    const verifyResult = await db.execute(sql`
      SELECT id, scheduled_date
      FROM appointments
      ORDER BY id
    `);
    
    console.log("\nVerified appointments after fix:");
    for (const row of verifyResult.rows) {
      console.log(`ID: ${row.id}, Time: ${row.scheduled_date}`);
    }
    
    console.log("\nTimezone fix completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing timezone:", error);
    process.exit(1);
  }
}

fixTimezoneIssues();