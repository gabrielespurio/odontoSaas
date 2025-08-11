#!/bin/bash

# OdontoSync - Deploy Automatizado para Contabo
# Este script realiza deploy completo da aplicação

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

log_info "🚀 OdontoSync - Deploy Automatizado Contabo"
echo "=================================================="

# Verificar se está executando como root
if [[ $EUID -eq 0 ]]; then
   log_error "Este script não deve ser executado como root"
   log_info "Execute: curl -sSL script-url | bash"
   exit 1
fi

# Configurações (personalize aqui)
DOMAIN=${DOMAIN:-"seu-dominio.com"}
DATABASE_URL=${DATABASE_URL:-""}
JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)}
SESSION_SECRET=${SESSION_SECRET:-$(openssl rand -hex 32)}
GIT_REPO=${GIT_REPO:-"https://github.com/seu-usuario/odontosync.git"}
INSTALL_PATH="/var/www/odontosync"

log_info "Configurações do deploy:"
echo "  - Porta: 5001"
echo "  - Domínio: $DOMAIN"
echo "  - Caminho: $INSTALL_PATH"
echo "  - Repositório: $GIT_REPO"

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Verificar/Instalar dependências do sistema
log_info "Verificando dependências do sistema..."

if ! command_exists curl; then
    log_info "Instalando curl..."
    sudo apt update && sudo apt install -y curl
fi

if ! command_exists git; then
    log_info "Instalando git..."
    sudo apt install -y git
fi

if ! command_exists node; then
    log_info "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command_exists pm2; then
    log_info "Instalando PM2..."
    sudo npm install -g pm2
    pm2 startup ubuntu -u $USER --hp $HOME
fi

if ! command_exists nginx; then
    log_info "Instalando Nginx..."
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
fi

log_success "Dependências verificadas/instaladas"

# 2. Configurar diretório da aplicação
log_info "Configurando diretório da aplicação..."

if [ -d "$INSTALL_PATH" ]; then
    log_warning "Diretório já existe, fazendo backup..."
    sudo mv "$INSTALL_PATH" "${INSTALL_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
fi

sudo mkdir -p "$INSTALL_PATH"
sudo chown -R $USER:$USER "$INSTALL_PATH"

# 3. Clonar repositório
log_info "Clonando repositório..."
cd "$(dirname $INSTALL_PATH)"
git clone "$GIT_REPO" "$(basename $INSTALL_PATH)"
cd "$INSTALL_PATH"

# 4. Configurar variáveis de ambiente
log_info "Configurando variáveis de ambiente..."

if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL não configurada!"
    log_info "Configure: export DATABASE_URL='sua-string-de-conexao'"
    exit 1
fi

cat > .env << EOF
# Ambiente
NODE_ENV=production
PORT=5001

# Database
DATABASE_URL="$DATABASE_URL"

# Segurança
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# Domínio
DOMAIN=$DOMAIN
EOF

log_success "Arquivo .env criado"

# 5. Instalar dependências e fazer build
log_info "Instalando dependências..."
npm ci --only=production

log_info "Fazendo build da aplicação..."
npm run build

# Verificar se build foi bem-sucedido
if [ ! -d "dist/public" ]; then
    log_error "Build falhou - diretório dist/public não encontrado"
    exit 1
fi

log_success "Build concluído"

# 6. Configurar logs
log_info "Configurando logs..."
sudo mkdir -p /var/log/odontosync
sudo chown -R $USER:$USER /var/log/odontosync

# 7. Configurar PM2
log_info "Configurando PM2..."
pm2 start ecosystem.config.js --env production
pm2 save

log_success "Aplicação iniciada com PM2"

# 8. Configurar Nginx
log_info "Configurando Nginx..."

sudo tee /etc/nginx/sites-available/odontosync > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Static assets caching
    location /assets/ {
        proxy_pass http://localhost:5001;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:5001/health;
        access_log off;
    }
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/odontosync /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
if ! sudo nginx -t; then
    log_error "Configuração do Nginx inválida"
    exit 1
fi

sudo systemctl restart nginx
log_success "Nginx configurado e reiniciado"

# 9. Configurar firewall
log_info "Configurando firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw --force enable

# 10. Configurar SSL (Let's Encrypt)
if command_exists certbot; then
    log_info "Configurando SSL..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    log_success "SSL configurado"
else
    log_warning "Certbot não encontrado, SSL não configurado"
    log_info "Instale com: sudo apt install certbot python3-certbot-nginx"
fi

# 11. Verificações finais
log_info "Realizando verificações finais..."

# Verificar se aplicação está rodando
if ! curl -f http://localhost:5001/health > /dev/null 2>&1; then
    log_error "Aplicação não está respondendo na porta 5001"
    pm2 logs odontosync --lines 20
    exit 1
fi

# Verificar se Nginx está funcionando
if ! curl -f http://localhost > /dev/null 2>&1; then
    log_error "Nginx não está funcionando"
    exit 1
fi

# 12. Configurar backup automático (opcional)
log_info "Configurando backup automático..."

# Criar script de backup
sudo tee /usr/local/bin/odontosync-backup.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/odontosync"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup do código
tar -czf $BACKUP_DIR/code_$DATE.tar.gz -C /var/www/odontosync .

# Backup do banco (se possível)
if [ ! -z "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" > $BACKUP_DIR/database_$DATE.sql
fi

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/odontosync-backup.sh

# Adicionar ao crontab (backup diário às 3:00)
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/odontosync-backup.sh") | crontab -

log_success "Backup automático configurado"

# Resultado final
echo ""
log_success "🎉 Deploy concluído com sucesso!"
echo ""
echo "📊 Informações do deploy:"
echo "  ✅ Aplicação: http://$DOMAIN"
echo "  ✅ SSL: $([ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && echo "Configurado" || echo "Não configurado")"
echo "  ✅ Status: $(curl -s http://localhost:5001/health | jq -r .status 2>/dev/null || echo "Verificar manualmente")"
echo ""
echo "🛠️  Comandos úteis:"
echo "  pm2 status              # Status da aplicação"
echo "  pm2 logs odontosync     # Logs da aplicação"
echo "  pm2 restart odontosync  # Reiniciar aplicação"
echo "  sudo nginx -s reload    # Recarregar Nginx"
echo "  curl http://localhost:5001/health  # Health check"
echo ""
echo "📁 Arquivos importantes:"
echo "  Aplicação: $INSTALL_PATH"
echo "  Logs: /var/log/odontosync/"
echo "  Nginx: /etc/nginx/sites-available/odontosync"
echo "  SSL: /etc/letsencrypt/live/$DOMAIN/"
echo ""

# Teste final
log_info "Executando teste final..."
if curl -s "http://$DOMAIN/health" | grep -q "healthy"; then
    log_success "🚀 Aplicação está funcionando perfeitamente!"
    echo "   Acesse: http://$DOMAIN"
else
    log_warning "⚠️  Aplicação pode não estar totalmente funcional"
    log_info "Verifique os logs: pm2 logs odontosync"
fi

echo ""
log_info "Deploy finalizado! 🎯"