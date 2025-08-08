#!/usr/bin/env node

/**
 * Build personalizado para produção
 * Cria um servidor CommonJS que não terá problemas de ESM
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️ Building OdontoSync for production...');

// 1. Build do frontend (Vite)
console.log('1. Building frontend...');
execSync('vite build', { stdio: 'inherit' });

// 2. Verificar se dist/public foi criado
if (!fs.existsSync('dist/public')) {
  console.error('❌ Frontend build failed - dist/public not found');
  process.exit(1);
}

console.log('✅ Frontend build completed');

// 3. Usar o server.js existente (que já funciona)
console.log('2. Copying production server...');

if (!fs.existsSync('server.js')) {
  console.error('❌ server.js not found');
  process.exit(1);
}

// Copiar server.js para dist/
fs.copyFileSync('server.js', 'dist/server.js');

console.log('✅ Production server ready');

// 4. Criar script de start simples
const startScript = `#!/usr/bin/env node
// Production starter - bypasses problematic dist/index.js
console.log('🚀 Starting OdontoSync Production Server');
require('./server.js');
`;

fs.writeFileSync('dist/start.js', startScript);
fs.chmodSync('dist/start.js', '755');

console.log('✅ Start script created');

// 5. Verificar arquivos criados
const distFiles = fs.readdirSync('dist');
console.log('📦 Files in dist/:', distFiles);

const assetsPath = 'dist/public/assets';
if (fs.existsSync(assetsPath)) {
  const assets = fs.readdirSync(assetsPath);
  const jsFiles = assets.filter(f => f.endsWith('.js'));
  const cssFiles = assets.filter(f => f.endsWith('.css'));
  
  console.log(`📄 Assets: ${assets.length} files`);
  console.log(`   - JS: ${jsFiles.length} files`);
  console.log(`   - CSS: ${cssFiles.length} files`);
}

console.log('');
console.log('🎉 Build completed successfully!');
console.log('');
console.log('Deploy commands for production server:');
console.log('1. Copy files to server');
console.log('2. Run: npm install --production');
console.log('3. Run: pm2 start dist/start.js --name "odontosync"');
console.log('   OR: pm2 start server.js --name "odontosync"');
console.log('4. Test: curl http://localhost:5000/health');