// Production override - Direct file serving without interference
import type { Express } from "express";
import path from "path";
import fs from "fs";

export function overrideProductionServing(app: Express): void {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  console.log("🔧 PRODUCTION OVERRIDE ACTIVE");
  console.log("📁 Serving from:", distPath);
  
  if (!fs.existsSync(distPath)) {
    throw new Error(`Build not found: ${distPath}`);
  }

  // Clear all existing routes and middleware that might interfere
  console.log("🧹 Clearing conflicting routes...");
  
  // Remove the problematic catch-all routes
  if (app._router && app._router.stack) {
    app._router.stack = app._router.stack.filter((layer: any) => {
      // Keep only API routes and essential middleware
      if (layer.route) {
        return layer.route.path && layer.route.path.startsWith('/api/');
      }
      // Keep essential middleware but remove catch-all handlers
      return layer.name !== 'serveStatic' && 
             layer.regexp.source !== '^\\/?(?=\\/|$)' && // Remove catch-all
             !layer.regexp.source.includes('.*'); // Remove wildcard routes
    });
  }

  // CRITICAL: Remove ALL existing middleware first
  app._router = null;
  app.routes = {};
  app._router = require('express').Router();

  // Direct JavaScript file handler with wildcard - ABSOLUTE PRIORITY
  app.get('/assets/*.js', (req, res) => {
    const filename = path.basename(req.path);
    const filePath = path.join(distPath, 'assets', filename);
    
    console.log(`🔥 DIRECT JS: ${req.path} -> ${filename}`);
    console.log(`🔍 File path: ${filePath}`);
    console.log(`📂 Exists: ${fs.existsSync(filePath)}`);
    
    if (fs.existsSync(filePath)) {
      console.log(`✅ Reading JS file directly`);
      
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Ensure it's actually JavaScript content
        if (fileContent.includes('<!DOCTYPE html>')) {
          console.log(`❌ File contains HTML, not JavaScript!`);
          return res.status(500).send('File corrupted - contains HTML');
        }
        
        console.log(`✅ Valid JS content, size: ${fileContent.length} chars`);
        console.log(`📄 First 100 chars: ${fileContent.substring(0, 100)}`);
        
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(fileContent, 'utf8').toString());
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        return res.send(fileContent);
      } catch (error) {
        console.error(`💥 Error reading JS file:`, error);
        return res.status(500).send('Error reading JavaScript file');
      }
    } else {
      console.log(`❌ JS not found: ${filename}`);
      console.log(`📁 Available files:`, fs.readdirSync(path.join(distPath, 'assets')));
      return res.status(404).send('JavaScript file not found');
    }
  });

  // Direct CSS file handler
  app.get('/assets/:filename.css', (req, res) => {
    const filename = `${req.params.filename}.css`;
    const filePath = path.join(distPath, 'assets', filename);
    
    console.log(`🎨 CSS: ${filename}`);
    
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath);
      
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Content-Length', fileContent.length.toString());
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      return res.send(fileContent);
    } else {
      return res.status(404).send('CSS file not found');
    }
  });

  // API Route Logger - Debugging production requests
  app.use('/api', (req, res, next) => {
    console.log(`📡 API Request: ${req.method} ${req.path}`);
    next();
  });

  // Other assets (images, etc.)
  app.get('/assets/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(distPath, 'assets', filename);
    
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    } else {
      return res.status(404).send('Asset not found');
    }
  });

  // Root route
  app.get('/', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(indexPath);
    } else {
      return res.status(404).send('Application not found');
    }
  });

  // SPA fallback - ONLY for non-asset, non-API routes
  app.get('*', (req, res, next) => {
    // Explicitly block asset requests from going to SPA fallback
    if (req.path.startsWith('/assets/')) {
      console.log(`🚫 Blocked fallback for asset: ${req.path}`);
      return res.status(404).send('Resource not found');
    }

    if (req.path.startsWith('/api/')) {
      console.log(`➡️ Passing through API request: ${req.path}`);
      return next();
    }
    
    const indexPath = path.join(distPath, 'index.html');
    console.log(`🔄 SPA: ${req.path}`);
    
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(indexPath);
    } else {
      return res.status(404).send('Application not found');
    }
  });

  console.log("✅ Production override complete");
}