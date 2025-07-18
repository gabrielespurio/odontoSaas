#!/usr/bin/env tsx

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function fixTimezoneFinal() {
  try {
    console.log("Applying final timezone fix...");
    
    // 1. Alter the column type to store timestamp without timezone
    console.log("Altering appointments table to use timestamp without timezone...");
    await db.execute(sql`
      ALTER TABLE appointments 
      ALTER COLUMN scheduled_date TYPE timestamp without time zone
      USING scheduled_date AT TIME ZONE 'UTC'
    `);
    
    console.log("Altering consultations table to use timestamp without timezone...");
    await db.execute(sql`
      ALTER TABLE consultations 
      ALTER COLUMN date TYPE timestamp without time zone
      USING date AT TIME ZONE 'UTC'
    `);
    
    // 2. Update existing appointments to correct Brazil time
    console.log("\nUpdating existing appointments to Brazil time...");
    
    // For appointment ID 11 that shows as 17:00 UTC (should be 17:00 Brazil)
    await db.execute(sql`
      UPDATE appointments 
      SET scheduled_date = '2025-07-18 17:00:00'
      WHERE id = 11
    `);
    
    // For appointment ID 12 that shows as 15:30 UTC (should be 15:30 Brazil)
    await db.execute(sql`
      UPDATE appointments 
      SET scheduled_date = '2025-07-19 15:30:00'
      WHERE id = 12
    `);
    
    console.log("Timezone fix completed successfully!");
    
    // 3. Verify the fix
    const verifyResult = await db.execute(sql`
      SELECT id, scheduled_date
      FROM appointments
      WHERE id IN (11, 12)
      ORDER BY id
    `);
    
    console.log("\nVerified appointments:");
    for (const row of verifyResult.rows) {
      console.log(`ID: ${row.id}, Time: ${row.scheduled_date}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error fixing timezone:", error);
    process.exit(1);
  }
}

fixTimezoneFinal();