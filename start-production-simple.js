#!/usr/bin/env node

/**
 * Servidor de produção simples e robusto para OdontoSync
 * Versão minimalista focada em resolver o problema 502 Bad Gateway
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

console.log('🚀 Iniciando OdontoSync Production Server...');

const app = express();
const port = process.env.PORT || 5000;
const host = '0.0.0.0'; // Importante: bind em todas as interfaces

// Middleware básico
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Caminhos
const distPath = path.resolve(__dirname, 'dist', 'public');
const assetsPath = path.join(distPath, 'assets');

console.log(`📁 Diretório static: ${distPath}`);
console.log(`📦 Diretório assets: ${assetsPath}`);

// Verificações básicas
if (!fs.existsSync(distPath)) {
  console.error('❌ ERRO: Pasta dist/public não encontrada');
  console.error('Execute: npm run build');
  process.exit(1);
}

if (!fs.existsSync(assetsPath)) {
  console.error('❌ ERRO: Pasta assets não encontrada');
  process.exit(1);
}

// Listar assets disponíveis
const assets = fs.readdirSync(assetsPath);
console.log(`📦 ${assets.length} assets encontrados:`, assets.slice(0, 5).join(', '));

// Health check - SEMPRE responder
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime(),
    assets_count: assets.length
  });
});

// Ping básico
app.get('/ping', (req, res) => {
  res.send('pong');
});

// CRÍTICO: Arquivos JavaScript
app.get('/assets/*.js', (req, res) => {
  const fileName = path.basename(req.path);
  const filePath = path.join(assetsPath, fileName);
  
  console.log(`🔥 JS Request: ${fileName}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ JS não encontrado: ${fileName}`);
    return res.status(404).send('JavaScript file not found');
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se não é HTML
    if (content.includes('<!DOCTYPE') || content.startsWith('<html')) {
      console.error(`🚨 Arquivo corrompido: ${fileName}`);
      return res.status(500).send('Corrupted JavaScript file');
    }
    
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(content);
    console.log(`✅ JS servido: ${fileName}`);
    
  } catch (error) {
    console.error(`💥 Erro ao ler JS: ${fileName}`, error.message);
    res.status(500).send('Error reading JavaScript file');
  }
});

// CRÍTICO: Arquivos CSS
app.get('/assets/*.css', (req, res) => {
  const fileName = path.basename(req.path);
  const filePath = path.join(assetsPath, fileName);
  
  console.log(`🎨 CSS Request: ${fileName}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ CSS não encontrado: ${fileName}`);
    return res.status(404).send('CSS file not found');
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(content);
    console.log(`✅ CSS servido: ${fileName}`);
    
  } catch (error) {
    console.error(`💥 Erro ao ler CSS: ${fileName}`, error.message);
    res.status(500).send('Error reading CSS file');
  }
});

// Outros assets
app.get('/assets/*', (req, res) => {
  const fileName = path.basename(req.path);
  const filePath = path.join(assetsPath, fileName);
  
  if (fs.existsSync(filePath)) {
    console.log(`📄 Asset servido: ${fileName}`);
    res.sendFile(filePath);
  } else {
    console.error(`❌ Asset não encontrado: ${fileName}`);
    res.status(404).send('Asset not found');
  }
});

// Index.html para root
app.get('/', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.html não encontrado');
    return res.status(404).send('Application not found');
  }
  
  console.log('🏠 Servindo index.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(indexPath);
});

// SPA Fallback - só para rotas que não são assets
app.get('*', (req, res) => {
  // NUNCA servir HTML para assets
  if (req.path.startsWith('/assets/')) {
    console.error(`❌ Asset não encontrado: ${req.path}`);
    return res.status(404).send('Asset not found');
  }
  
  const indexPath = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('Application not found');
  }
  
  console.log(`🔄 SPA Fallback: ${req.path}`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(indexPath);
});

// Error handler
app.use((error, req, res, next) => {
  console.error('💥 Server Error:', error.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM - Fechando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT - Fechando servidor...');
  process.exit(0);
});

// Iniciar servidor
const server = app.listen(port, host, () => {
  console.log('');
  console.log('🎉 ===================================');
  console.log('🎉 SERVIDOR INICIADO COM SUCESSO!');
  console.log('🎉 ===================================');
  console.log(`🌍 URL: http://${host}:${port}`);
  console.log(`🔗 Health: http://${host}:${port}/health`);
  console.log(`📊 PID: ${process.pid}`);
  console.log('🎉 ===================================');
  console.log('');
  
  // Teste imediato
  setTimeout(() => {
    console.log('🧪 Executando auto-teste...');
    
    const http = require('http');
    const testReq = http.get(`http://localhost:${port}/health`, (testRes) => {
      if (testRes.statusCode === 200) {
        console.log('✅ Auto-teste passou - servidor funcionando!');
      } else {
        console.log(`⚠️ Auto-teste falhou - status: ${testRes.statusCode}`);
      }
    });
    
    testReq.on('error', (error) => {
      console.log('❌ Auto-teste falhou:', error.message);
    });
  }, 1000);
});

// Timeout para requisições
server.timeout = 30000;

console.log('⏳ Servidor iniciando...');