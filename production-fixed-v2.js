#!/usr/bin/env node

/**
 * OdontoSync - Servidor de Produção v2.1
 * 
 * ✅ Corrigido para usar driver pg padrão (mais estável)
 * ✅ Content-Type correto para JS/CSS
 * ✅ API routes funcionais  
 * ✅ Database connection com Neon
 * ✅ Logs estruturados
 * ✅ Health checks
 * ✅ Graceful shutdown
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg'); // Usando driver pg padrão (mais estável)

// Configuração
const app = express();
const PORT = process.env.PORT || 4001;
const NODE_ENV = process.env.NODE_ENV || 'production';
const DOMAIN = process.env.DOMAIN || 'odontosync.hurtecnologia.com.br';
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-jwt-super-secreta-aqui-minimo-32-caracteres';
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log(`🚀 OdontoSync Production Server v2.1`);
console.log(`📊 Environment: ${NODE_ENV}`);
console.log(`🌐 Port: ${PORT}`);
console.log(`🏠 Domain: ${DOMAIN}`);
console.log(`🔗 Database: ${DATABASE_URL ? '✅ Configured' : '❌ Missing'}`);
console.log(`🔐 JWT Secret: ${JWT_SECRET !== 'sua-chave-jwt-super-secreta-aqui-minimo-32-caracteres' ? '✅ Set' : '⚠️  Default'}`);

// Database connection com driver pg (mais estável)
let db;
if (DATABASE_URL) {
  try {
    db = new Pool({ connectionString: DATABASE_URL });
    
    // Teste de conexão
    db.query('SELECT 1 as test')
      .then(() => console.log('✅ Database connection established'))
      .catch(error => console.error('❌ Database connection failed:', error.message));
      
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuração mais permissiva para produção
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      `http://${DOMAIN}`,
      `https://${DOMAIN}`,
      `http://www.${DOMAIN}`,
      `https://www.${DOMAIN}`,
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:4001'
    ];
    
    // Permitir requisições sem origin (Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
};

app.use(cors(corsOptions));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') || duration > 1000) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  
  try {
    if (db) {
      await db.query('SELECT 1');
      dbStatus = 'connected';
    }
  } catch (error) {
    dbStatus = 'error: ' + error.message;
  }
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    database: dbStatus,
    jwt: JWT_SECRET !== 'sua-chave-jwt-super-secreta-aqui-minimo-32-caracteres',
    port: PORT,
    domain: DOMAIN
  });
});

// Middleware de autenticação
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
    console.log(`❌ Invalid token: ${err.message}`);
    return res.status(403).json({ message: 'Invalid token' });
  }
}

// 🔐 API ROUTES DE AUTENTICAÇÃO
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`🔐 Login attempt: ${email}`);
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    // Primeiro, tentar buscar usuário no banco de dados
    if (db) {
      try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          
          // Verificar senha
          const passwordMatch = await bcrypt.compare(password, user.password_hash);
          
          if (passwordMatch) {
            const token = jwt.sign(
              { 
                id: user.id, 
                email: user.email, 
                role: user.role, 
                companyId: user.company_id, 
                dataScope: user.data_scope 
              },
              JWT_SECRET,
              { expiresIn: '24h' }
            );

            console.log(`✅ Database login successful: ${email}`);
            
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
      } catch (dbError) {
        console.error('❌ Database error:', dbError.message);
      }
    }
    
    // Fallback para superadmin hardcoded
    if (email === 'superadmin@odontosync.com' && password === 'superadmin123') {
      const token = jwt.sign(
        { id: 63, email, role: 'admin', companyId: null, dataScope: 'all' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log(`✅ Superadmin login successful: ${email}`);
      
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
    
    console.log(`❌ Login failed: ${email}`);
    res.status(401).json({ message: "Email/username ou senha incorretos" });
    
  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/api/user/profile', authenticateToken, (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// 🏢 API ROUTES COM DATABASE
app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    if (db) {
      const result = await db.query('SELECT * FROM companies ORDER BY name');
      res.json(result.rows);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('❌ Companies error:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (db) {
      let query = 'SELECT id, name, email, role, company_id, created_at FROM users';
      let params = [];
      
      if (req.user.dataScope !== 'all' && req.user.companyId) {
        query += ' WHERE company_id = $1';
        params = [req.user.companyId];
      }
      
      query += ' ORDER BY name';
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('❌ Users error:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/patients', authenticateToken, async (req, res) => {
  try {
    if (db) {
      let query = 'SELECT * FROM patients';
      let params = [];
      
      if (req.user.dataScope !== 'all' && req.user.companyId) {
        query += ' WHERE company_id = $1';
        params = [req.user.companyId];
      }
      
      query += ' ORDER BY name';
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('❌ Patients error:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    if (db) {
      let query = `
        SELECT 
          a.*,
          p.name as patient_name,
          u.name as dentist_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.dentist_id = u.id
      `;
      let params = [];
      
      if (req.user.dataScope !== 'all' && req.user.companyId) {
        query += ' WHERE a.company_id = $1';
        params = [req.user.companyId];
      }
      
      query += ' ORDER BY a.appointment_date, a.appointment_time';
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('❌ Appointments error:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// 📄 SERVING DE ARQUIVOS ESTÁTICOS
const publicPath = path.join(__dirname, 'dist', 'public');

if (!fs.existsSync(publicPath)) {
  console.log(`⚠️  Build directory not found: ${publicPath}`);
  console.log('💡 Serving without static files - you may need to run "npm run build"');
} else {
  console.log(`📁 Static files: ${publicPath}`);
}

// JavaScript files com Content-Type correto
app.get('/assets/*.js', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(publicPath, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes('<!DOCTYPE html>')) {
        console.error(`❌ JS file corrupted: ${filename}`);
        return res.status(500).json({ error: 'JavaScript file corrupted' });
      }
      
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      
      console.log(`✅ JS served: ${filename}`);
      return res.send(content);
      
    } catch (error) {
      console.error(`❌ Error reading JS: ${filename}`, error.message);
      return res.status(500).json({ error: 'Error reading JavaScript file' });
    }
  } else {
    console.error(`❌ JS not found: ${filename}`);
    return res.status(404).json({ error: 'JavaScript file not found' });
  }
});

// CSS files com Content-Type correto
app.get('/assets/*.css', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(publicPath, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      
      console.log(`✅ CSS served: ${filename}`);
      return res.send(content);
      
    } catch (error) {
      console.error(`❌ Error reading CSS: ${filename}`, error.message);
      return res.status(500).json({ error: 'Error reading CSS file' });
    }
  } else {
    console.error(`❌ CSS not found: ${filename}`);
    return res.status(404).json({ error: 'CSS file not found' });
  }
});

// Outros assets estáticos
if (fs.existsSync(publicPath)) {
  app.use('/assets', express.static(path.join(publicPath, 'assets'), {
    maxAge: '1y',
    etag: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    }
  }));
}

// SPA Fallback - SEMPRE POR ÚLTIMO
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    console.log(`📄 SPA served: ${req.path}`);
    res.sendFile(indexPath);
  } else {
    console.error(`❌ index.html not found: ${indexPath}`);
    res.status(404).json({ 
      error: 'Application not built',
      message: 'Please run "npm run build" first'
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  
  if (db) {
    db.end(() => {
      console.log('📊 Database connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  
  if (db) {
    db.end(() => {
      console.log('📊 Database connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`🚀 OdontoSync Production Server RUNNING`);
  console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
  console.log(`🌍 Domain: https://${DOMAIN}`);
  console.log(`🔗 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔐 JWT: ${JWT_SECRET !== 'sua-chave-jwt-super-secreta-aqui-minimo-32-caracteres' ? 'CONFIGURED' : 'DEFAULT'}`);
  console.log('='.repeat(50));
});

// Error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});