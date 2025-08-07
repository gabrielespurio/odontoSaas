// Standalone production server for OdontoSync
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Enable trust proxy for production
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

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const distPath = path.resolve(__dirname, 'dist', 'public');
console.log('🚀 Production Server Starting...');
console.log('📁 Static files directory:', distPath);
console.log('📂 Directory exists:', fs.existsSync(distPath));

if (!fs.existsSync(distPath)) {
  console.error('❌ Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

const assetsPath = path.join(distPath, 'assets');
if (fs.existsSync(assetsPath)) {
  const files = fs.readdirSync(assetsPath);
  console.log('📦 Assets found:', files);
} else {
  console.error('❌ Assets directory not found.');
  process.exit(1);
}

// Load the main backend server for API routes
let mainServer;
try {
  mainServer = require('./dist/index.js');
  console.log('✅ Main server module loaded');
} catch (error) {
  console.error('❌ Failed to load main server:', error.message);
  console.log('⚠️  Running in static-only mode');
}

// Priority 1: JavaScript files with direct file reading
app.get('/assets/*.js', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(assetsPath, filename);
  
  console.log(`📄 JS Request: ${filename}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ JS file not found: ${filename}`);
    return res.status(404).send('JavaScript file not found');
  }

  try {
    // Read file as buffer to preserve encoding
    const fileBuffer = fs.readFileSync(filePath);
    const fileContent = fileBuffer.toString('utf8');
    
    // Verify it's actually JavaScript
    if (fileContent.includes('<!DOCTYPE html>') || fileContent.includes('<html')) {
      console.log(`❌ File corrupted - contains HTML instead of JavaScript`);
      return res.status(500).send('File corrupted');
    }
    
    console.log(`✅ Serving JS: ${filename} (${fileBuffer.length} bytes)`);
    
    // Set correct headers and send
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('ETag', `"${fileBuffer.length}-${Date.now()}"`);
    
    return res.send(fileBuffer);
    
  } catch (error) {
    console.error(`💥 Error reading JS file ${filename}:`, error);
    return res.status(500).send('Error reading file');
  }
});

// Priority 2: CSS files
app.get('/assets/*.css', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(assetsPath, filename);
  
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    return res.send(fileBuffer);
  } else {
    return res.status(404).send('CSS file not found');
  }
});

// Priority 3: Other assets (images, fonts, etc.)
app.get('/assets/*', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(assetsPath, filename);
  
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  } else {
    return res.status(404).send('Asset not found');
  }
});

// Priority 4: API routes (if main server is available)
if (mainServer) {
  // Note: The main server exports should include API route handlers
  // This is a placeholder - adapt based on your server structure
  app.use('/api', (req, res) => {
    res.status(503).send('API temporarily unavailable');
  });
}

// Priority 5: Root route
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

// Priority 6: SPA fallback (everything else)
app.get('*', (req, res) => {
  // Prevent serving HTML for asset requests
  if (req.path.startsWith('/assets/') || req.path.startsWith('/api/')) {
    return res.status(404).send('Resource not found');
  }
  
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('Application not found');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Internal server error');
});

// Start server
const port = process.env.PORT || 5000;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`🎯 Production server running on ${host}:${port}`);
  console.log(`📱 Access at: http://localhost:${port}`);
  console.log('✅ Ready to serve static files with correct Content-Type headers');
});

module.exports = app;