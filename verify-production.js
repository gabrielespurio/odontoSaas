#!/usr/bin/env node

/**
 * OdontoSync - Script de Verificação de Produção
 * 
 * Verifica se a aplicação está funcionando corretamente em produção
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4001;
const DOMAIN = process.env.DOMAIN || 'localhost';

console.log('🔍 OdontoSync - Verificação de Produção');
console.log('======================================');

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.get(url, (res) => {
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
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  const tests = [
    {
      name: 'Health Check',
      url: `http://localhost:${PORT}/health`,
      expectedStatus: 200,
      expectedContent: 'healthy'
    },
    {
      name: 'Static Files - Index HTML',
      url: `http://localhost:${PORT}/`,
      expectedStatus: 200,
      expectedContent: '<!DOCTYPE html>'
    },
    {
      name: 'API - Login Endpoint',
      url: `http://localhost:${PORT}/api/auth/login`,
      method: 'POST',
      body: JSON.stringify({
        email: 'superadmin@odontosync.com',
        password: 'superadmin123'
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      expectedStatus: 200,
      expectedContent: 'token'
    }
  ];

  console.log('\n📋 Executando testes...\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🧪 ${test.name}...`);
      
      let response;
      
      if (test.method === 'POST') {
        // Para POST requests
        response = await new Promise((resolve, reject) => {
          const url = new URL(test.url);
          const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: test.headers || {}
          };

          const req = http.request(options, (res) => {
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
          req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });

          if (test.body) {
            req.write(test.body);
          }
          
          req.end();
        });
      } else {
        response = await makeRequest(test.url);
      }

      // Verificar status code
      if (response.statusCode === test.expectedStatus) {
        console.log(`   ✅ Status: ${response.statusCode}`);
      } else {
        console.log(`   ❌ Status: ${response.statusCode} (esperado: ${test.expectedStatus})`);
        failed++;
        continue;
      }

      // Verificar conteúdo se especificado
      if (test.expectedContent) {
        if (response.data.includes(test.expectedContent)) {
          console.log(`   ✅ Conteúdo: OK`);
        } else {
          console.log(`   ❌ Conteúdo: "${test.expectedContent}" não encontrado`);
          console.log(`   📄 Resposta: ${response.data.substring(0, 200)}...`);
          failed++;
          continue;
        }
      }

      passed++;
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }

  // Verificar arquivos específicos para problema "Unexpected token"
  console.log('🔍 Verificando arquivos JavaScript...\n');

  const distDir = './dist/public/assets';
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    for (const jsFile of jsFiles) {
      console.log(`📄 Verificando ${jsFile}...`);
      
      try {
        const filePath = path.join(distDir, jsFile);
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.startsWith('<!DOCTYPE html>')) {
          console.log(`   ❌ PROBLEMA: Arquivo contém HTML em vez de JavaScript!`);
          failed++;
        } else if (content.trim().length === 0) {
          console.log(`   ❌ PROBLEMA: Arquivo está vazio!`);
          failed++;
        } else {
          console.log(`   ✅ Arquivo OK (${content.length} chars)`);
          
          // Testar via HTTP
          try {
            const jsResponse = await makeRequest(`http://localhost:${PORT}/assets/${jsFile}`);
            
            if (jsResponse.headers['content-type'] === 'application/javascript; charset=utf-8') {
              console.log(`   ✅ Content-Type correto`);
            } else {
              console.log(`   ❌ Content-Type incorreto: ${jsResponse.headers['content-type']}`);
              failed++;
            }
          } catch (error) {
            console.log(`   ❌ Erro ao acessar via HTTP: ${error.message}`);
            failed++;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Erro ao ler arquivo: ${error.message}`);
        failed++;
      }
      
      console.log('');
    }
  } else {
    console.log('❌ Diretório dist/public/assets não encontrado!');
    console.log('💡 Execute: npm run build\n');
    failed++;
  }

  // Resultado final
  console.log('📊 RESULTADO DA VERIFICAÇÃO');
  console.log('===========================');
  console.log(`✅ Testes passou: ${passed}`);
  console.log(`❌ Testes falharam: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 SUCESSO: Aplicação está funcionando perfeitamente!');
    console.log(`🌐 Acesse: http://${DOMAIN}${PORT !== 80 ? ':' + PORT : ''}`);
    console.log(`🔐 Login: superadmin@odontosync.com / superadmin123`);
    return true;
  } else {
    console.log('\n⚠️  PROBLEMAS ENCONTRADOS: Verifique os erros acima');
    console.log('💡 Dicas:');
    console.log('   - Execute: npm run build');
    console.log('   - Verifique o arquivo .env');
    console.log('   - Verifique os logs: node production-fixed.js');
    return false;
  }
}

// Executar verificação se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runTests };