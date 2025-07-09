-- Create enums
CREATE TYPE IF NOT EXISTS "user_role" AS ENUM('admin', 'dentist', 'reception');
CREATE TYPE IF NOT EXISTS "appointment_status" AS ENUM('scheduled', 'confirmed', 'attended', 'cancelled');
CREATE TYPE IF NOT EXISTS "payment_status" AS ENUM('pending', 'paid', 'overdue');
CREATE TYPE IF NOT EXISTS "tooth_condition" AS ENUM('healthy', 'carie', 'restoration', 'extraction', 'planned_treatment', 'completed_treatment');

-- Create procedure_categories table
CREATE TABLE IF NOT EXISTS "procedure_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "procedure_categories_name_unique" UNIQUE("name")
);

-- Create anamnese table
CREATE TABLE IF NOT EXISTS "anamnese" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"chief_complaint" text,
	"medical_history" text,
	"medications" text,
	"allergies" text,
	"dental_history" text,
	"habits" text,
	"family_history" text,
	"observations" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"dentist_id" integer NOT NULL,
	"procedure_id" integer NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create consultations table
CREATE TABLE IF NOT EXISTS "consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"dentist_id" integer NOT NULL,
	"appointment_id" integer,
	"date" timestamp NOT NULL,
	"procedures" text[],
	"clinical_notes" text,
	"observations" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create dental_chart table
CREATE TABLE IF NOT EXISTS "dental_chart" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"tooth_number" text NOT NULL,
	"condition" "tooth_condition" NOT NULL,
	"notes" text,
	"treatment_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create financial table
CREATE TABLE IF NOT EXISTS "financial" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"appointment_id" integer,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" text,
	"payment_date" timestamp,
	"due_date" timestamp,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create patients table
CREATE TABLE IF NOT EXISTS "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cpf" text NOT NULL,
	"birth_date" date NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"clinical_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_cpf_unique" UNIQUE("cpf")
);

-- Create procedures table
CREATE TABLE IF NOT EXISTS "procedures" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"duration" integer NOT NULL,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'dentist' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);