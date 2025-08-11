#!/bin/bash

# Script para iniciar servidor de produção na porta 4001
echo "🚀 INICIANDO ODONTOSYNC PRODUÇÃO - PORTA 4001"
echo "="*50

# Configurar variáveis de ambiente
export NODE_ENV=production
export PORT=4001
export DATABASE_URL="postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
export SESSION_SECRET="z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1"
export DOMAIN="odontosync.hurtecnologia.com.br"

# Parar processos existentes na porta 4001
echo "🛑 Parando processos existentes na porta 4001..."
pkill -f "production-fixed" 2>/dev/null || echo "Nenhum processo anterior encontrado"

# Verificar arquivo de produção
if [ ! -f "production-fixed-v2.cjs" ]; then
    echo "❌ Arquivo production-fixed-v2.cjs não encontrado!"
    exit 1
fi

# Instalar dependência pg se necessário
if ! node -e "require('pg')" 2>/dev/null; then
    echo "📦 Instalando driver pg..."
    npm install pg
fi

echo ""
echo "✅ CONFIGURAÇÕES:"
echo "   Port: $PORT"
echo "   Environment: $NODE_ENV" 
echo "   Domain: $DOMAIN"
echo "   Database: Neon PostgreSQL"
echo ""

# Iniciar servidor
echo "🌟 Iniciando servidor..."
echo "🌐 Acesse: http://$DOMAIN:$PORT"
echo "🔐 Login: superadmin@odontosync.com / superadmin123"
echo ""
echo "📊 Logs do servidor:"
echo "-"*30

node production-fixed-v2.cjs