// Ultra-simple production server for Git deployment
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const publicDir = path.join(__dirname, 'dist', 'public');

console.log('🔧 Ultra-Simple Production Server');
console.log('📁 Public dir:', publicDir);
console.log('📂 Exists:', fs.existsSync(publicDir));

if (fs.existsSync(path.join(publicDir, 'assets'))) {
  const assets = fs.readdirSync(path.join(publicDir, 'assets'));
  console.log('📦 Assets:', assets);
}

// SPECIFIC route for our JS file
app.get('/assets/index-DSlahus0.js', (req, res) => {
  const jsPath = path.join(publicDir, 'assets', 'index-DSlahus0.js');
  
  console.log('🎯 DIRECT JS request for index-DSlahus0.js');
  console.log('📄 Path:', jsPath);
  console.log('📂 Exists:', fs.existsSync(jsPath));
  
  if (fs.existsSync(jsPath)) {
    const content = fs.readFileSync(jsPath, 'utf8');
    console.log('✅ Content length:', content.length);
    console.log('📝 First 100 chars:', content.substring(0, 100));
    
    // Force correct headers
    res.set({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Content-Length': Buffer.byteLength(content, 'utf8')
    });
    
    return res.send(content);
  } else {
    console.log('❌ JS file not found');
    return res.status(404).send('JS not found');
  }
});

// Generic JS handler
app.get('/assets/:filename.js', (req, res) => {
  const filename = req.params.filename + '.js';
  const jsPath = path.join(publicDir, 'assets', filename);
  
  console.log('📄 Generic JS request:', filename);
  
  if (fs.existsSync(jsPath)) {
    const content = fs.readFileSync(jsPath, 'utf8');
    
    res.set({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    
    return res.send(content);
  } else {
    return res.status(404).send('JS file not found');
  }
});

// CSS files
app.get('/assets/:filename.css', (req, res) => {
  const filename = req.params.filename + '.css';
  const cssPath = path.join(publicDir, 'assets', filename);
  
  if (fs.existsSync(cssPath)) {
    const content = fs.readFileSync(cssPath, 'utf8');
    
    res.set({
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    
    return res.send(content);
  } else {
    return res.status(404).send('CSS not found');
  }
});

// Other assets
app.get('/assets/:filename', (req, res) => {
  const filename = req.params.filename;
  const assetPath = path.join(publicDir, 'assets', filename);
  
  if (fs.existsSync(assetPath)) {
    return res.sendFile(assetPath);
  } else {
    return res.status(404).send('Asset not found');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    files: fs.existsSync(path.join(publicDir, 'assets', 'index-DSlahus0.js'))
  });
});

// Root
app.get('/', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('App not found');
  }
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/assets/') || req.path.startsWith('/api/')) {
    return res.status(404).send('Not found');
  }
  
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('App not found');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🎯 Server running on port ${port}`);
  console.log(`Test: curl -I http://localhost:${port}/assets/index-DSlahus0.js`);
});