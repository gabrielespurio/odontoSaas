import { Pool } from '@neondatabase/serverless';
import ws from "ws";

const DATABASE_URL = "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const createTablesSQL = `
-- Create receivables table
CREATE TABLE IF NOT EXISTS "receivables" (
  "id" serial PRIMARY KEY NOT NULL,
  "patient_id" integer NOT NULL,
  "consultation_id" integer,
  "appointment_id" integer,
  "amount" numeric(10,2) NOT NULL,
  "due_date" date NOT NULL,
  "payment_date" date,
  "payment_method" varchar(50),
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "description" text,
  "installments" integer DEFAULT 1 NOT NULL,
  "installment_number" integer DEFAULT 1 NOT NULL,
  "parent_receivable_id" integer,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "receivables_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "receivables_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "receivables_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "receivables_parent_receivable_id_receivables_id_fk" FOREIGN KEY ("parent_receivable_id") REFERENCES "receivables"("id") ON DELETE no action ON UPDATE no action
);

-- Create payables table
CREATE TABLE IF NOT EXISTS "payables" (
  "id" serial PRIMARY KEY NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "due_date" date NOT NULL,
  "payment_date" date,
  "payment_method" varchar(50),
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "description" text NOT NULL,
  "category" varchar(100) NOT NULL,
  "supplier" varchar(255),
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create cash_flow table
CREATE TABLE IF NOT EXISTS "cash_flow" (
  "id" serial PRIMARY KEY NOT NULL,
  "type" varchar(20) NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "description" text NOT NULL,
  "date" date NOT NULL,
  "category" varchar(100),
  "receivable_id" integer,
  "payable_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "cash_flow_receivable_id_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "receivables"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "cash_flow_payable_id_payables_id_fk" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE no action ON UPDATE no action
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "receivables_patient_id_idx" ON "receivables" ("patient_id");
CREATE INDEX IF NOT EXISTS "receivables_consultation_id_idx" ON "receivables" ("consultation_id");
CREATE INDEX IF NOT EXISTS "receivables_appointment_id_idx" ON "receivables" ("appointment_id");
CREATE INDEX IF NOT EXISTS "receivables_status_idx" ON "receivables" ("status");
CREATE INDEX IF NOT EXISTS "receivables_due_date_idx" ON "receivables" ("due_date");

CREATE INDEX IF NOT EXISTS "payables_status_idx" ON "payables" ("status");
CREATE INDEX IF NOT EXISTS "payables_due_date_idx" ON "payables" ("due_date");
CREATE INDEX IF NOT EXISTS "payables_category_idx" ON "payables" ("category");

CREATE INDEX IF NOT EXISTS "cash_flow_type_idx" ON "cash_flow" ("type");
CREATE INDEX IF NOT EXISTS "cash_flow_date_idx" ON "cash_flow" ("date");
CREATE INDEX IF NOT EXISTS "cash_flow_receivable_id_idx" ON "cash_flow" ("receivable_id");
CREATE INDEX IF NOT EXISTS "cash_flow_payable_id_idx" ON "cash_flow" ("payable_id");
`;

async function createTables() {
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    webSocketConstructor: ws
  });
  
  try {
    console.log('Conectando ao banco de dados...');
    await pool.query(createTablesSQL);
    console.log('Tabelas financeiras criadas com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('receivables', 'payables', 'cash_flow')
      ORDER BY table_name;
    `);
    
    console.log('Tabelas encontradas:', result.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  } finally {
    await pool.end();
  }
}

createTables();