import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Clean the DATABASE_URL by removing any psql command prefixes/suffixes
let DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL) {
  // Remove 'psql ' prefix and surrounding quotes if they exist
  DATABASE_URL = DATABASE_URL.replace(/^psql\s+['"]?/, '').replace(/['"]?$/, '');
}

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, schema });