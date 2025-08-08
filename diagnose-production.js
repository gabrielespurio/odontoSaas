#!/usr/bin/env node

/**
 * Diagnóstico completo para problemas de produção do OdontoSync
 * Detecta e resolve problemas de 502 Bad Gateway e outros erros
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const http = require('http');

console.log('🔍 OdontoSync Production Diagnostics');
console.log('====================================');
console.log('');

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(type, message) {
  const color = colors[type] || colors.reset;
  const prefix = {
    error: '❌',
    success: '✅', 
    warning: '⚠️',
    info: 'ℹ️'
  }[type] || 'ℹ️';
  
  console.log(`${color}${prefix} ${message}${colors.reset}`);
}

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.request(`http://localhost:${port}/health`, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', () => resolve({ error: true }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ timeout: true });
    });
    req.end();
  });
}

async function runDiagnostics() {
  console.log('🔍 Executando diagnósticos...\n');

  // 1. Verificar se estamos no diretório correto
  log('info', 'Verificando estrutura do projeto...');
  
  const requiredFiles = ['package.json', 'production-fixed-cjs.js', 'production-fixed.js'];
  const requiredDirs = ['dist/public', 'dist/public/assets'];
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log('success', `${file} encontrado`);
    } else {
      log('error', `${file} não encontrado`);
    }
  }
  
  for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      log('success', `${dir} encontrado (${files.length} arquivos)`);
      if (dir === 'dist/public/assets') {
        const jsFiles = files.filter(f => f.endsWith('.js'));
        const cssFiles = files.filter(f => f.endsWith('.css'));
        console.log(`    - JS files: ${jsFiles.length}`);
        console.log(`    - CSS files: ${cssFiles.length}`);
      }
    } else {
      log('error', `${dir} não encontrado`);
    }
  }

  console.log('');

  // 2. Verificar processos Node.js rodando
  log('info', 'Verificando processos Node.js...');
  
  const psResult = await execPromise('ps aux | grep node | grep -v grep');
  if (psResult.stdout) {
    const nodeProcesses = psResult.stdout.trim().split('\n').filter(line => 
      line.includes('production') || line.includes('server') || line.includes('5000')
    );
    
    if (nodeProcesses.length > 0) {
      log('warning', `${nodeProcesses.length} processo(s) Node.js relacionado(s) encontrado(s):`);
      nodeProcesses.forEach(proc => {
        console.log(`    ${proc.substring(0, 100)}...`);
      });
    } else {
      log('error', 'Nenhum processo do servidor encontrado');
    }
  } else {
    log('error', 'Não foi possível verificar processos');
  }

  console.log('');

  // 3. Verificar portas em uso
  log('info', 'Verificando portas...');
  
  const netstatResult = await execPromise('netstat -tlnp 2>/dev/null | grep :5000 || ss -tlnp | grep :5000');
  if (netstatResult.stdout && netstatResult.stdout.trim()) {
    log('success', 'Porta 5000 está sendo usada:');
    console.log(`    ${netstatResult.stdout.trim()}`);
  } else {
    log('error', 'Porta 5000 não está em uso');
  }

  console.log('');

  // 4. Testar conectividade local
  log('info', 'Testando conectividade do servidor...');
  
  const healthCheck = await checkPort(5000);
  if (healthCheck.error) {
    log('error', 'Não foi possível conectar ao servidor na porta 5000');
  } else if (healthCheck.timeout) {
    log('error', 'Timeout ao conectar ao servidor');
  } else if (healthCheck.status === 200) {
    log('success', 'Servidor respondendo corretamente');
    try {
      const health = JSON.parse(healthCheck.data);
      console.log(`    Status: ${health.status}`);
      console.log(`    Uptime: ${Math.round(health.uptime)}s`);
    } catch (e) {
      console.log(`    Response: ${healthCheck.data.substring(0, 100)}...`);
    }
  } else {
    log('warning', `Servidor respondeu com status ${healthCheck.status}`);
  }

  console.log('');

  // 5. Verificar logs do sistema
  log('info', 'Verificando logs do sistema...');
  
  const journalResult = await execPromise('journalctl -u nginx --no-pager -n 10 2>/dev/null || echo "journalctl não disponível"');
  if (journalResult.stdout && !journalResult.stdout.includes('não disponível')) {
    log('info', 'Logs do nginx (últimas 10 entradas):');
    console.log(journalResult.stdout);
  }

  console.log('');

  // 6. Verificar configuração do nginx
  log('info', 'Verificando configuração do nginx...');
  
  const nginxTest = await execPromise('nginx -t 2>&1');
  if (nginxTest.error) {
    log('error', 'Erro na configuração do nginx:');
    console.log(nginxTest.stderr || nginxTest.stdout);
  } else {
    log('success', 'Configuração do nginx OK');
  }

  console.log('');

  // 7. Verificar se há erros nos arquivos JS
  log('info', 'Verificando integridade dos arquivos JavaScript...');
  
  if (fs.existsSync('dist/public/assets')) {
    const jsFiles = fs.readdirSync('dist/public/assets').filter(f => f.endsWith('.js'));
    
    for (const jsFile of jsFiles.slice(0, 3)) {
      const filePath = path.join('dist/public/assets', jsFile);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
          log('error', `${jsFile} está corrompido (contém HTML)`);
        } else if (content.length < 100) {
          log('warning', `${jsFile} muito pequeno (${content.length} bytes)`);
        } else {
          log('success', `${jsFile} OK (${content.length} bytes)`);
        }
      } catch (error) {
        log('error', `Erro ao ler ${jsFile}: ${error.message}`);
      }
    }
  }

  console.log('');
  console.log('🔧 SOLUÇÕES RECOMENDADAS');
  console.log('========================');
  
  // Gerar recomendações baseadas no diagnóstico
  if (!fs.existsSync('dist/public')) {
    console.log('1. ❗ CRITICAL: Execute o build:');
    console.log('   npm run build');
    console.log('');
  }

  const healthCheck2 = await checkPort(5000);
  if (healthCheck2.error || healthCheck2.timeout) {
    console.log('2. ❗ CRITICAL: Inicie o servidor:');
    console.log('   # Mate processos antigos');
    console.log('   pkill -f "node.*production"');
    console.log('   ');
    console.log('   # Inicie o servidor corrigido');
    console.log('   nohup node production-fixed-cjs.js > server.log 2>&1 &');
    console.log('   ');
    console.log('   # Ou use PM2 para gerenciamento');
    console.log('   npm install -g pm2');
    console.log('   pm2 start production-fixed-cjs.js --name "odontosync"');
    console.log('');
  }

  console.log('3. 🔍 Verificar se funcionou:');
  console.log('   curl http://localhost:5000/health');
  console.log('   # Deve retornar JSON com status "healthy"');
  console.log('');

  console.log('4. 🔄 Reiniciar nginx se necessário:');
  console.log('   sudo systemctl reload nginx');
  console.log('   # ou');
  console.log('   sudo service nginx reload');
  console.log('');

  console.log('5. 📋 Monitorar logs:');
  console.log('   tail -f server.log');
  console.log('   # ou se usando PM2:');
  console.log('   pm2 logs odontosync');
  console.log('');

  console.log('6. 🧪 Testar manualmente:');
  console.log('   curl -I http://localhost:5000/assets/[nome-do-arquivo].js');
  console.log('   # Deve retornar Content-Type: application/javascript');
  console.log('');
}

// Executar diagnósticos
runDiagnostics().catch(error => {
  console.error('💥 Erro durante diagnóstico:', error.message);
  process.exit(1);
});