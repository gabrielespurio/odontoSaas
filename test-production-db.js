#!/usr/bin/env node

/**
 * Script para testar conexão do ambiente de produção com banco Neon
 */

import pkg from 'pg';
const { Pool } = pkg;

const DATABASE_URL = "postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log('🔍 Testando conexão com banco Neon para produção...');
console.log('🌐 DATABASE_URL configurado:', DATABASE_URL ? 'SIM' : 'NÃO');

// Teste: Usando o driver padrão do PostgreSQL
async function testWithPg() {
  try {
    const pool = new Pool({ connectionString: DATABASE_URL });
    
    console.log('📊 Testando com driver pg...');
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Conexão PG OK:', result.rows[0]);
    
    // Testar usuário superadmin
    const userResult = await pool.query('SELECT id, email, role FROM users WHERE email = $1', ['superadmin@odontosync.com']);
    console.log('👤 Usuário superadmin:', userResult.rows.length > 0 ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    if (userResult.rows.length > 0) {
      console.log('📧 Dados:', userResult.rows[0]);
    }
    
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Erro com driver pg:', error.message);
    return false;
  }
}

// Executar teste
async function runTests() {
  console.log('='.repeat(50));
  
  const pgResult = await testWithPg();
  console.log('='.repeat(50));
  
  if (pgResult) {
    console.log('✅ RESULTADO: Conexão com banco funcionando!');
    console.log('💡 Banco Neon conectado com sucesso');
  } else {
    console.log('❌ RESULTADO: Falha na conexão com banco');
    console.log('🔧 Verifique a string de conexão e as configurações de rede');
  }
}

runTests().catch(console.error);