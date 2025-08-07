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

  // CRITICAL: Handle .js files with exact pattern matching
  app.get('/assets/*.js', (req, res) => {
    const fileName = path.basename(req.path);
    const filePath = path.join(distPath, 'assets', fileName);
    
    console.log(`🔥 DIRECT JS REQUEST: ${req.path}`);
    console.log(`🔥 Looking for file: ${filePath}`);
    console.log(`🔥 File exists: ${fs.existsSync(filePath)}`);
    
    if (fs.existsSync(filePath)) {
      console.log(`✅ Serving JS file with correct headers`);
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.sendFile(filePath);
    } else {
      console.log(`❌ JS file not found at: ${filePath}`);
      console.log(`📁 Available files:`, fs.readdirSync(path.join(distPath, 'assets')));
      return res.status(404).send('JavaScript file not found');
    }
  });

  // CRITICAL: Handle .css files FIRST before catch-all
  app.get('/assets/*.css', (req, res, next) => {
    const fileName = path.basename(req.path);
    const filePath = path.join(distPath, 'assets', fileName);
    
    console.log(`🎨 CSS Request: ${req.path} -> ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.sendFile(filePath);
    } else {
      console.log(`❌ CSS file not found: ${filePath}`);
      res.status(404).send('CSS file not found');
    }
  });

  // Fallback static serving for other assets
  app.use(express.static(distPath, {
    maxAge: 0,
    etag: false,
    setHeaders: (res, filePath) => {
      console.log(`📁 Static file: ${filePath}`);
    }
  }));

  // Fallback para SPA - ONLY for non-asset routes
  app.use("*", (req, res) => {
    // DO NOT serve index.html for asset requests
    if (req.originalUrl.startsWith('/assets/')) {
      console.log(`❌ Asset not found: ${req.originalUrl}`);
      return res.status(404).send('Asset not found');
    }
    
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