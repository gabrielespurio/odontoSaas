import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Priorize external Neon database - check for ep-round-violet pattern to ensure we use the external one
const externalNeon = "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const DATABASE_URL = process.env.NEON_DATABASE_URL || (process.env.DATABASE_URL?.includes("ep-round-violet") ? process.env.DATABASE_URL : externalNeon);

console.log("NEON_DATABASE_URL env:", process.env.NEON_DATABASE_URL ? "SET" : "NOT SET");
console.log("DATABASE_URL env:", process.env.DATABASE_URL ? "SET" : "NOT SET");
console.log("Using specified Neon database:", DATABASE_URL.split('@')[1]?.split('/')[0]);
console.log("Full connection string host:", DATABASE_URL.split('://')[1]?.split('@')[1] || "N/A");

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, schema });