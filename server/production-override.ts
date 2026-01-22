// Production override - Static file serving for VPS deployment
import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";

export function overrideProductionServing(app: Express): void {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  console.log("PRODUCTION MODE ACTIVE");
  console.log("Serving from:", distPath);
  
  if (!fs.existsSync(distPath)) {
    throw new Error(`Build not found: ${distPath}. Run 'npm run build' first.`);
  }

  // Serve static files from dist/public
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    }
  }));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Pass through API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    const indexPath = path.join(distPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(indexPath);
    } else {
      return res.status(404).send('Application not found');
    }
  });

  console.log("Production static serving configured");
}
