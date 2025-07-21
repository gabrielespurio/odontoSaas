-- Add companies table for SaaS multi-tenancy
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
);

-- Add company_id to users table
ALTER TABLE "users" ADD COLUMN "company_id" INTEGER REFERENCES "companies"("id");

-- Add company_id to patients table  
ALTER TABLE "patients" ADD COLUMN "company_id" INTEGER NOT NULL DEFAULT 1;

-- Add foreign key constraint for patients.company_id
ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id");

-- Insert default company for existing data
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
);

-- Update existing users to have null company_id (system admin) or company_id = 1
UPDATE "users" SET "company_id" = NULL WHERE "username" = 'admin' AND "email" = 'admin@odontosync.com';
UPDATE "users" SET "company_id" = 1 WHERE "company_id" IS NULL AND NOT ("username" = 'admin' AND "email" = 'admin@odontosync.com');

-- Create system admin user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "users" WHERE "username" = 'admin' AND "email" = 'admin@odontosync.com') THEN
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
        );
    END IF;
END
$$;

-- Update all existing patients to belong to the default company
UPDATE "patients" SET "company_id" = 1 WHERE "company_id" IS NULL;