const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const publicDir = path.join(__dirname, 'dist', 'public');

// JavaScript files with correct Content-Type
app.get('/assets/:filename.js', (req, res) => {
  const filename = req.params.filename + '.js';
  const filePath = path.join(publicDir, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    return res.send(content);
  } else {
    return res.status(404).send('JS file not found');
  }
});

// CSS files
app.get('/assets/:filename.css', (req, res) => {
  const filename = req.params.filename + '.css';
  const filePath = path.join(publicDir, 'assets', filename);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.set('Content-Type', 'text/css; charset=utf-8');
    return res.send(content);
  } else {
    return res.status(404).send('CSS file not found');
  }
});

// Other assets
app.use('/assets', express.static(path.join(publicDir, 'assets')));

// Root and SPA fallback
app.get('/', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('App not found');
  }
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/assets/')) {
    return res.status(404).send('Asset not found');
  }
  
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  } else {
    return res.status(404).send('App not found');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});