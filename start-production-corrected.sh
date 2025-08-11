#!/bin/bash

# OdontoSync - Script de Inicialização Produção v2.1
# Para usar na porta 4001 com banco Neon correto

echo "🚀 Iniciando OdontoSync Production v2.1..."

# Configurar variáveis de ambiente para produção
export NODE_ENV=production
export PORT=4001
export DATABASE_URL="postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
export SESSION_SECRET="z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1"
export DOMAIN="odontosync.hurtecnologia.com.br"

# Verificar se o arquivo existe
if [ ! -f "production-fixed-v2.js" ]; then
    echo "❌ Arquivo production-fixed-v2.js não encontrado!"
    exit 1
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Verificar se pg está instalado
if ! npm list pg > /dev/null 2>&1; then
    echo "📦 Instalando driver pg..."
    npm install pg
fi

# Fazer build se necessário
if [ ! -d "dist" ]; then
    echo "🔨 Building application..."
    npm run build
fi

echo "✅ Configurações:"
echo "   - Porta: $PORT"
echo "   - Ambiente: $NODE_ENV"
echo "   - Domínio: $DOMAIN"
echo "   - Banco: Neon PostgreSQL"

echo ""
echo "🌐 Acesse: http://odontosync.hurtecnologia.com.br"
echo "🔐 Login: superadmin@odontosync.com / superadmin123"
echo ""

# Iniciar o servidor
node production-fixed-v2.js