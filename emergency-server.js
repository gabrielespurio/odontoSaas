#!/usr/bin/env node

/**
 * SERVIDOR DE EMERGÊNCIA - OdontoSync
 * Versão extremamente básica garantida para resolver o 502 Bad Gateway
 * Este servidor é prova de falhas e deve funcionar em qualquer ambiente
 */

console.log('🚨 EMERGENCY SERVER STARTING...');
console.log('================================');

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuração básica
const PORT = 5000;
const HOST = '0.0.0.0';

// Verificar estrutura básica
const distPath = path.resolve(__dirname, 'dist', 'public');
const assetsPath = path.join(distPath, 'assets');

console.log('📁 Checking directories...');
console.log(`   dist/public: ${fs.existsSync(distPath) ? 'EXISTS' : 'MISSING'}`);
console.log(`   assets: ${fs.existsSync(assetsPath) ? 'EXISTS' : 'MISSING'}`);

if (!fs.existsSync(distPath)) {
  console.error('❌ CRITICAL: dist/public directory not found!');
  console.error('   Run: npm run build');
  process.exit(1);
}

// Cache de arquivos para performance
const fileCache = new Map();

function getCachedFile(filePath) {
  if (fileCache.has(filePath)) {
    return fileCache.get(filePath);
  }
  
  try {
    const content = fs.readFileSync(filePath);
    fileCache.set(filePath, content);
    return content;
  } catch (error) {
    return null;
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };
  return types[ext] || 'application/octet-stream';
}

function logRequest(req, statusCode, message = '') {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] ${req.method} ${req.url} → ${statusCode} ${message}`);
}

// Criar servidor HTTP básico
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Headers CORS básicos
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    logRequest(req, 200, 'OPTIONS');
    return;
  }
  
  try {
    // Health check - SEMPRE funciona
    if (pathname === '/health' || pathname === '/ping') {
      const health = {
        status: 'healthy',
        server: 'emergency-server',
        timestamp: new Date().toISOString(),
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
      logRequest(req, 200, 'HEALTH_CHECK');
      return;
    }
    
    // Assets - JavaScript files (CRÍTICO)
    if (pathname.startsWith('/assets/') && pathname.endsWith('.js')) {
      const fileName = path.basename(pathname);
      const filePath = path.join(assetsPath, fileName);
      
      const content = getCachedFile(filePath);
      if (!content) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('JavaScript file not found');
        logRequest(req, 404, `JS_NOT_FOUND: ${fileName}`);
        return;
      }
      
      // Verificação crítica - não pode ser HTML
      const contentStr = content.toString('utf8');
      if (contentStr.includes('<!DOCTYPE') || contentStr.includes('<html')) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Corrupted JavaScript file - contains HTML');
        logRequest(req, 500, `JS_CORRUPTED: ${fileName}`);
        return;
      }
      
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': content.length
      });
      res.end(content);
      logRequest(req, 200, `JS_OK: ${fileName} (${content.length}b)`);
      return;
    }
    
    // Assets - CSS files
    if (pathname.startsWith('/assets/') && pathname.endsWith('.css')) {
      const fileName = path.basename(pathname);
      const filePath = path.join(assetsPath, fileName);
      
      const content = getCachedFile(filePath);
      if (!content) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('CSS file not found');
        logRequest(req, 404, `CSS_NOT_FOUND: ${fileName}`);
        return;
      }
      
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': content.length
      });
      res.end(content);
      logRequest(req, 200, `CSS_OK: ${fileName} (${content.length}b)`);
      return;
    }
    
    // Assets - Other files
    if (pathname.startsWith('/assets/')) {
      const fileName = path.basename(pathname);
      const filePath = path.join(assetsPath, fileName);
      
      const content = getCachedFile(filePath);
      if (!content) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Asset not found');
        logRequest(req, 404, `ASSET_NOT_FOUND: ${fileName}`);
        return;
      }
      
      const mimeType = getMimeType(filePath);
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': content.length
      });
      res.end(content);
      logRequest(req, 200, `ASSET_OK: ${fileName}`);
      return;
    }
    
    // Root ou qualquer rota SPA - serve index.html
    const indexPath = path.join(distPath, 'index.html');
    const indexContent = getCachedFile(indexPath);
    
    if (!indexContent) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Application not found - index.html missing');
      logRequest(req, 404, 'INDEX_NOT_FOUND');
      return;
    }
    
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Length': indexContent.length
    });
    res.end(indexContent);
    logRequest(req, 200, pathname === '/' ? 'INDEX' : `SPA_FALLBACK: ${pathname}`);
    
  } catch (error) {
    console.error(`💥 Server error for ${pathname}:`, error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message,
      path: pathname
    }));
    logRequest(req, 500, `ERROR: ${error.message.substring(0, 50)}`);
  }
});

// Error handlers
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ CRITICAL: Port ${PORT} is already in use!`);
    console.error('   Kill existing process: pkill -f "node.*5000"');
    console.error('   Or use different port: PORT=5001 node emergency-server.js');
    process.exit(1);
  } else {
    console.error('❌ Server error:', error.message);
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received - shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received - shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('🚨 =============================');
  console.log('🚨 EMERGENCY SERVER IS RUNNING');
  console.log('🚨 =============================');
  console.log(`🌍 Address: http://${HOST}:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📊 PID: ${process.pid}`);
  console.log('🚨 =============================');
  
  // Self-test
  setTimeout(() => {
    console.log('\n🧪 Running self-test...');
    
    const testReq = http.get(`http://localhost:${PORT}/health`, (testRes) => {
      let data = '';
      testRes.on('data', chunk => data += chunk);
      testRes.on('end', () => {
        if (testRes.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            console.log('✅ SELF-TEST PASSED!');
            console.log(`   Status: ${health.status}`);
            console.log(`   Server: ${health.server}`);
            console.log(`   PID: ${health.pid}`);
            console.log('\n🎯 Server is ready to receive requests!');
          } catch (e) {
            console.log('⚠️ Self-test response not JSON, but server is responding');
          }
        } else {
          console.log(`❌ Self-test failed: ${testRes.statusCode}`);
        }
      });
    });
    
    testReq.on('error', (error) => {
      console.log('❌ Self-test failed:', error.message);
    });
    
    testReq.setTimeout(3000, () => {
      console.log('❌ Self-test timeout');
      testReq.destroy();
    });
    
  }, 500);
  
  // List available assets for debugging
  if (fs.existsSync(assetsPath)) {
    const assets = fs.readdirSync(assetsPath);
    const jsFiles = assets.filter(f => f.endsWith('.js'));
    const cssFiles = assets.filter(f => f.endsWith('.css'));
    
    console.log('\n📦 Available assets:');
    console.log(`   JS files: ${jsFiles.length} (${jsFiles.slice(0, 3).join(', ')}${jsFiles.length > 3 ? '...' : ''})`);
    console.log(`   CSS files: ${cssFiles.length} (${cssFiles.slice(0, 3).join(', ')}${cssFiles.length > 3 ? '...' : ''})`);
    console.log(`   Total: ${assets.length} files`);
  }
});

console.log('⚡ Emergency server initialized - waiting for connections...');