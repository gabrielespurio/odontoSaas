#!/usr/bin/env node

/**
 * OdontoSync - Servidor de Produção Simplificado
 * Para porta 4001 com banco Neon
 */

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4001;
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const JWT_SECRET = process.env.JWT_SECRET || "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6";

console.log('🚀 OdontoSync Production Server Starting...');
console.log('🌐 Port:', PORT);
console.log('🔗 Database:', DATABASE_URL ? 'Configured' : 'Missing');

// Database
let db;
if (DATABASE_URL) {
  db = new Pool({ connectionString: DATABASE_URL });
  db.query('SELECT 1').then(() => console.log('✅ Database connected')).catch(e => console.log('❌ DB Error:', e.message));
}

// Middleware
app.use(express.json());

// CORS manual (simples)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
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
    dbStatus = 'error';
  }
  
  res.json({
    status: 'healthy',
    database: dbStatus,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(403).json({ message: 'Invalid token' });
  }
}

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
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
            
            console.log('✅ DB login success:', email);
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
        console.error('DB error:', dbErr.message);
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
      
      console.log('✅ Superadmin login:', email);
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
    
    console.log('❌ Login failed:', email);
    res.status(401).json({ message: 'Credenciais inválidas' });
    
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Profile endpoint
app.get('/api/user/profile', auth, (req, res) => {
  res.json(req.user);
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

// Basic API endpoints
app.get('/api/companies', auth, async (req, res) => {
  try {
    if (db) {
      const result = await db.query('SELECT * FROM companies ORDER BY name');
      res.json(result.rows);
    } else {
      res.json([]);
    }
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Simple login page for fallback
app.get('*', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>OdontoSync - Login</title>
    <style>
        body { font-family: Arial; max-width: 400px; margin: 100px auto; padding: 20px; }
        .form { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
        button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; }
        .msg { margin-top: 10px; padding: 10px; border-radius: 4px; }
        .error { background: #f8d7da; color: #721c24; }
        .success { background: #d4edda; color: #155724; }
    </style>
</head>
<body>
    <div class="form">
        <h2>OdontoSync</h2>
        <form id="form">
            <input type="email" id="email" placeholder="Email" value="superadmin@odontosync.com">
            <input type="password" id="password" placeholder="Senha" value="superadmin123">
            <button type="submit">Entrar</button>
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
                    msgDiv.innerHTML = '<div class="msg success">Login realizado! Token: ' + data.token.substring(0, 20) + '...</div>';
                    localStorage.setItem('auth_token', data.token);
                } else {
                    msgDiv.innerHTML = '<div class="msg error">' + data.message + '</div>';
                }
            } catch (error) {
                msgDiv.innerHTML = '<div class="msg error">Erro: ' + error.message + '</div>';
            }
        });
    </script>
</body>
</html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(40));
  console.log('🚀 OdontoSync Production RUNNING');
  console.log('🌐 http://0.0.0.0:' + PORT);
  console.log('🔐 superadmin@odontosync.com / superadmin123');
  console.log('='.repeat(40));
});

module.exports = app;