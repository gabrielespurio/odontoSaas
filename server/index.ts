import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeScheduler } from "./scheduler";
import { runSaasMigration } from "./migrations/saas-migration";
import { db } from "./db";
import { sql, eq, or } from "drizzle-orm";
import { purchaseOrders, purchaseOrderItems, receivings, receivingItems } from "../shared/schema";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware para produção
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Apply database migrations
  try {
    await db.execute(sql`ALTER TABLE payables ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'clinic'`);
    await db.execute(sql`ALTER TABLE payables ADD COLUMN IF NOT EXISTS dentist_id INTEGER`);
    await db.execute(sql`ALTER TABLE payables ADD COLUMN IF NOT EXISTS created_by INTEGER`);
    
    // Remove campos de produto que não são mais necessários
    await db.execute(sql`ALTER TABLE products DROP COLUMN IF EXISTS unit_price`);
    await db.execute(sql`ALTER TABLE products DROP COLUMN IF EXISTS cost_price`);
    await db.execute(sql`ALTER TABLE products DROP COLUMN IF EXISTS supplier`);
    
    // Update stock_movements table structure
    await db.execute(sql`ALTER TABLE stock_movements DROP COLUMN IF EXISTS type`);
    await db.execute(sql`ALTER TABLE stock_movements DROP COLUMN IF EXISTS total_price`);
    await db.execute(sql`ALTER TABLE stock_movements DROP COLUMN IF EXISTS description`);
    await db.execute(sql`ALTER TABLE stock_movements DROP COLUMN IF EXISTS reference`);
    await db.execute(sql`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS movement_type TEXT NOT NULL DEFAULT 'in'`);
    await db.execute(sql`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reason TEXT`);
    await db.execute(sql`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_document TEXT`);
    await db.execute(sql`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS notes TEXT`);
    await db.execute(sql`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2)`);
    await db.execute(sql`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS total_value DECIMAL(10,2)`);
    console.log("Stock movements table updated.");
    await db.execute(sql`ALTER TABLE products DROP COLUMN IF EXISTS location`);
    
    // Adiciona campo product_id na tabela purchase_order_items para integração com estoque
    await db.execute(sql`ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id)`);
    
    // Add payment and installment fields to purchase_orders table
    await db.execute(sql`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_date DATE`);
    await db.execute(sql`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1`);
    await db.execute(sql`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(10,2)`);
    
    // Add missing columns to suppliers table
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS cep TEXT`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS street TEXT`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS number TEXT`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS neighborhood TEXT`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city TEXT`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state TEXT`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person TEXT`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_by INTEGER`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await db.execute(sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    // Add WhatsApp columns to companies table
    await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_instance_id TEXT`);
    await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_hash TEXT`);
    await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'disconnected'`);
    await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_qrcode TEXT`);
    await db.execute(sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_connected_at TIMESTAMP`);

    // Create purchase module tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "purchase_orders" (
        "id" serial PRIMARY KEY NOT NULL,
        "company_id" integer NOT NULL,
        "supplier_id" integer NOT NULL,
        "order_number" text NOT NULL,
        "order_date" date NOT NULL,
        "expected_delivery_date" date,
        "status" purchase_order_status DEFAULT 'draft' NOT NULL,
        "total_amount" numeric(10,2) NOT NULL,
        "notes" text,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "purchase_order_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "purchase_order_id" integer NOT NULL,
        "description" text NOT NULL,
        "quantity" numeric(10,2) NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "total_price" numeric(10,2) NOT NULL,
        "notes" text
      )
    `);
    
    // Create enums first
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE purchase_order_status AS ENUM ('draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE receiving_status AS ENUM ('pending', 'partial', 'received', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Fix existing receiving_status enum if needed
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TYPE receiving_status ADD VALUE IF NOT EXISTS 'received';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Update completed status to received
    await db.execute(sql`
      UPDATE receivings SET status = 'received' WHERE status = 'completed';
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "receivings" (
        "id" serial PRIMARY KEY NOT NULL,
        "company_id" integer NOT NULL,
        "purchase_order_id" integer NOT NULL,
        "supplier_id" integer NOT NULL,
        "receiving_number" text NOT NULL,
        "receiving_date" date,
        "status" receiving_status DEFAULT 'pending' NOT NULL,
        "total_amount" numeric(10,2) NOT NULL,
        "notes" text,
        "created_by" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    
    await db.execute(sql`
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
    `);
    
    // Fix receivings table if status column is missing
    try {
      await db.execute(sql`
        ALTER TABLE "receivings" 
        ADD COLUMN IF NOT EXISTS "status" receiving_status DEFAULT 'pending' NOT NULL
      `);
    } catch (e) {
      console.log("Receivings status column fix warning:", e);
    }
    
    // Fix duplicate purchase order numbers first
    try {
      console.log("Fixing duplicate purchase order numbers...");
      
      // Find and fix duplicate order numbers
      await db.execute(sql`
        WITH duplicates AS (
          SELECT order_number, company_id, 
                 ROW_NUMBER() OVER (PARTITION BY order_number, company_id ORDER BY id) as rn,
                 id
          FROM purchase_orders
        ),
        new_numbers AS (
          SELECT id, 
                 CASE 
                   WHEN rn = 1 THEN order_number
                   ELSE LEFT(order_number, 8) || '-' || LPAD((RIGHT(order_number, 4)::integer + rn - 1)::text, 4, '0')
                 END as new_order_number
          FROM duplicates
          WHERE rn > 1
        )
        UPDATE purchase_orders 
        SET order_number = new_numbers.new_order_number
        FROM new_numbers
        WHERE purchase_orders.id = new_numbers.id
      `);
      
      console.log("Purchase order numbers fixed.");

    // Clean up malformed order numbers and ensure sequential numbering
    try {
      const malformedOrders = await db
        .select({ id: purchaseOrders.id, orderNumber: purchaseOrders.orderNumber, companyId: purchaseOrders.companyId })
        .from(purchaseOrders)
        .where(or(
          sql`${purchaseOrders.orderNumber} LIKE '%NaN%'`,
          sql`${purchaseOrders.orderNumber} !~ '^PO-[0-9]{4}-[0-9]{4}$'`
        ));

      if (malformedOrders.length > 0) {
        console.log(`Found ${malformedOrders.length} orders with malformed numbers, fixing...`);
        
        // Delete malformed orders and their related data
        for (const order of malformedOrders) {
          await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, order.id));
          await db.delete(receivingItems).where(eq(receivingItems.receivingId, 
            sql`(SELECT id FROM receivings WHERE purchase_order_id = ${order.id})`));
          await db.delete(receivings).where(eq(receivings.purchaseOrderId, order.id));
          await db.delete(purchaseOrders).where(eq(purchaseOrders.id, order.id));
        }
        console.log("Malformed orders cleaned up.");
      }
    } catch (e) {
      console.log("Order cleanup warning:", e);
    }
    } catch (e) {
      console.log("Purchase order number fix warning:", e);
    }

    // Add unique constraints (PostgreSQL compatible syntax)
    try {
      await db.execute(sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_order_number_company_id_unique') THEN
            ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_order_number_company_id_unique" UNIQUE("order_number","company_id");
          END IF;
        END $$;
      `);
      console.log("Purchase orders unique constraint added.");
    } catch (e) {
      console.log("Purchase orders constraint warning:", e);
    }
    
    try {
      await db.execute(sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receivings_receiving_number_company_id_unique') THEN
            ALTER TABLE "receivings" ADD CONSTRAINT "receivings_receiving_number_company_id_unique" UNIQUE("receiving_number","company_id");
          END IF;
        END $$;
      `);
      console.log("Receivings unique constraint added.");
    } catch (e) {
      console.log("Receivings constraint warning:", e);
    }
    
    // Remove limit fields from companies table
    await db.execute(sql`ALTER TABLE companies DROP COLUMN IF EXISTS plan_type`);
    await db.execute(sql`ALTER TABLE companies DROP COLUMN IF EXISTS max_users`);  
    await db.execute(sql`ALTER TABLE companies DROP COLUMN IF EXISTS max_patients`);
    
    // Fix procedure categories constraint issue
    try {
      // Remove the existing unique constraint on name only if it exists
      await db.execute(sql`
        DO $$ 
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'procedure_categories_name_unique') THEN
            ALTER TABLE procedure_categories DROP CONSTRAINT procedure_categories_name_unique;
          END IF;
        EXCEPTION
          WHEN others THEN NULL;
        END $$;
      `);
      
      // Add a new unique constraint on (name, company_id) if it doesn't exist
      await db.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'procedure_categories_name_company_unique') THEN
            ALTER TABLE procedure_categories ADD CONSTRAINT procedure_categories_name_company_unique UNIQUE (name, company_id);
          END IF;
        EXCEPTION
          WHEN others THEN NULL;
        END $$;
      `);
      console.log("Procedure categories constraint fixed");
    } catch (error) {
      console.log("Constraint fix warning:", error);
    }
    
    console.log("Database migrations applied successfully");
    
    // Run SaaS migration
    await runSaasMigration();
    
    // Fix admin user - ensure admin has a company assigned
    try {
      const { users, companies } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Get admin user
      const adminUsers = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
      
      if (adminUsers.length > 0) {
        const adminUser = adminUsers[0];
        
        // If admin doesn't have a company, assign the first available company
        if (!adminUser.companyId) {
          const allCompanies = await db.select().from(companies).limit(1);
          
          if (allCompanies.length > 0) {
            const firstCompany = allCompanies[0];
            
            await db.update(users)
              .set({ companyId: firstCompany.id })
              .where(eq(users.id, adminUser.id));
              
            console.log(`Admin user fixed - assigned to company: ${firstCompany.name}`);
          }
        }
      }
    } catch (fixError) {
      console.log("Admin fix warning:", fixError);
    }
  } catch (error) {
    console.error("Migration error:", error);
  }

  // Import and add production fixes
  const { addProductionDebugRoutes, addProductionErrorHandling } = await import('./production-fix');
  addProductionDebugRoutes(app);
  
  // Register API routes BEFORE static serving
  const server = await registerRoutes(app);
  
  console.log("🔧 Middleware order check:");
  console.log("1. ✅ CORS configured");
  console.log("2. ✅ Auth middleware configured");  
  console.log("3. ✅ API routes registered");
  console.log("4. ⏳ About to configure static serving...");
  
  // Add production error handling
  addProductionErrorHandling(app);
  
  // Initialize the reminder scheduler
  initializeScheduler();

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    console.log("🚀 PRODUCTION MODE - Using override configuration");
    
    // Use override configuration to bypass all conflicts
    const { overrideProductionServing } = await import('./production-override');
    overrideProductionServing(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on configured port
  // this serves both the API and the client.
  // Port can be configured via environment variable.
  const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 5001) : 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
