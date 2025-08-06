#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function createStockTables() {
  console.log('Creating stock management tables...');

  try {
    // Create product_categories table
    await sql`
      CREATE TABLE IF NOT EXISTS product_categories (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✓ product_categories table created');

    // Create products table
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL REFERENCES product_categories(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sku VARCHAR(100),
        barcode VARCHAR(100),
        unit VARCHAR(20) DEFAULT 'unit',
        unit_price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2),
        current_stock DECIMAL(10,2) DEFAULT 0,
        minimum_stock DECIMAL(10,2) DEFAULT 0,
        maximum_stock DECIMAL(10,2),
        supplier VARCHAR(255),
        location VARCHAR(255),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✓ products table created');

    // Create stock_movements table
    await sql`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL REFERENCES products(id),
        type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
        quantity DECIMAL(10,2) NOT NULL,
        unit_cost DECIMAL(10,2),
        total_cost DECIMAL(10,2),
        reason VARCHAR(255),
        reference VARCHAR(255),
        notes TEXT,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✓ stock_movements table created');

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_product_categories_company ON product_categories(company_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);`;
    
    console.log('✓ Indexes created');
    console.log('Stock management tables created successfully!');

  } catch (error) {
    console.error('Error creating stock tables:', error);
    process.exit(1);
  }
}

createStockTables();