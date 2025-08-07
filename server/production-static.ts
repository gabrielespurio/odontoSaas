// Production static file serving optimization
import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";

export function setupProductionStatic(app: Express): void {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  
  console.log("🔧 Production Static Setup:");
  console.log("  - Static files path:", distPath);
  console.log("  - Directory exists:", fs.existsSync(distPath));
  console.log("  - Files in directory:", fs.existsSync(distPath) ? fs.readdirSync(distPath) : []);

  if (!fs.existsSync(distPath)) {
    throw new Error(`Production build directory not found: ${distPath}`);
  }

  // Middleware para logs de requisições de assets
  app.use('/assets/*', (req, res, next) => {
    console.log(`📦 Asset request: ${req.url}`);
    next();
  });

  // Configurar serving de arquivos estáticos com headers corretos
  app.use(express.static(distPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      console.log(`📄 Serving file: ${filePath}`);
      
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // Fallback para SPA - servir index.html para todas as rotas não encontradas
  app.use("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    console.log(`🏠 SPA Fallback: ${req.originalUrl} -> ${indexPath}`);
    
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Index.html not found');
    }
  });
}