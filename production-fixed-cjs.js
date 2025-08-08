#!/usr/bin/env node

/**
 * OdontoSync Production Server - FIXED VERSION (CommonJS)
 * 
 * This version uses CommonJS for maximum compatibility
 * Fixes the "Unexpected token '<'" error in production
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Enable trust proxy for production environments
app.set('trust proxy', true);

// CORS middleware - essential for production
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Parse incoming requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Define paths
const distPath = path.resolve(__dirname, 'dist', 'public');
const assetsPath = path.join(distPath, 'assets');

console.log('🚀 OdontoSync Production Server Starting...');
console.log(`📁 Static files: ${distPath}`);
console.log(`📦 Assets path: ${assetsPath}`);
console.log(`📂 Dist exists: ${fs.existsSync(distPath)}`);
console.log(`📦 Assets exists: ${fs.existsSync(assetsPath)}`);

// Validate build directory exists
if (!fs.existsSync(distPath)) {
  console.error('❌ Build directory not found. Run "npm run build" first.');
  console.error(`Expected path: ${distPath}`);
  process.exit(1);
}

if (!fs.existsSync(assetsPath)) {
  console.error('❌ Assets directory not found in build.');
  console.error(`Expected path: ${assetsPath}`);
  process.exit(1);
}

/**
 * CRITICAL FIX: Handle JavaScript files FIRST with highest priority
 * This prevents the catch-all route from serving HTML instead of JS
 */
app.get('/assets/*.js', (req, res) => {
  const fileName = path.basename(req.path);
  const filePath = path.join(assetsPath, fileName);
  
  console.log(`🔥 JS REQUEST: ${fileName}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ JS file not found: ${fileName}`);
    return res.status(404).json({ 
      error: 'JavaScript file not found', 
      requested: fileName
    });
  }

  try {
    // Read file as buffer first to check content
    const fileBuffer = fs.readFileSync(filePath);
    const fileContent = fileBuffer.toString('utf8');
    
    // CRITICAL CHECK: Ensure it's actually JavaScript, not HTML
    if (fileContent.includes('<!DOCTYPE html>') || 
        fileContent.includes('<html') || 
        fileContent.startsWith('<!DOCTYPE')) {
      console.error(`🚨 CRITICAL: File ${fileName} contains HTML instead of JavaScript!`);
      return res.status(500).json({
        error: 'File corruption detected',
        message: 'JavaScript file contains HTML content',
        file: fileName
      });
    }

    // Set critical headers for JavaScript
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Length', fileBuffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('ETag', `"${fileBuffer.length}-${Date.now()}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    console.log(`✅ Serving JS: ${fileName} (${fileBuffer.length} bytes)`);
    return res.send(fileBuffer);
    
  } catch (error) {
    console.error(`💥 Error reading JS file ${fileName}:`, error.message);
    return res.status(500).json({
      error: 'Failed to read JavaScript file',
      file: fileName,
      details: error.message
    });
  }
});

/**
 * Handle CSS files with specific Content-Type
 */
app.get('/assets/*.css', (req, res) => {
  const fileName = path.basename(req.path);
  const filePath = path.join(assetsPath, fileName);
  
  console.log(`🎨 CSS REQUEST: ${fileName}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ CSS file not found: ${fileName}`);
    return res.status(404).json({ error: 'CSS file not found', requested: fileName });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Content-Length', fileBuffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    console.log(`✅ Serving CSS: ${fileName} (${fileBuffer.length} bytes)`);
    return res.send(fileBuffer);
    
  } catch (error) {
    console.error(`💥 Error reading CSS file ${fileName}:`, error.message);
    return res.status(500).json({
      error: 'Failed to read CSS file',
      file: fileName,
      details: error.message
    });
  }
});

/**
 * Handle other static assets (images, fonts, etc.)
 */
app.get('/assets/*', (req, res) => {
  const fileName = path.basename(req.path);
  const filePath = path.join(assetsPath, fileName);
  
  console.log(`📄 ASSET REQUEST: ${fileName}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Asset not found: ${fileName}`);
    return res.status(404).json({ error: 'Asset not found', requested: fileName });
  }

  try {
    // Simple MIME type detection without external dependency
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
    
    mimeType = mimeMap[ext] || mimeType;
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    console.log(`✅ Serving asset: ${fileName} (${mimeType})`);
    return res.sendFile(filePath);
    
  } catch (error) {
    console.error(`💥 Error serving asset ${fileName}:`, error.message);
    return res.status(500).json({
      error: 'Failed to serve asset',
      file: fileName,
      details: error.message
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    assets: {
      directory: assetsPath,
      exists: fs.existsSync(assetsPath),
      files: fs.existsSync(assetsPath) ? fs.readdirSync(assetsPath).length : 0
    }
  };
  
  res.json(health);
});

/**
 * Root route - serve index.html
 */
app.get('/', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  
  console.log(`🏠 ROOT REQUEST: serving index.html`);

  if (!fs.existsSync(indexPath)) {
    console.error(`❌ index.html not found at: ${indexPath}`);
    return res.status(404).json({
      error: 'Application not found',
      message: 'index.html is missing from build',
      path: indexPath
    });
  }

  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log(`✅ Serving index.html`);
    return res.sendFile(indexPath);
    
  } catch (error) {
    console.error(`💥 Error serving index.html:`, error.message);
    return res.status(500).json({
      error: 'Failed to serve application',
      details: error.message
    });
  }
});

/**
 * SPA fallback - CRITICAL: Only for non-asset routes
 */
app.get('*', (req, res) => {
  // CRITICAL: Prevent serving HTML for asset requests
  if (req.path.startsWith('/assets/')) {
    console.error(`❌ Asset route reached fallback: ${req.path}`);
    return res.status(404).json({
      error: 'Asset not found in fallback',
      path: req.path
    });
  }

  const indexPath = path.join(distPath, 'index.html');
  
  console.log(`🔄 SPA FALLBACK: ${req.path} -> index.html`);

  if (!fs.existsSync(indexPath)) {
    return res.status(404).json({
      error: 'Application not found',
      message: 'index.html is missing'
    });
  }

  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.sendFile(indexPath);
    
  } catch (error) {
    console.error(`💥 Error in SPA fallback:`, error.message);
    return res.status(500).json({
      error: 'SPA fallback failed',
      details: error.message
    });
  }
});

// Start server
const port = process.env.PORT || 5000;
const host = process.env.HOST || '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log('');
  console.log('🎯 =====================================');
  console.log('🎯 OdontoSync Production Server READY');
  console.log('🎯 =====================================');
  console.log(`🌐 Server: http://${host}:${port}`);
  console.log(`📁 Static: ${distPath}`);
  console.log(`📦 Assets: ${assetsPath}`);
  console.log('🎯 =====================================');
});

// Export for testing
module.exports = { app, server };