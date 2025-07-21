import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeScheduler } from "./scheduler";
import { runSaasMigration } from "./migrations/saas-migration";
import { db } from "./db";
import { sql } from "drizzle-orm";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    
    // Remove limit fields from companies table
    await db.execute(sql`ALTER TABLE companies DROP COLUMN IF EXISTS plan_type`);
    await db.execute(sql`ALTER TABLE companies DROP COLUMN IF EXISTS max_users`);  
    await db.execute(sql`ALTER TABLE companies DROP COLUMN IF EXISTS max_patients`);
    
    console.log("Database migrations applied successfully");
    
    // Run SaaS migration
    await runSaasMigration();
  } catch (error) {
    console.error("Migration error:", error);
  }

  const server = await registerRoutes(app);
  
  // Initialize the reminder scheduler
  initializeScheduler();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
