import { db } from "../db";
import { sql } from "drizzle-orm";

export async function runSaasMigration() {
  try {
    console.log("Running SaaS migration...");

    // Check if companies table exists
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'companies'
    `);

    if (tablesResult.length === 0) {
      console.log("Creating companies table...");
      
      // Create companies table
      await db.execute(sql`
        CREATE TABLE "companies" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "trade_name" TEXT,
          "cnpj" TEXT UNIQUE,
          "email" TEXT NOT NULL,
          "phone" TEXT NOT NULL,
          "cep" TEXT,
          "street" TEXT,
          "number" TEXT,
          "neighborhood" TEXT,
          "city" TEXT,
          "state" TEXT,
          "plan_type" TEXT NOT NULL DEFAULT 'basic',
          "max_users" INTEGER NOT NULL DEFAULT 5,
          "max_patients" INTEGER NOT NULL DEFAULT 500,
          "is_active" BOOLEAN NOT NULL DEFAULT true,
          "trial_end_date" DATE,
          "subscription_start_date" DATE,
          "subscription_end_date" DATE,
          "created_at" TIMESTAMP DEFAULT now() NOT NULL,
          "updated_at" TIMESTAMP DEFAULT now() NOT NULL
        )
      `);

      // Insert default company
      await db.execute(sql`
        INSERT INTO "companies" (
          "name", 
          "email", 
          "phone", 
          "plan_type",
          "max_users",
          "max_patients",
          "is_active"
        ) VALUES (
          'OdontoSync Clinic', 
          'admin@odontosync.com', 
          '(11) 99999-9999', 
          'enterprise',
          50,
          5000,
          true
        )
      `);
    }

    // Check if company_id column exists in users table
    const userColumnsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'company_id'
    `);

    if (userColumnsResult.length === 0) {
      console.log("Adding company_id to users table...");
      await db.execute(sql`
        ALTER TABLE "users" ADD COLUMN "company_id" INTEGER REFERENCES "companies"("id")
      `);
    }

    // Check if company_id column exists in patients table
    const patientColumnsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients' AND column_name = 'company_id'
    `);

    if (patientColumnsResult.length === 0) {
      console.log("Adding company_id to patients table...");
      await db.execute(sql`
        ALTER TABLE "patients" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1
      `);
      await db.execute(sql`
        ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_company" 
        FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      `);
    }

    // Create system admin user if it doesn't exist
    const adminExists = await db.execute(sql`
      SELECT 1 FROM "users" WHERE "username" = 'admin' AND "email" = 'admin@odontosync.com'
    `);

    if (adminExists.length === 0) {
      console.log("Creating system admin user...");
      await db.execute(sql`
        INSERT INTO "users" (
          "username", 
          "password", 
          "name", 
          "email", 
          "role", 
          "company_id",
          "is_active",
          "data_scope"
        ) VALUES (
          'admin',
          '$2b$10$8K1p/a8pY7q1o5QHF5o7KeGmZKx2Qx8rFBGc0o7UL8b6NhFpN7HmW', -- admin123
          'System Administrator',
          'admin@odontosync.com',
          'admin',
          NULL,
          true,
          'all'
        )
      `);
    }

    // Check if users have any company_id and update them
    const hasUsersCompanyId = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'company_id'
    `);
    
    if (hasUsersCompanyId.length > 0) {
      // Update existing users
      await db.execute(sql`
        UPDATE "users" SET "company_id" = NULL 
        WHERE "username" = 'admin' AND "email" = 'admin@odontosync.com'
      `);
      
      await db.execute(sql`
        UPDATE "users" SET "company_id" = 1 
        WHERE "company_id" IS NULL AND NOT ("username" = 'admin' AND "email" = 'admin@odontosync.com')
      `);
    }

    // Check if patients have company_id and update them
    const hasPatientsCompanyId = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients' AND column_name = 'company_id'
    `);
    
    if (hasPatientsCompanyId.length > 0) {
      // Update all existing patients to belong to the default company
      await db.execute(sql`UPDATE "patients" SET "company_id" = 1`);
    }

    console.log("SaaS migration completed successfully!");
    return true;
  } catch (error) {
    console.error("SaaS migration failed:", error);
    return false;
  }
}