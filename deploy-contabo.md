# Deploy OdontoSync na Contabo - Guia Definitivo

## Problemas Identificados e Soluções

### 🔴 Problemas Críticos Resolvidos:
1. DATABASE_URL hardcoded → Agora usa variáveis de ambiente
2. Serving de arquivos JS/CSS com Content-Type incorreto → Servidor de produção dedicado
3. Dependências de desenvolvimento em produção → Package.json otimizado
4. Falta de gerenciamento de processos → Configuração PM2
5. CORS muito permissivo → Configuração segura para produção

## Pré-requisitos na Contabo

### 1. Sistema Base (Ubuntu 20.04/22.04)
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget git nginx certbot python3-certbot-nginx -y
```

### 2. Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # deve ser v20.x.x
```

### 3. PM2 Process Manager
```bash
sudo npm install -g pm2
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## Deploy Automatizado

### 1. Script de Deploy
Execute este comando para deploy completo:
```bash
curl -sSL https://raw.githubusercontent.com/seu-repo/main/deploy-contabo-auto.sh | bash
```

### 2. Deploy Manual (Detalhado)

#### Passo 1: Preparar Diretório
```bash
sudo mkdir -p /var/www/odontosync
sudo chown -R $USER:$USER /var/www/odontosync
cd /var/www/odontosync
```

#### Passo 2: Clone e Build
```bash
# Clone (substitua pela sua URL)
git clone https://github.com/seu-usuario/odontosync.git .

# Instalar dependências
npm ci --only=production

# Build da aplicação
npm run build
```

#### Passo 3: Configurar Variáveis de Ambiente
```bash
nano .env
```

Conteúdo do .env:
```env
# Ambiente
NODE_ENV=production
PORT=4001

# Database (sua string de conexão Neon)
DATABASE_URL="postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Segurança
JWT_SECRET=sua-chave-jwt-super-secreta-aqui-min-32-chars
SESSION_SECRET=sua-chave-session-super-secreta-aqui-min-32-chars

# Domínio (opcional)
DOMAIN=seu-dominio.com
```

#### Passo 4: Iniciar com PM2
```bash
pm2 start production-server.js --name odontosync
pm2 save
```

### 3. Configurar Nginx (Proxy Reverso)
```bash
sudo nano /etc/nginx/sites-available/odontosync
```

Configuração do Nginx:
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Asset caching
    location /assets/ {
        proxy_pass http://localhost:4001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Ativar site:
```bash
sudo ln -s /etc/nginx/sites-available/odontosync /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL com Let's Encrypt
```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

### 5. Firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

## Comandos de Manutenção

### Verificar Status
```bash
pm2 status
pm2 logs odontosync
```

### Atualizar Aplicação
```bash
cd /var/www/odontosync
git pull origin main
npm ci --only=production
npm run build
pm2 restart odontosync
```

### Backup do Banco
```bash
# Backup automático (adicionar ao crontab)
0 3 * * * pg_dump $DATABASE_URL > /var/backups/odontosync-$(date +\%Y\%m\%d).sql
```

## Monitoramento

### Logs da Aplicação
```bash
pm2 logs odontosync --lines 100
```

### Logs do Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Performance
```bash
pm2 monit
htop
```

## Troubleshooting

### Problema: "Unexpected token '<'"
**Solução**: O servidor de produção já resolve isso automaticamente

### Problema: Banco não conecta
```bash
# Testar conexão
node -e "console.log(process.env.DATABASE_URL)"
```

### Problema: PM2 não reinicia
```bash
pm2 delete odontosync
pm2 start production-server.js --name odontosync
pm2 save
```

### Problema: Nginx 502
```bash
# Verificar se a app está rodando
pm2 status
# Verificar logs
pm2 logs odontosync
```

## URLs de Acesso

- **HTTP**: http://seu-dominio.com
- **HTTPS**: https://seu-dominio.com
- **Status da aplicação**: PM2 Web monitor na porta 9615

## Suporte

Em caso de problemas, verifique:
1. `pm2 status` - Se a aplicação está rodando
2. `pm2 logs odontosync` - Logs da aplicação  
3. `sudo nginx -t` - Configuração do Nginx
4. `curl http://localhost:4001` - Se a app responde localmente