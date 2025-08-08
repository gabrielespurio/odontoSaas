#!/bin/bash

echo "🔧 Corrigindo problema de porta em uso - OdontoSync"
echo "=================================================="

# 1. Parar todos os processos PM2
echo "1. Parando todos os processos PM2..."
pm2 stop all
pm2 delete all

# 2. Matar todos os processos Node.js na porta 5000
echo "2. Liberando porta 5000..."
pkill -f "node.*5000" 2>/dev/null || echo "   (nenhum processo node na porta 5000)"
pkill -f ".*5000" 2>/dev/null || echo "   (nenhum processo genérico na porta 5000)"

# Usar lsof se disponível para matar processo específico
if command -v lsof >/dev/null 2>&1; then
    echo "   Verificando processos na porta 5000..."
    PIDS=$(lsof -ti:5000 2>/dev/null || echo "")
    if [ ! -z "$PIDS" ]; then
        echo "   Matando PIDs: $PIDS"
        kill -9 $PIDS 2>/dev/null || echo "   (processos já mortos)"
    else
        echo "   (porta 5000 livre)"
    fi
fi

# 3. Aguardar um pouco
sleep 3

# 4. Verificar se porta está livre
echo "3. Verificando se porta 5000 está livre..."
netstat -tlnp | grep :5000 && echo "   ⚠️ Porta ainda em uso!" || echo "   ✅ Porta 5000 livre!"

# 5. Verificar se arquivo .cjs existe
echo "4. Verificando arquivo servidor..."
if [ ! -f "server-static-only.cjs" ]; then
    echo "   ❌ server-static-only.cjs não encontrado!"
    echo "   Criando arquivo..."
    
cat > server-static-only.cjs << 'EOFSERVER'
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

console.log('🚀 OdontoSync Static Server Starting...');

app.set('trust proxy', true);

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const staticPath = path.join(__dirname, 'dist', 'public');

console.log('📁 Static path:', staticPath);
console.log('📂 Exists:', fs.existsSync(staticPath));

if (!fs.existsSync(staticPath)) {
  console.error('❌ dist/public not found! Run: npm run build');
  process.exit(1);
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'static-cjs-production',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    port: port
  });
});

// JavaScript files
app.get('/assets/*.js', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(staticPath, 'assets', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('JS file not found');
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('<!DOCTYPE html>')) {
      return res.status(500).send('File corrupted');
    }
    
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(content);
  } catch (error) {
    res.status(500).send('Error reading JS file');
  }
});

// CSS files
app.get('/assets/*.css', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(staticPath, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(content);
  } else {
    res.status(404).send('CSS file not found');
  }
});

// Other assets
app.get('/assets/*', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(staticPath, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Asset not found');
  }
});

// Root
app.get('/', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexPath);
  } else {
    res.status(404).send('App not found');
  }
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/assets/') || req.path.startsWith('/api/')) {
    return res.status(404).send('Not found');
  }
  
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexPath);
  } else {
    res.status(404).send('App not found');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`🔗 Health: http://localhost:${port}/health`);
  
  // Self-test
  setTimeout(() => {
    const http = require('http');
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Self-test OK!');
      }
    });
    req.on('error', () => console.log('❌ Self-test failed'));
  }, 1000);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
EOFSERVER

    echo "   ✅ Arquivo criado!"
else
    echo "   ✅ server-static-only.cjs encontrado!"
fi

# 6. Verificar se build existe
echo "5. Verificando build..."
if [ ! -d "dist/public" ]; then
    echo "   ❌ Build não encontrado, executando..."
    npm run build
    
    if [ ! -d "dist/public" ]; then
        echo "   ❌ Build falhou!"
        exit 1
    fi
    echo "   ✅ Build concluído!"
else
    echo "   ✅ Build existe!"
fi

# 7. Iniciar servidor
echo "6. Iniciando servidor..."
pm2 start server-static-only.cjs --name "odontosync" --log-date-format="YYYY-MM-DD HH:mm:ss"

# 8. Aguardar inicialização
sleep 5

# 9. Verificar status
echo "7. Verificando status..."
pm2 status

# 10. Testar servidor
echo "8. Testando servidor..."
curl -s http://localhost:5000/health | head -3

echo ""
echo "🎉 Deploy concluído!"
echo "Teste no navegador: http://odontosync.hvrtecnologia.com.br/health"
echo ""
echo "Comandos úteis:"
echo "  pm2 logs odontosync    # Ver logs"
echo "  pm2 restart odontosync # Reiniciar"
echo "  pm2 status            # Ver status"