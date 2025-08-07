#!/usr/bin/env node
// Simple Express server that ONLY serves static files correctly

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Basic middleware
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const publicDir = path.resolve(__dirname, 'dist', 'public');

console.log('🔧 Simple Static Server');
console.log('📁 Serving from:', publicDir);

// Direct file serving for JavaScript with exact path matching
app.get('/assets/index-DSlahus0.js', (req, res) => {
  const filePath = path.join(publicDir, 'assets', 'index-DSlahus0.js');
  
  console.log('📄 Direct JS request for index-DSlahus0.js');
  console.log('📂 Full path:', filePath);
  
  if (fs.existsSync(filePath)) {
    console.log('✅ File exists, reading...');
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log('📊 File size:', fileContent.length, 'chars');
    console.log('🔍 First 50 chars:', fileContent.substring(0, 50));
    
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Length', Buffer.byteLength(fileContent, 'utf8'));
    
    console.log('✅ Sending JavaScript file with correct headers');
    return res.send(fileContent);
  } else {
    console.log('❌ File not found');
    return res.status(404).send('JS file not found');
  }
});

// Wildcard JS handler
app.get('/assets/*.js', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(publicDir, 'assets', filename);
  
  console.log('📄 JS request for:', filename);
  
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    
    console.log('✅ Serving JS:', filename);
    return res.send(fileContent);
  } else {
    return res.status(404).send('JS file not found');
  }
});

// CSS files
app.get('/assets/*.css', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(publicDir, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.send(fileContent);
  } else {
    return res.status(404).send('CSS file not found');
  }
});

// Other assets
app.get('/assets/*', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(publicDir, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  } else {
    return res.status(404).send('Asset not found');
  }
});

// Root
app.get('/', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('App not found');
  }
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/assets/')) {
    return res.status(404).send('Asset not found');
  }
  
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('App not found');
  }
});

const port = process.env.PORT || 3001;
app.listen(port, '0.0.0.0', () => {
  console.log(`🎯 Simple server running on port ${port}`);
  console.log(`📱 Test: curl -I http://localhost:${port}/assets/index-DSlahus0.js`);
});

process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down...');
  process.exit(0);
});