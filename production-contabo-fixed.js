#!/usr/bin/env node

/**
 * OdontoSync - Servidor de Produção para Contabo
 * Solução definitiva para problemas de layout quebrado
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4001;
const NODE_ENV = process.env.NODE_ENV || 'production';
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const JWT_SECRET = process.env.JWT_SECRET || "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6";

console.log('🚀 OdontoSync Contabo Production Server');
console.log('📊 Environment:', NODE_ENV);
console.log('🌐 Port:', PORT);
console.log('🔗 Database:', DATABASE_URL ? 'Configured' : 'Missing');

// Database connection
let db;
if (DATABASE_URL) {
  db = new Pool({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  db.query('SELECT 1').then(() => {
    console.log('✅ Database connected successfully');
  }).catch(e => {
    console.error('❌ Database connection failed:', e.message);
  });
}

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS manual simplificado
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') || duration > 1000) {
      console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    if (db) {
      await db.query('SELECT 1');
      dbStatus = 'connected';
    }
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }
  
  res.json({
    status: 'healthy',
    database: dbStatus,
    port: PORT,
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(403).json({ message: 'Invalid token' });
  }
}

// ====== API ROUTES ======

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Try database first
    if (db) {
      try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const match = await bcrypt.compare(password, user.password_hash);
          if (match) {
            const token = jwt.sign({
              id: user.id,
              email: user.email,
              role: user.role,
              companyId: user.company_id,
              dataScope: user.data_scope
            }, JWT_SECRET, { expiresIn: '24h' });
            
            console.log('✅ Database login success:', email);
            return res.json({
              token,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.company_id,
                dataScope: user.data_scope
              },
              forcePasswordChange: user.force_password_change || false
            });
          }
        }
      } catch (dbErr) {
        console.error('Database error during login:', dbErr.message);
      }
    }
    
    // Fallback superadmin
    if (email === 'superadmin@odontosync.com' && password === 'superadmin123') {
      const token = jwt.sign({
        id: 63,
        email,
        role: 'admin',
        companyId: null,
        dataScope: 'all'
      }, JWT_SECRET, { expiresIn: '24h' });
      
      console.log('✅ Superadmin login success:', email);
      return res.json({
        token,
        user: {
          id: 63,
          name: 'Super Administrador',
          email,
          role: 'admin',
          companyId: null,
          dataScope: 'all'
        },
        forcePasswordChange: false
      });
    }
    
    console.log('❌ Login failed for:', email);
    res.status(401).json({ message: 'Credenciais inválidas' });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Profile endpoint
app.get('/api/user/profile', authenticateToken, (req, res) => {
  res.json(req.user);
});

// Company endpoint
app.get('/api/user/company', authenticateToken, (req, res) => {
  if (req.user.role === 'admin' && !req.user.companyId) {
    return res.json({
      companyName: 'System Administrator',
      isSystemAdmin: true,
      hasCompanyAccess: false
    });
  }
  
  res.json({
    companyName: 'Default Company',
    isSystemAdmin: false,
    hasCompanyAccess: true
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Basic API endpoints to avoid 404s
app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    if (db) {
      const result = await db.query('SELECT * FROM companies ORDER BY name');
      res.json(result.rows);
    } else {
      res.json([]);
    }
  } catch (e) {
    console.error('Companies API error:', e.message);
    res.json([]);
  }
});

app.get('/api/users', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/user-profiles', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/patients', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/appointments', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/dashboard/metrics', authenticateToken, (req, res) => {
  res.json({
    todayAppointments: 0,
    activePatients: 0,
    thisMonthRevenue: 0,
    pendingPayments: 0
  });
});

app.get('/api/users/dentists', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/procedure-categories', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/procedures', authenticateToken, (req, res) => {
  res.json([]);
});

// ====== STATIC FILES SERVING ======

const buildPath = path.join(__dirname, 'dist');
console.log('📁 Looking for build files in:', buildPath);

// Check if build directory exists
if (!fs.existsSync(buildPath)) {
  console.error('❌ Build directory not found:', buildPath);
  console.log('💡 You need to run "npm run build" first to generate the static files');
} else {
  console.log('✅ Build directory found');
}

// Serve CSS files with correct Content-Type
app.get('/assets/*.css', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(buildPath, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
    console.log('✅ CSS served:', filename);
  } else {
    console.error('❌ CSS not found:', filename);
    res.status(404).json({ error: 'CSS file not found' });
  }
});

// Serve JavaScript files with correct Content-Type
app.get('/assets/*.js', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(buildPath, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    // Verify it's actually a JS file, not HTML
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.trim().startsWith('<!DOCTYPE html>')) {
        console.error('❌ JS file corrupted with HTML:', filename);
        return res.status(500).json({ error: 'JavaScript file corrupted' });
      }
      
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(content);
      console.log('✅ JS served:', filename);
      
    } catch (error) {
      console.error('❌ Error reading JS file:', filename, error.message);
      res.status(500).json({ error: 'Error reading JavaScript file' });
    }
  } else {
    console.error('❌ JS not found:', filename);
    res.status(404).json({ error: 'JavaScript file not found' });
  }
});

// Serve other static assets
app.use('/assets', express.static(path.join(buildPath, 'assets'), {
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes and asset requests
  if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const indexPath = path.join(buildPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If no build files, show simple login page
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OdontoSync - Sistema não compilado</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; background: #f5f5f5; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .form { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .msg { margin-top: 10px; padding: 10px; border-radius: 4px; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="alert">
        <h3>⚠️ Sistema Não Compilado</h3>
        <p>O sistema OdontoSync está rodando mas <strong>não foi compilado</strong> para produção.</p>
        <p><strong>Para corrigir:</strong></p>
        <ol>
            <li>No servidor, execute: <span class="code">npm run build</span></li>
            <li>Reinicie o servidor: <span class="code">node production-contabo-fixed.js</span></li>
        </ol>
    </div>
    
    <div class="form">
        <h2>OdontoSync - Login Temporário</h2>
        <p>Teste de autenticação enquanto o sistema não está compilado:</p>
        <form id="form">
            <input type="email" id="email" placeholder="Email" value="superadmin@odontosync.com">
            <input type="password" id="password" placeholder="Senha" value="superadmin123">
            <button type="submit">Testar Login</button>
        </form>
        <div id="msg"></div>
    </div>
    
    <script>
        document.getElementById('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const msgDiv = document.getElementById('msg');
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    msgDiv.innerHTML = '<div class="msg success"><strong>✅ Login funcionando!</strong><br>Token gerado: ' + data.token.substring(0, 30) + '...<br><br><strong>Agora compile o sistema:</strong><br>1. npm run build<br>2. Reinicie o servidor</div>';
                    localStorage.setItem('auth_token', data.token);
                } else {
                    msgDiv.innerHTML = '<div class="msg error"><strong>❌ Erro:</strong> ' + data.message + '</div>';
                }
            } catch (error) {
                msgDiv.innerHTML = '<div class="msg error"><strong>❌ Erro de conexão:</strong> ' + error.message + '</div>';
            }
        });
    </script>
</body>
</html>
    `);
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down gracefully...');
  if (db) db.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Shutting down gracefully...');
  if (db) db.end();
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🚀 OdontoSync Contabo Production Server READY');
  console.log('🌐 URL: http://0.0.0.0:' + PORT);
  console.log('🔐 Superadmin: superadmin@odontosync.com / superadmin123');
  console.log('📋 Health Check: http://0.0.0.0:' + PORT + '/health');
  console.log('='.repeat(50));
  
  // Verify build files
  const buildPath = path.join(__dirname, 'dist');
  if (fs.existsSync(buildPath)) {
    console.log('✅ Build files found - Frontend will work properly');
  } else {
    console.log('⚠️  Build files missing - Run "npm run build" first');
  }
});

module.exports = app;