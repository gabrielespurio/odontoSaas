#!/bin/bash

# Script para criar arquivo .env na VPS Contabo
# Execute este script no seu servidor: bash create-env-contabo.sh

echo "🚀 Criando arquivo .env para OdontoSync na Contabo..."

# Criar arquivo .env
cat > .env << 'EOF'
# OdontoSync - Produção Contabo
NODE_ENV=production
PORT=4001

# Database Neon PostgreSQL
DATABASE_URL=postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Segurança
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
SESSION_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1

# Domínio
DOMAIN=odontosync.hurtecnologia.com.br

# Configurações extras
BACKUP_ENABLED=true
LOG_LEVEL=info
EOF

# Verificar se foi criado
if [ -f .env ]; then
    echo "✅ Arquivo .env criado com sucesso!"
    echo "📋 Conteúdo:"
    cat .env
    echo ""
    echo "🔐 Permissões configuradas (somente proprietário pode ler):"
    chmod 600 .env
    ls -la .env
else
    echo "❌ Erro ao criar arquivo .env"
    exit 1
fi

echo ""
echo "🎯 Próximos passos:"
echo "1. npm run build"
echo "2. node production-contabo-fixed.js"
echo ""
echo "✅ Arquivo .env pronto para produção!"