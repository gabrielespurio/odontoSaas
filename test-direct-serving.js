// Direct test of file serving
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

const distPath = path.resolve(__dirname, 'dist', 'public');
console.log('Direct test - Dist path:', distPath);

// Test route for specific file
app.get('/test-js', (req, res) => {
  const jsFiles = fs.readdirSync(path.join(distPath, 'assets')).filter(f => f.endsWith('.js'));
  const jsFile = jsFiles[0]; // Get the first JS file
  
  if (jsFile) {
    const filePath = path.join(distPath, 'assets', jsFile);
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log('JS file:', jsFile);
    console.log('Content type check:', content.includes('<!DOCTYPE html>') ? 'HTML' : 'JavaScript');
    console.log('Size:', content.length);
    console.log('First 200 chars:', content.substring(0, 200));
    
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(content);
  } else {
    res.status(404).send('No JS file found');
  }
});

// JavaScript handler
app.get('/assets/*.js', (req, res) => {
  const filename = path.basename(req.path);
  const filePath = path.join(distPath, 'assets', filename);
  
  console.log('JS request:', filename);
  console.log('Full path:', filePath);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('Content preview:', content.substring(0, 100));
    
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(content);
  } else {
    console.log('Available files:', fs.readdirSync(path.join(distPath, 'assets')));
    res.status(404).send('Not found');
  }
});

app.listen(4000, () => {
  console.log('Direct test server on port 4000');
  console.log('Test: curl http://localhost:4000/test-js');
});