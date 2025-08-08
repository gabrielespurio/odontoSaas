#!/usr/bin/env node

/**
 * Script de verificação para produção do OdontoSync
 * Testa se o servidor está funcionando corretamente e resolve o erro "Unexpected token '<'"
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 OdontoSync Production Verification');
console.log('=====================================');

// Configuração
const baseUrl = process.env.TEST_URL || 'http://localhost:5000';
const distPath = path.resolve(__dirname, 'dist', 'public');

console.log(`🌐 Testing URL: ${baseUrl}`);
console.log(`📁 Build path: ${distPath}`);
console.log('');

let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) {
    console.log(`    ${details}`);
  }
  
  if (passed) testsPassed++;
  else testsFailed++;
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  console.log('📋 Running verification tests...\n');
  
  // Test 1: Build directory exists
  const buildExists = fs.existsSync(distPath);
  logTest('Build directory exists', buildExists, buildExists ? distPath : 'Run npm run build first');
  
  if (!buildExists) {
    console.log('\n❌ Cannot continue without build directory');
    process.exit(1);
  }
  
  // Test 2: Assets directory exists
  const assetsPath = path.join(distPath, 'assets');
  const assetsExist = fs.existsSync(assetsPath);
  logTest('Assets directory exists', assetsExist, assetsExist ? assetsPath : 'Assets missing in build');
  
  if (!assetsExist) {
    console.log('\n❌ Cannot continue without assets directory');
    process.exit(1);
  }
  
  // Test 3: Find JS and CSS files
  const assetFiles = fs.readdirSync(assetsPath);
  const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
  const cssFiles = assetFiles.filter(f => f.endsWith('.css'));
  
  logTest('JavaScript files found', jsFiles.length > 0, `Found ${jsFiles.length} JS files`);
  logTest('CSS files found', cssFiles.length > 0, `Found ${cssFiles.length} CSS files`);
  
  console.log(`\n📦 Assets inventory:`);
  console.log(`   JS files: ${jsFiles.join(', ')}`);
  console.log(`   CSS files: ${cssFiles.join(', ')}`);
  console.log(`   Total assets: ${assetFiles.length}`);
  
  // Test 4: Check if JS files contain actual JavaScript (not HTML)
  for (const jsFile of jsFiles.slice(0, 3)) { // Test first 3 JS files
    const jsFilePath = path.join(assetsPath, jsFile);
    try {
      const content = fs.readFileSync(jsFilePath, 'utf8');
      const isActualJS = !content.includes('<!DOCTYPE html>') && 
                        !content.includes('<html') && 
                        !content.startsWith('<!DOCTYPE');
      
      logTest(`${jsFile} contains valid JavaScript`, isActualJS, 
        isActualJS ? 'Clean JS content' : 'CORRUPTED - Contains HTML!');
        
      if (!isActualJS) {
        console.log(`    First 100 chars: ${content.substring(0, 100)}`);
      }
    } catch (error) {
      logTest(`${jsFile} is readable`, false, error.message);
    }
  }
  
  console.log('\n🌐 Testing server endpoints...\n');
  
  try {
    // Test 5: Health check
    try {
      const healthResponse = await makeRequest(`${baseUrl}/health`);
      const isHealthy = healthResponse.statusCode === 200;
      logTest('Health check endpoint', isHealthy, 
        isHealthy ? 'Server is healthy' : `Status: ${healthResponse.statusCode}`);
        
      if (isHealthy) {
        try {
          const healthData = JSON.parse(healthResponse.data);
          console.log(`    Uptime: ${Math.round(healthData.uptime)}s`);
          console.log(`    Assets files: ${healthData.assets.files}`);
        } catch (e) {
          // Ignore JSON parse errors for health display
        }
      }
    } catch (error) {
      logTest('Health check endpoint', false, error.message);
    }
    
    // Test 6: Root endpoint returns HTML
    try {
      const rootResponse = await makeRequest(`${baseUrl}/`);
      const isHtml = rootResponse.statusCode === 200 && 
                    rootResponse.headers['content-type']?.includes('text/html');
      logTest('Root endpoint serves HTML', isHtml, 
        `Content-Type: ${rootResponse.headers['content-type']}`);
    } catch (error) {
      logTest('Root endpoint serves HTML', false, error.message);
    }
    
    // Test 7: JavaScript files served with correct Content-Type
    if (jsFiles.length > 0) {
      const testJsFile = jsFiles[0];
      try {
        const jsResponse = await makeRequest(`${baseUrl}/assets/${testJsFile}`);
        const correctContentType = jsResponse.headers['content-type'] === 'application/javascript; charset=utf-8';
        const isSuccessful = jsResponse.statusCode === 200;
        
        logTest(`JS file Content-Type (${testJsFile})`, correctContentType && isSuccessful, 
          `Status: ${jsResponse.statusCode}, Type: ${jsResponse.headers['content-type']}`);
          
        // Extra check: ensure response is not HTML
        const responseIsNotHtml = !jsResponse.data.includes('<!DOCTYPE html>') &&
                                 !jsResponse.data.includes('<html');
        logTest(`JS file content is not HTML (${testJsFile})`, responseIsNotHtml,
          responseIsNotHtml ? 'Clean JS response' : 'WARNING: HTML in JS response!');
      } catch (error) {
        logTest(`JS file accessibility (${testJsFile})`, false, error.message);
      }
    }
    
    // Test 8: CSS files served with correct Content-Type
    if (cssFiles.length > 0) {
      const testCssFile = cssFiles[0];
      try {
        const cssResponse = await makeRequest(`${baseUrl}/assets/${testCssFile}`);
        const correctContentType = cssResponse.headers['content-type'] === 'text/css; charset=utf-8';
        const isSuccessful = cssResponse.statusCode === 200;
        
        logTest(`CSS file Content-Type (${testCssFile})`, correctContentType && isSuccessful, 
          `Status: ${cssResponse.statusCode}, Type: ${cssResponse.headers['content-type']}`);
      } catch (error) {
        logTest(`CSS file accessibility (${testCssFile})`, false, error.message);
      }
    }
    
    // Test 9: 404 for non-existent assets
    try {
      const notFoundResponse = await makeRequest(`${baseUrl}/assets/non-existent-file.js`);
      const is404 = notFoundResponse.statusCode === 404;
      logTest('Non-existent asset returns 404', is404, `Status: ${notFoundResponse.statusCode}`);
    } catch (error) {
      logTest('Non-existent asset returns 404', false, error.message);
    }
    
    // Test 10: SPA fallback for routes
    try {
      const spaResponse = await makeRequest(`${baseUrl}/empresas`);
      const isSpaFallback = spaResponse.statusCode === 200 && 
                           spaResponse.headers['content-type']?.includes('text/html');
      logTest('SPA fallback works for routes', isSpaFallback, 
        `Status: ${spaResponse.statusCode}, Type: ${spaResponse.headers['content-type']}`);
    } catch (error) {
      logTest('SPA fallback works for routes', false, error.message);
    }
    
  } catch (error) {
    console.log(`\n❌ Server appears to be down: ${error.message}`);
    console.log('   Make sure to start the server first: node production-fixed.js');
  }
  
  // Summary
  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Your production setup should work correctly.');
    console.log('   The "Unexpected token \'<\'" error should be resolved.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above before deploying.');
    
    if (testsFailed > testsPassed) {
      console.log('\n🚨 Critical issues detected:');
      console.log('   1. Make sure to run "npm run build" first');
      console.log('   2. Start the server with "node production-fixed.js"');
      console.log('   3. Check server logs for detailed error messages');
    }
  }
  
  console.log('\n📝 Next steps:');
  console.log('   1. If tests pass, deploy production-fixed.js to your server');
  console.log('   2. Configure nginx/apache proxy as shown in PRODUCTION_DEPLOY_GUIDE.md');
  console.log('   3. Monitor server logs for any issues');
  console.log('   4. Test in browser to confirm the fix works');
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('\n🚨 Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n🚨 Unhandled rejection:', reason);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('\n💥 Test runner failed:', error.message);
  process.exit(1);
});