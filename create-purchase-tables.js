import { neon } from '@neondatabase/serverless';

async function createPurchaseTables() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Creating purchase module tables...');
    
    // Purchase Orders table
    await sql`
      CREATE TABLE IF NOT EXISTS "purchase_orders" (
        "id" serial PRIMARY KEY NOT NULL,
        "company_id" integer NOT NULL,
        "supplier_id" integer NOT NULL,
        "order_number" text NOT NULL,
        "order_date" date NOT NULL,
        "expected_delivery_date" date,
        "status" text DEFAULT 'draft' NOT NULL,
        "total_amount" numeric(10,2) NOT NULL,
        "notes" text,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    
    // Add unique constraint for order number per company
    await sql`
      ALTER TABLE "purchase_orders" 
      ADD CONSTRAINT IF NOT EXISTS "purchase_orders_order_number_company_id_unique" 
      UNIQUE("order_number","company_id")
    `;
    
    // Purchase Order Items table
    await sql`
      CREATE TABLE IF NOT EXISTS "purchase_order_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "purchase_order_id" integer NOT NULL,
        "description" text NOT NULL,
        "quantity" numeric(10,2) NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "total_price" numeric(10,2) NOT NULL,
        "notes" text
      )
    `;
    
    // Receivings table
    await sql`
      CREATE TABLE IF NOT EXISTS "receivings" (
        "id" serial PRIMARY KEY NOT NULL,
        "company_id" integer NOT NULL,
        "purchase_order_id" integer NOT NULL,
        "supplier_id" integer NOT NULL,
        "receiving_number" text NOT NULL,
        "receiving_date" date,
        "total_amount" numeric(10,2) NOT NULL,
        "notes" text,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    
    // Add unique constraint for receiving number per company
    await sql`
      ALTER TABLE "receivings" 
      ADD CONSTRAINT IF NOT EXISTS "receivings_receiving_number_company_id_unique" 
      UNIQUE("receiving_number","company_id")
    `;
    
    // Receiving Items table
    await sql`
      CREATE TABLE IF NOT EXISTS "receiving_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "receiving_id" integer NOT NULL,
        "purchase_order_item_id" integer NOT NULL,
        "description" text NOT NULL,
        "quantity_ordered" numeric(10,2) NOT NULL,
        "quantity_received" numeric(10,2) NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "total_price" numeric(10,2) NOT NULL,
        "notes" text
      )
    `;
    
    console.log('Purchase module tables created successfully!');
  } catch (error) {
    console.error('Error creating purchase tables:', error);
    throw error;
  }
}

// Run if called directly
createPurchaseTables().catch(console.error);

export { createPurchaseTables };