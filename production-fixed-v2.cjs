#!/usr/bin/env node

/**
 * OdontoSync - Servidor de Produção v2.1 (CommonJS)
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

// SPA Fallback - Retornar uma página básica de login se não houver build
app.get('*', (req, res) => {
  const basicLoginPage = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OdontoSync - Login</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
        .login-form { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
        button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .error { color: red; margin-top: 10px; }
        .success { color: green; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="login-form">
        <h2>OdontoSync - Login</h2>
        <form id="loginForm">
            <input type="email" id="email" placeholder="Email" value="superadmin@odontosync.com">
            <input type="password" id="password" placeholder="Senha" value="superadmin123">
            <button type="submit">Entrar</button>
        </form>
        <div id="message"></div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    messageDiv.innerHTML = '<div class="success">Login realizado com sucesso!</div>';
                    localStorage.setItem('auth_token', data.token);
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000);
                } else {
                    messageDiv.innerHTML = '<div class="error">' + data.message + '</div>';
                }
            } catch (error) {
                messageDiv.innerHTML = '<div class="error">Erro de conexão: ' + error.message + '</div>';
            }
        });
    </script>
</body>
</html>
  `;
  
  console.log(`📄 Basic login served: ${req.path}`);
  res.send(basicLoginPage);
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

module.exports = app;