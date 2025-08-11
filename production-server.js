#!/usr/bin/env node

/**
 * OdontoSync - Servidor de Produção Otimizado para Contabo
 * 
 * Este servidor resolve os principais problemas de deploy:
 * - Content-Type correto para arquivos JS/CSS
 * - Serving estático otimizado
 * - CORS configurado para produção
 * - Logs estruturados
 * - Health check endpoint
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Configuração
const app = express();
const PORT = process.env.PORT || 4001;
const NODE_ENV = process.env.NODE_ENV || 'production';
const DOMAIN = process.env.DOMAIN || 'localhost';

console.log(`🚀 OdontoSync Production Server`);
console.log(`📊 Environment: ${NODE_ENV}`);
console.log(`🌐 Port: ${PORT}`);
console.log(`🏠 Domain: ${DOMAIN}`);

// Middleware de logging estruturado
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    
    // Log apenas requests importantes
    if (req.path.startsWith('/api') || req.path.startsWith('/assets') || duration > 1000) {
      console.log(`${timestamp} [${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  
  next();
});

// CORS otimizado para produção
app.use((req, res, next) => {
  const allowedOrigins = [
    `http://${DOMAIN}`,
    `https://${DOMAIN}`,
    `http://www.${DOMAIN}`,
    `https://www.${DOMAIN}`,
    'http://localhost:3000',
    'http://localhost:4001'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: NODE_ENV
  };
  
  res.json(health);
});

// Servir arquivos estáticos com Content-Type correto
const publicPath = path.join(__dirname, 'dist', 'public');

if (!fs.existsSync(publicPath)) {
  console.error(`❌ Error: Build directory not found: ${publicPath}`);
  console.log('💡 Make sure to run "npm run build" first');
  process.exit(1);
}

console.log(`📁 Serving static files from: ${publicPath}`);

// Middleware para arquivos JavaScript - PRIORIDADE MÁXIMA
app.get('/assets/*.js', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(publicPath, 'assets', filename);
  
  console.log(`📦 JS Request: ${req.path} -> ${filename}`);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Verificar se é realmente JavaScript
      if (content.startsWith('<!DOCTYPE html>') || content.includes('<html>')) {
        console.error(`❌ JavaScript file corrupted (contains HTML): ${filename}`);
        return res.status(500).json({ error: 'JavaScript file corrupted' });
      }
      
      // Headers otimizados para JS
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      
      console.log(`✅ JS served: ${filename} (${content.length} chars)`);
      return res.send(content);
      
    } catch (error) {
      console.error(`❌ Error reading JS file ${filename}:`, error.message);
      return res.status(500).json({ error: 'Error reading JavaScript file' });
    }
  } else {
    console.error(`❌ JS file not found: ${filePath}`);
    return res.status(404).json({ error: 'JavaScript file not found' });
  }
});

// Middleware para arquivos CSS
app.get('/assets/*.css', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(publicPath, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Length', Buffer.byteLength(content, 'utf8'));
      
      console.log(`✅ CSS served: ${filename}`);
      return res.send(content);
      
    } catch (error) {
      console.error(`❌ Error reading CSS file ${filename}:`, error.message);
      return res.status(500).json({ error: 'Error reading CSS file' });
    }
  } else {
    console.error(`❌ CSS file not found: ${filePath}`);
    return res.status(404).json({ error: 'CSS file not found' });
  }
});

// Outros assets estáticos
app.use('/assets', express.static(path.join(publicPath, 'assets'), {
  maxAge: '1y',
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// API routes - importar o servidor principal quando necessário
if (NODE_ENV === 'production') {
  // Em produção, carregar as rotas do servidor principal
  try {
    // Carregar o módulo do servidor principal dinamicamente
    import('./dist/index.js').then((serverModule) => {
      console.log('✅ API routes loaded from main server');
    }).catch((error) => {
      console.warn('⚠️  Could not load API routes from main server:', error.message);
      console.log('🔄 Using proxy fallback...');
      
      // Fallback: proxy para localhost:5001 se o servidor principal estiver em porta separada
      app.use('/api', createProxyMiddleware({
        target: 'http://localhost:5001',
        changeOrigin: true,
        onError: (err, req, res) => {
          console.error('❌ API Proxy Error:', err.message);
          res.status(502).json({ 
            error: 'API service unavailable',
            message: 'Backend API server is not responding'
          });
        }
      }));
    });
  } catch (error) {
    console.error('❌ Failed to setup API routes:', error.message);
    
    // Fallback básico para indicar que API não está disponível
    app.use('/api', (req, res) => {
      res.status(503).json({ 
        error: 'API service unavailable',
        message: 'Backend API server is not properly configured for production'
      });
    });
  }
} else {
  // Em desenvolvimento, retornar informação sobre configuração
  app.use('/api', (req, res) => {
    res.status(501).json({ 
      error: 'API not configured in static server mode',
      message: 'Use the main development server for API access'
    });
  });
}

// Servir index.html para todas as outras rotas (SPA)
app.get('*', (req, res) => {
  // Evitar servir index.html para requests de assets
  if (req.path.startsWith('/assets/') || req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const indexPath = path.join(publicPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    console.log(`🏠 SPA Fallback: ${req.path} -> index.html`);
    res.sendFile(indexPath);
  } else {
    console.error(`❌ index.html not found at: ${indexPath}`);
    res.status(404).json({ error: 'Application not found' });
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ OdontoSync production server running on:`);
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://0.0.0.0:${PORT}`);
  console.log(`   Domain:   http://${DOMAIN}${PORT !== 80 ? ':' + PORT : ''}`);
  console.log('');
  console.log('📊 Available endpoints:');
  console.log(`   Health:   http://localhost:${PORT}/health`);
  console.log(`   App:      http://localhost:${PORT}/`);
  console.log('');
  console.log('🎯 Ready to serve requests!');
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

module.exports = app;