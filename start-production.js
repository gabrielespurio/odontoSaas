#!/usr/bin/env node

/**
 * OdontoSync - Script de Inicialização de Produção
 * 
 * Este é o ponto de entrada principal para produção na Contabo
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

console.log('🚀 OdontoSync - Inicializando Produção');
console.log('=====================================');

// Verificar arquivos necessários
const requiredFiles = [
  './production-fixed.js',
  './dist/public/index.html',
  './.env'
];

console.log('🔍 Verificando arquivos necessários...');

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - ARQUIVO NECESSÁRIO AUSENTE`);
    
    if (file === './.env') {
      console.log('💡 Crie o arquivo .env baseado em .env.production.example');
    } else if (file === './dist/public/index.html') {
      console.log('💡 Execute: npm run build');
    }
  }
}

// Verificar variáveis de ambiente críticas
console.log('\n🔧 Verificando configurações...');

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = [];

for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} configurada`);
  } else {
    console.log(`❌ ${envVar} - VARIÁVEL AUSENTE`);
    missingVars.push(envVar);
  }
}

if (missingVars.length > 0) {
  console.log('\n❌ Configuração incompleta!');
  console.log('Configure as seguintes variáveis no arquivo .env:');
  missingVars.forEach(varName => {
    console.log(`   ${varName}=sua-configuracao-aqui`);
  });
  console.log('\nVeja o arquivo .env.production.example para exemplos');
  process.exit(1);
}

// Verificar dependências de produção
console.log('\n📦 Verificando dependências...');

const productionDeps = [
  'express',
  'cors', 
  'bcrypt',
  'jsonwebtoken',
  '@neondatabase/serverless'
];

let missingDeps = [];

for (const dep of productionDeps) {
  try {
    require.resolve(dep);
    console.log(`✅ ${dep}`);
  } catch (error) {
    console.log(`❌ ${dep} - NÃO INSTALADA`);
    missingDeps.push(dep);
  }
}

if (missingDeps.length > 0) {
  console.log('\n📥 Instalando dependências ausentes...');
  console.log('Execute: npm install ' + missingDeps.join(' '));
  
  // Tentar instalar automaticamente
  const npmInstall = spawn('npm', ['install', ...missingDeps], {
    stdio: 'inherit',
    shell: true
  });
  
  npmInstall.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependências instaladas com sucesso');
      startProduction();
    } else {
      console.log('❌ Falha ao instalar dependências');
      process.exit(1);
    }
  });
} else {
  startProduction();
}

function startProduction() {
  console.log('\n🎯 Iniciando servidor de produção...');
  console.log('=====================================\n');

  // Iniciar o servidor principal
  const serverProcess = spawn('node', ['production-fixed.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  serverProcess.on('close', (code) => {
    console.log(`\n📴 Servidor encerrado com código ${code}`);
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Erro ao iniciar servidor:', error.message);
    process.exit(1);
  });

  // Capturar sinais de encerramento
  process.on('SIGINT', () => {
    console.log('\n📴 Encerrando servidor...');
    serverProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n📴 Encerrando servidor...');
    serverProcess.kill('SIGTERM');
  });
}