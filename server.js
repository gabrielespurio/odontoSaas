// Simple production server for external deployment
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5001;

// Trust proxy for production
app.set('trust proxy', true);

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const staticPath = path.join(__dirname, 'dist', 'public');

console.log('🚀 Starting OdontoSync Production Server');
console.log('📁 Static files path:', staticPath);
console.log('📂 Static directory exists:', fs.existsSync(staticPath));

// Critical: Handle JavaScript files FIRST with explicit Content-Type
// This MUST be before any other static middleware or routes
app.get('/assets/*.js', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(staticPath, 'assets', filename);
  
  console.log(`📄 JS Request: ${filename}`);
  console.log(`📍 File path: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ JS file not found: ${filename}`);
    return res.status(404).send('JavaScript file not found');
  }

  try {
    // Read file as UTF-8 text
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Validate it's actually JavaScript content
    if (fileContent.includes('<!DOCTYPE html>')) {
      console.log(`❌ File corrupted - contains HTML: ${filename}`);
      return res.status(500).send('File corrupted - contains HTML');
    }
    
    console.log(`✅ Serving JS file: ${filename} (${fileContent.length} chars)`);
    console.log(`📝 Content preview: ${fileContent.substring(0, 100)}...`);
    
    // Set correct headers for JavaScript
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(fileContent, 'utf8'));
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    return res.send(fileContent);
    
  } catch (error) {
    console.error(`💥 Error reading JS file ${filename}:`, error);
    return res.status(500).send(`Error reading JavaScript file: ${error.message}`);
  }
});

// Handle CSS files
app.get('/assets/*.css', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(staticPath, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    console.log(`✅ Serving CSS: ${filename}`);
    return res.send(fileContent);
  } else {
    return res.status(404).send('CSS file not found');
  }
});

// Handle other assets (images, fonts, etc.) - but NOT .js files
app.use('/assets', (req, res, next) => {
  // Skip JS and CSS files - they are handled above
  if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
    return next();
  }
  express.static(path.join(staticPath, 'assets'))(req, res, next);
});

// API routes - import from main server
let apiRoutes;
try {
  apiRoutes = require('./dist/index.js');
  console.log('✅ API routes loaded from dist/index.js');
} catch (error) {
  console.log('⚠️  API routes not found, running in static-only mode');
  console.log('Error:', error.message);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    static_files: fs.existsSync(staticPath)
  });
});

// Root route - serve index.html
app.get('/', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    console.log('✅ Serving index.html');
    return res.sendFile(indexPath);
  } else {
    console.log('❌ index.html not found');
    return res.status(404).send('Application not found');
  }
});

// SPA fallback for all other routes (except API and assets)
app.get('*', (req, res) => {
  // Don't serve HTML for API or asset requests
  if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
    return res.status(404).send('Resource not found');
  }
  
  const indexPath = path.join(staticPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    console.log(`📄 SPA fallback for: ${req.path}`);
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('Application not found');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🎯 OdontoSync server running on port ${port}`);
  console.log(`🌐 Access at: http://localhost:${port}`);
  console.log('✅ Server ready for external deployment');
  
  // Log available assets for debugging
  const assetsPath = path.join(staticPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const assets = fs.readdirSync(assetsPath);
    console.log('📦 Available assets:', assets);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

module.exports = app;