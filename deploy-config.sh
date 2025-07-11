#!/bin/bash

# Script de Deploy Automatizado - OdontoSync
# Configurações específicas para o seu ambiente

# Configurações do projeto
PROJECT_NAME="odontosync"
PROJECT_DIR="/var/www/odontosync"
GITHUB_REPO="https://github.com/gabrielespurio/odontoSaas.git"
GITHUB_USER="gabrielespurio"

# Configurações do servidor
SERVER_PORT="5000"
NODE_VERSION="20"

# Configurações do banco de dados
DATABASE_URL="postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função principal de deploy
deploy_odontosync() {
    log_info "Iniciando deploy do OdontoSync..."
    
    # 1. Atualizar sistema
    log_info "Atualizando sistema..."
    sudo apt update && sudo apt upgrade -y
    
    # 2. Instalar Git
    if ! command_exists git; then
        log_info "Instalando Git..."
        sudo apt install git -y
    else
        log_info "Git já está instalado"
    fi
    
    # 3. Instalar Node.js 20
    if ! command_exists node || [[ $(node --version | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
        log_info "Instalando Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        log_info "Node.js 20+ já está instalado"
    fi
    
    # 4. Instalar PM2
    if ! command_exists pm2; then
        log_info "Instalando PM2..."
        sudo npm install -g pm2
    else
        log_info "PM2 já está instalado"
    fi
    
    # 5. Instalar Nginx
    if ! command_exists nginx; then
        log_info "Instalando Nginx..."
        sudo apt install nginx -y
        sudo systemctl start nginx
        sudo systemctl enable nginx
    else
        log_info "Nginx já está instalado"
    fi
    
    # 6. Configurar firewall
    log_info "Configurando firewall..."
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    sudo ufw allow $SERVER_PORT
    sudo ufw --force enable
    
    # 7. Clonar repositório
    if [ -d "$PROJECT_DIR" ]; then
        log_warning "Diretório $PROJECT_DIR já existe. Fazendo backup..."
        sudo mv $PROJECT_DIR "${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    fi
    
    log_info "Clonando repositório..."
    sudo mkdir -p $(dirname $PROJECT_DIR)
    cd $(dirname $PROJECT_DIR)
    
    # Se o token for fornecido, usar autenticação
    if [ -n "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
        sudo git clone https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/${GITHUB_USER}/odontoSaas.git $PROJECT_NAME
    else
        sudo git clone $GITHUB_REPO $PROJECT_NAME
    fi
    
    sudo chown -R $USER:$USER $PROJECT_DIR
    cd $PROJECT_DIR
    
    # 8. Configurar variáveis de ambiente
    log_info "Configurando variáveis de ambiente..."
    cat > .env << EOF
# Database
DATABASE_URL="${DATABASE_URL}"

# Application
NODE_ENV=production
PORT=${SERVER_PORT}

# JWT Secret (altere para uma chave segura)
JWT_SECRET=$(openssl rand -base64 32)

# Session Secret (altere para uma chave segura)
SESSION_SECRET=$(openssl rand -base64 32)
EOF
    
    # 9. Instalar dependências
    log_info "Instalando dependências..."
    npm install
    
    # 10. Instalar tsx globalmente
    log_info "Instalando tsx globalmente..."
    sudo npm install -g tsx
    
    # 11. Build da aplicação
    log_info "Fazendo build da aplicação..."
    npm run build
    
    if [ $? -ne 0 ]; then
        log_error "Erro no build da aplicação"
        exit 1
    fi
    
    # 12. Migração do banco
    log_info "Executando migrações do banco..."
    npm run db:push
    
    # 13. Criar configuração do PM2
    log_info "Criando configuração do PM2..."
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${PROJECT_NAME}',
    script: 'dist/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: ${SERVER_PORT}
    },
    instances: 1,
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
    
    # 14. Criar diretório de logs
    mkdir -p logs
    
    # 15. Iniciar aplicação com PM2
    log_info "Iniciando aplicação com PM2..."
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    # 16. Configurar Nginx
    log_info "Configurando Nginx..."
    sudo tee /etc/nginx/sites-available/$PROJECT_NAME > /dev/null << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:${SERVER_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # 17. Ativar site no Nginx
    sudo ln -sf /etc/nginx/sites-available/$PROJECT_NAME /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 18. Testar e reiniciar Nginx
    sudo nginx -t
    if [ $? -eq 0 ]; then
        sudo systemctl reload nginx
        log_info "Nginx configurado com sucesso"
    else
        log_error "Erro na configuração do Nginx"
        exit 1
    fi
    
    log_info "Deploy concluído com sucesso!"
    log_info "Aplicação disponível em: http://$(curl -s ifconfig.me || echo 'IP_DO_SERVIDOR')"
    log_info "Login padrão: admin / admin123"
    
    # Mostrar status
    echo ""
    log_info "Status dos serviços:"
    pm2 status
    echo ""
    sudo systemctl status nginx --no-pager -l
}

# Função para atualizar aplicação
update_odontosync() {
    log_info "Atualizando OdontoSync..."
    
    cd $PROJECT_DIR
    
    # Parar aplicação
    pm2 stop $PROJECT_NAME
    
    # Fazer backup
    sudo cp -r $PROJECT_DIR "/var/www/${PROJECT_NAME}_backup_$(date +%Y%m%d_%H%M%S)"
    
    # Atualizar código
    git pull origin main
    
    # Reinstalar dependências
    npm install
    
    # Rebuild
    npm run build
    
    # Migrar banco se necessário
    npm run db:push
    
    # Reiniciar aplicação
    pm2 restart $PROJECT_NAME
    
    log_info "Atualização concluída!"
}

# Função para mostrar logs
show_logs() {
    log_info "Mostrando logs da aplicação..."
    pm2 logs $PROJECT_NAME
}

# Função para mostrar status
show_status() {
    log_info "Status da aplicação:"
    pm2 status
    echo ""
    log_info "Status do Nginx:"
    sudo systemctl status nginx --no-pager -l
}

# Menu principal
case "$1" in
    deploy)
        deploy_odontosync
        ;;
    update)
        update_odontosync
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    *)
        echo "Uso: $0 {deploy|update|logs|status}"
        echo ""
        echo "Comandos disponíveis:"
        echo "  deploy  - Fazer deploy completo da aplicação"
        echo "  update  - Atualizar aplicação existente"
        echo "  logs    - Mostrar logs da aplicação"
        echo "  status  - Mostrar status dos serviços"
        exit 1
        ;;
esac