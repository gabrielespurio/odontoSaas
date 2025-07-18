#!/usr/bin/env tsx

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkRawData() {
  try {
    console.log("Checking raw appointment data...\n");
    
    // Query appointments with raw timestamp as text
    const result = await db.execute(sql`
      SELECT 
        id, 
        scheduled_date::text as scheduled_date_text,
        scheduled_date as scheduled_date_raw
      FROM appointments 
      WHERE id = 14
    `);
    
    console.log("Raw data from database:");
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Also check what timezone the database is using
    const tzResult = await db.execute(sql`SHOW timezone`);
    console.log("\nDatabase timezone:", tzResult.rows[0]);
    
    // Check current time in database
    const nowResult = await db.execute(sql`
      SELECT 
        NOW()::text as now_text,
        NOW() AT TIME ZONE 'America/Sao_Paulo' as brazil_now
    `);
    console.log("\nCurrent database time:", nowResult.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkRawData();