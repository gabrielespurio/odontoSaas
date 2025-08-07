import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function createConsultationProductsTable() {
  try {
    console.log('Creating consultation_products table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS consultation_products (
        id SERIAL PRIMARY KEY,
        consultation_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      )
    `);
    
    console.log('consultation_products table created successfully!');
    
    // Create index for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_consultation_products_consultation_id 
      ON consultation_products(consultation_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_consultation_products_product_id 
      ON consultation_products(product_id)
    `);
    
    console.log('Indexes created successfully!');
    
  } catch (error) {
    console.error('Error creating consultation_products table:', error);
    throw error;
  }
}

createConsultationProductsTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });