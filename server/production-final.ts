// Final production configuration for OdontoSync
import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";

export function setupProductionServer(app: Express): void {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  
  console.log("🚀 FINAL PRODUCTION SETUP");
  console.log("📁 Dist path:", distPath);
  console.log("📂 Dist exists:", fs.existsSync(distPath));
  
  if (!fs.existsSync(distPath)) {
    throw new Error(`Production build not found: ${distPath}`);
  }

  const assetsPath = path.join(distPath, "assets");
  console.log("📦 Assets path:", assetsPath);
  console.log("📂 Assets exists:", fs.existsSync(assetsPath));
  
  if (fs.existsSync(assetsPath)) {
    const files = fs.readdirSync(assetsPath);
    console.log("📋 Assets files:", files);
  }

  // Remove all existing routes that might interfere
  console.log("🔄 Removing existing route handlers...");
  app._router.stack = app._router.stack.filter((layer: any) => {
    // Keep only API routes
    return layer.route && layer.route.path && layer.route.path.startsWith('/api/');
  });

  // PRIORITY 1: JavaScript files with exact Content-Type
  app.get('/assets/:filename(*\\.js)', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(assetsPath, filename);
    
    console.log(`🔥 JS REQUEST: /assets/${filename}`);
    console.log(`🔍 Looking at: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      console.log(`✅ Found JS file, sending with correct headers`);
      
      // Critical: Set Content-Type BEFORE sending
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      return res.sendFile(filePath, (err) => {
        if (err) {
          console.error(`❌ Error sending JS:`, err);
        } else {
          console.log(`✅ JS file sent successfully`);
        }
      });
    } else {
      console.log(`❌ JS file not found: ${filePath}`);
      return res.status(404).send('JavaScript file not found');
    }
  });

  // PRIORITY 2: CSS files with exact Content-Type
  app.get('/assets/:filename(*\\.css)', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(assetsPath, filename);
    
    console.log(`🎨 CSS REQUEST: /assets/${filename}`);
    
    if (fs.existsSync(filePath)) {
      console.log(`✅ Found CSS file, sending with correct headers`);
      
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      return res.sendFile(filePath);
    } else {
      console.log(`❌ CSS file not found: ${filePath}`);
      return res.status(404).send('CSS file not found');
    }
  });

  // PRIORITY 3: Other assets (images, etc)
  app.get('/assets/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(assetsPath, filename);
    
    console.log(`📁 ASSET REQUEST: /assets/${filename}`);
    
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    } else {
      return res.status(404).send('Asset not found');
    }
  });

  // PRIORITY 4: Root index.html
  app.get('/', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    console.log(`🏠 ROOT REQUEST -> ${indexPath}`);
    
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(indexPath);
    } else {
      return res.status(404).send('Index not found');
    }
  });

  // PRIORITY 5: SPA fallback for client-side routing (EXCEPT assets)
  app.get('*', (req, res) => {
    // Never serve HTML for asset requests
    if (req.path.startsWith('/assets/') || req.path.startsWith('/api/')) {
      console.log(`❌ Path not found: ${req.path}`);
      return res.status(404).send('Not found');
    }
    
    const indexPath = path.join(distPath, 'index.html');
    console.log(`🔄 SPA FALLBACK: ${req.path} -> index.html`);
    
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(indexPath);
    } else {
      return res.status(404).send('Application not found');
    }
  });

  console.log("✅ Production server configuration complete");
}