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

    if (tablesResult.rows?.length === 0) {
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
          "responsible_name" TEXT NOT NULL DEFAULT 'Admin',
          "responsible_phone" TEXT NOT NULL DEFAULT '000',
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
          "responsible_name",
          "responsible_phone",
          "plan_type",
          "max_users",
          "max_patients",
          "is_active",
          "created_at"
        ) VALUES 
        ('Clinica Ativa', 'contato@ativa.com', '123', 'Marcos', '123', 'enterprise', 50, 5000, true, NOW() - INTERVAL '1 month'),
        ('Clinica Expirada', 'contato@expirada.com', '123', 'Ana', '123', 'basic', 5, 500, true, NOW() - INTERVAL '2 months'),
        ('Clinica Trial 1', 'trial1@test.com', '123', 'Jose', '123', 'basic', 5, 500, true, NOW()),
        ('Clinica Trial 2', 'trial2@test.com', '123', 'Maria', '123', 'basic', 5, 500, true, NOW()),
        ('Clinica Nova', 'nova@test.com', '123', 'Pedro', '123', 'basic', 5, 500, true, NOW())
      `);

      // Update dates for specific scenarios
      await db.execute(sql`
        -- Ativa (ID 1)
        UPDATE companies SET subscription_start_date = NOW() - INTERVAL '1 month' WHERE id = 1;
        -- Expirada (ID 2)
        UPDATE companies SET trial_end_date = NOW() - INTERVAL '1 day' WHERE id = 2;
        -- Trial 1 (ID 3) - Expiring soon
        UPDATE companies SET trial_end_date = NOW() + INTERVAL '3 days' WHERE id = 3;
        -- Trial 2 (ID 4)
        UPDATE companies SET trial_end_date = NOW() + INTERVAL '15 days' WHERE id = 4;
        -- Nova (ID 5)
        UPDATE companies SET trial_end_date = NOW() + INTERVAL '30 days' WHERE id = 5;
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
      // Ensure admin user always has NULL company_id (system admin)
      await db.execute(sql`
        UPDATE "users" SET "company_id" = NULL 
        WHERE ("username" = 'admin' AND "email" = 'admin@odontosync.com') 
           OR ("role" = 'admin' AND "email" = 'admin@odontosync.com')
      `);
      
      // Update other users to belong to default company if they don't have one
      await db.execute(sql`
        UPDATE "users" SET "company_id" = 1 
        WHERE "company_id" IS NULL 
          AND NOT (("username" = 'admin' AND "email" = 'admin@odontosync.com') 
                OR ("role" = 'admin' AND "email" = 'admin@odontosync.com'))
      `);
      
      console.log("Fixed admin user company_id to NULL for system admin access");
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