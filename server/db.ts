import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use NEON_DATABASE_URL if set, otherwise fallback to DATABASE_URL or hardcoded value
const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log("Using specified Neon database:", DATABASE_URL.split('@')[1]?.split('/')[0]);

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, schema });