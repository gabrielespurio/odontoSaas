// Simple production fix script for OdontoSync
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// CORS for all requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const distPath = path.resolve(__dirname, 'dist', 'public');
console.log('Production Fix - Dist path:', distPath);
console.log('Production Fix - Exists:', fs.existsSync(distPath));

if (fs.existsSync(path.join(distPath, 'assets'))) {
  console.log('Production Fix - Assets files:', fs.readdirSync(path.join(distPath, 'assets')));
}

// JavaScript files with explicit Content-Type
app.get('/assets/*.js', (req, res) => {
  const fileName = path.basename(req.path);
  const filePath = path.join(distPath, 'assets', fileName);
  
  console.log(`JS Request: ${req.path} -> ${fileName}`);
  console.log(`File path: ${filePath}`);
  console.log(`Exists: ${fs.existsSync(filePath)}`);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(filePath);
  } else {
    return res.status(404).send('JS file not found');
  }
});

// CSS files
app.get('/assets/*.css', (req, res) => {
  const fileName = path.basename(req.path);
  const filePath = path.join(distPath, 'assets', fileName);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    return res.sendFile(filePath);
  } else {
    return res.status(404).send('CSS file not found');
  }
});

// Root route
app.get('/', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('Index not found');
  }
});

// Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/assets/')) {
    return res.status(404).send('Asset not found');
  }
  
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('App not found');
  }
});

const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Production fix server running on port ${port}`);
  console.log(`Test with: curl -I http://localhost:${port}/assets/index-CAC2uub-.js`);
});