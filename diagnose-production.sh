#!/bin/bash

# Script de diagnóstico para produção
echo "🔍 DIAGNÓSTICO DO AMBIENTE DE PRODUÇÃO"
echo "="*50

# Verificar porta 4001
echo "📡 Verificando porta 4001..."
if curl -s http://localhost:4001/health > /dev/null 2>&1; then
    echo "✅ Porta 4001 local: ATIVA"
    curl -s http://localhost:4001/health | head -5
else
    echo "❌ Porta 4001 local: INATIVA"
fi

# Verificar porta externa
echo ""
echo "🌐 Verificando acesso externo..."
if curl -s --max-time 5 http://odontosync.hurtecnologia.com.br:4001/health > /dev/null 2>&1; then
    echo "✅ Porta 4001 externa: ATIVA"
else
    echo "❌ Porta 4001 externa: INATIVA"
fi

# Verificar processos rodando
echo ""
echo "⚙️ Processos ativos na porta 4001..."
netstat -tulnp 2>/dev/null | grep :4001 || echo "❌ Nenhum processo na porta 4001"

# Verificar arquivos de produção
echo ""
echo "📂 Arquivos de produção disponíveis:"
ls -la production-fixed*.* 2>/dev/null || echo "❌ Arquivos de produção não encontrados"

# Verificar se o banco está acessível
echo ""
echo "🗄️ Testando conexão com banco..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
pool.query('SELECT 1').then(() => console.log('✅ Banco Neon: CONECTADO')).catch(e => console.log('❌ Banco Neon:', e.message));
" 2>/dev/null

echo ""
echo "🚀 PRÓXIMOS PASSOS RECOMENDADOS:"
echo "1. Executar o servidor: node production-fixed-v2.cjs"
echo "2. Verificar firewall/proxy na porta 4001"
echo "3. Confirmar configurações de domínio"
echo ""