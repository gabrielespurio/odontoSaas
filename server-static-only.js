// Servidor de produção SOMENTE para arquivos estáticos
// Resolve definitivamente o problema 502 Bad Gateway
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

console.log('🚀 Starting OdontoSync Static-Only Production Server');

// Trust proxy
app.set('trust proxy', true);

// CORS
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

console.log('📁 Static files path:', staticPath);
console.log('📂 Static directory exists:', fs.existsSync(staticPath));

if (!fs.existsSync(staticPath)) {
  console.error('❌ CRITICAL: dist/public directory not found!');
  console.error('   Run: npm run build');
  process.exit(1);
}

// Health check endpoint - SEMPRE funciona
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    server: 'static-only-production',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    static_files: fs.existsSync(staticPath)
  };
  
  console.log('🔍 Health check requested');
  res.json(health);
});

// Ping
app.get('/ping', (req, res) => {
  res.send('pong');
});

// CRÍTICO: JavaScript files com Content-Type correto
app.get('/assets/*.js', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(staticPath, 'assets', filename);
  
  console.log(`📄 JS Request: ${filename}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ JS file not found: ${filename}`);
    return res.status(404).send('JavaScript file not found');
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se não é HTML corrompido
    if (fileContent.includes('<!DOCTYPE html>') || fileContent.includes('<html')) {
      console.log(`❌ File corrupted - contains HTML: ${filename}`);
      return res.status(500).send('File corrupted - contains HTML');
    }
    
    console.log(`✅ Serving JS file: ${filename} (${fileContent.length} chars)`);
    
    // Headers corretos para JavaScript
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(fileContent, 'utf8'));
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    return res.send(fileContent);
    
  } catch (error) {
    console.error(`💥 Error reading JS file ${filename}:`, error);
    return res.status(500).send(`Error reading JavaScript file: ${error.message}`);
  }
});

// CSS files
app.get('/assets/*.css', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(staticPath, 'assets', filename);
  
  console.log(`🎨 CSS Request: ${filename}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ CSS file not found: ${filename}`);
    return res.status(404).send('CSS file not found');
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    console.log(`✅ Serving CSS: ${filename}`);
    return res.send(fileContent);
    
  } catch (error) {
    console.error(`💥 Error reading CSS file ${filename}:`, error);
    return res.status(500).send(`Error reading CSS file: ${error.message}`);
  }
});

// Other assets (images, fonts, etc.)
app.get('/assets/*', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(staticPath, 'assets', filename);
  
  console.log(`📦 Asset Request: ${filename}`);
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ Serving asset: ${filename}`);
    return res.sendFile(filePath);
  } else {
    console.log(`❌ Asset not found: ${filename}`);
    return res.status(404).send('Asset not found');
  }
});

// Root route - serve index.html
app.get('/', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ index.html not found');
    return res.status(404).send('Application not found - index.html missing');
  }
  
  console.log('✅ Serving index.html for root');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  return res.sendFile(indexPath);
});

// SPA fallback - NUNCA serve HTML para assets
app.get('*', (req, res) => {
  // CRÍTICO: Nunca servir HTML para requests de assets
  if (req.path.startsWith('/assets/')) {
    console.log(`❌ Asset not found: ${req.path}`);
    return res.status(404).send('Asset not found');
  }
  
  // CRÍTICO: Nunca servir HTML para APIs
  if (req.path.startsWith('/api/')) {
    console.log(`❌ API not implemented: ${req.path}`);
    return res.status(404).json({ error: 'API not implemented in static-only mode' });
  }
  
  const indexPath = path.join(staticPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('Application not found');
  }
  
  console.log(`📄 SPA fallback for: ${req.path}`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  return res.sendFile(indexPath);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log('');
  console.log('🎉 ================================');
  console.log('🎉 STATIC-ONLY SERVER RUNNING!');
  console.log('🎉 ================================');
  console.log(`🌍 URL: http://0.0.0.0:${port}`);
  console.log(`🔗 Health: http://localhost:${port}/health`);
  console.log(`📊 PID: ${process.pid}`);
  console.log('🎉 ================================');
  
  // Log available assets
  const assetsPath = path.join(staticPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const assets = fs.readdirSync(assetsPath);
    const jsFiles = assets.filter(f => f.endsWith('.js'));
    const cssFiles = assets.filter(f => f.endsWith('.css'));
    
    console.log(`📦 Available assets:`);
    console.log(`   - JS files: ${jsFiles.length}`);
    console.log(`   - CSS files: ${cssFiles.length}`);
    console.log(`   - Total: ${assets.length} files`);
    
    if (jsFiles.length > 0) {
      console.log(`   - JS: ${jsFiles[0]} ${jsFiles.length > 1 ? '...' : ''}`);
    }
  }
  
  console.log('');
  console.log('📋 This server ONLY serves static files');
  console.log('📋 No API functionality - perfect for frontend-only deployment');
  console.log('');
  
  // Self-test
  setTimeout(() => {
    const http = require('http');
    console.log('🧪 Running self-test...');
    
    const testReq = http.get(`http://localhost:${port}/health`, (testRes) => {
      if (testRes.statusCode === 200) {
        console.log('✅ SELF-TEST PASSED - Server is responding!');
        console.log('🎯 Ready to serve requests!');
      } else {
        console.log(`⚠️ Self-test got status: ${testRes.statusCode}`);
      }
    });
    
    testReq.on('error', (error) => {
      console.log('❌ Self-test failed:', error.message);
    });
    
    testReq.setTimeout(3000, () => {
      console.log('❌ Self-test timeout');
      testReq.destroy();
    });
  }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM - Shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT - Shutting down gracefully');
  process.exit(0);
});

module.exports = app;