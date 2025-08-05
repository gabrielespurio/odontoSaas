-- Purchase module migration
-- Add purchase order status enum
DO $$ BEGIN
    CREATE TYPE "purchase_order_status" AS ENUM('draft', 'sent', 'confirmed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add receiving status enum
DO $$ BEGIN
    CREATE TYPE "receiving_status" AS ENUM('pending', 'partial', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create suppliers table
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"cnpj" text,
	"email" text,
	"phone" text NOT NULL,
	"contact_person" text,
	"cep" text,
	"street" text,
	"number" text,
	"neighborhood" text,
	"city" text,
	"state" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_cnpj_company_id_unique" UNIQUE("cnpj","company_id")
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"order_number" text NOT NULL,
	"order_date" date NOT NULL,
	"expected_delivery_date" date,
	"status" "purchase_order_status" DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(10,2) NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_order_number_company_id_unique" UNIQUE("order_number","company_id")
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10,2) NOT NULL,
	"unit_price" numeric(10,2) NOT NULL,
	"total_price" numeric(10,2) NOT NULL,
	"notes" text
);

-- Create receivings table
CREATE TABLE IF NOT EXISTS "receivings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"receiving_number" text NOT NULL,
	"receiving_date" date,
	"status" "receiving_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(10,2) NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receivings_receiving_number_company_id_unique" UNIQUE("receiving_number","company_id")
);

-- Create receiving_items table
CREATE TABLE IF NOT EXISTS "receiving_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"receiving_id" integer NOT NULL,
	"purchase_order_item_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity_ordered" numeric(10,2) NOT NULL,
	"quantity_received" numeric(10,2) DEFAULT '0' NOT NULL,
	"unit_price" numeric(10,2) NOT NULL,
	"total_price" numeric(10,2) NOT NULL,
	"notes" text
);

-- Add foreign key constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_company_id_companies_id_fk') THEN
        ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_company_id_companies_id_fk') THEN
        ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_supplier_id_suppliers_id_fk') THEN
        ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_order_items_purchase_order_id_purchase_orders_id_fk') THEN
        ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receivings_company_id_companies_id_fk') THEN
        ALTER TABLE "receivings" ADD CONSTRAINT "receivings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receivings_purchase_order_id_purchase_orders_id_fk') THEN
        ALTER TABLE "receivings" ADD CONSTRAINT "receivings_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receivings_supplier_id_suppliers_id_fk') THEN
        ALTER TABLE "receivings" ADD CONSTRAINT "receivings_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receiving_items_receiving_id_receivings_id_fk') THEN
        ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_receiving_id_receivings_id_fk" FOREIGN KEY ("receiving_id") REFERENCES "receivings"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receiving_items_purchase_order_item_id_purchase_order_items_id_fk') THEN
        ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_purchase_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "suppliers_company_id_idx" ON "suppliers" ("company_id");
CREATE INDEX IF NOT EXISTS "suppliers_is_active_idx" ON "suppliers" ("is_active");
CREATE INDEX IF NOT EXISTS "purchase_orders_company_id_idx" ON "purchase_orders" ("company_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_supplier_id_idx" ON "purchase_orders" ("supplier_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_status_idx" ON "purchase_orders" ("status");
CREATE INDEX IF NOT EXISTS "purchase_orders_order_date_idx" ON "purchase_orders" ("order_date");
CREATE INDEX IF NOT EXISTS "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items" ("purchase_order_id");
CREATE INDEX IF NOT EXISTS "receivings_company_id_idx" ON "receivings" ("company_id");
CREATE INDEX IF NOT EXISTS "receivings_purchase_order_id_idx" ON "receivings" ("purchase_order_id");
CREATE INDEX IF NOT EXISTS "receivings_supplier_id_idx" ON "receivings" ("supplier_id");
CREATE INDEX IF NOT EXISTS "receivings_status_idx" ON "receivings" ("status");
CREATE INDEX IF NOT EXISTS "receiving_items_receiving_id_idx" ON "receiving_items" ("receiving_id");
CREATE INDEX IF NOT EXISTS "receiving_items_purchase_order_item_id_idx" ON "receiving_items" ("purchase_order_item_id");