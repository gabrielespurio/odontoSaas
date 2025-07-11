# Guia de Deploy - OdontoSync no Ubuntu (Contabo)

## Análise do Projeto

O OdontoSync é um sistema SaaS de gestão odontológica com:
- **Backend**: Node.js 20 + Express + TypeScript
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM
- **Autenticação**: JWT + bcrypt
- **Porta**: 5000 (configurada para produção)

## Pré-requisitos do Sistema

### 1. Atualização do Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalação do Git
```bash
sudo apt install git -y
git --version
```

### 3. Instalação do Node.js 20
```bash
# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar versões
node --version  # deve ser v20.x.x
npm --version
```

### 4. Instalação do PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 5. Instalação do Nginx (Proxy Reverso)
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6. Configuração do Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000  # Porta da aplicação
sudo ufw enable
```

## Processo de Deploy

### 1. Clone do Repositório
```bash
# Navegar para o diretório desejado
cd /var/www/

# Clonar o repositório com token de acesso
sudo git clone https://GITHUB_PERSONAL_ACCESS_TOKEN@github.com/gabrielespurio/odontoSaas.git
sudo mv odontoSaas odontosync
sudo chown -R $USER:$USER /var/www/odontosync
cd /var/www/odontosync
```

### 2. Configuração das Variáveis de Ambiente
```bash
# Criar arquivo .env
nano .env
```

**Conteúdo do .env:**
```env
# Database
DATABASE_URL="postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Application
NODE_ENV=production
PORT=5000

# JWT Secret (gerar uma nova chave segura)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Session Secret (gerar uma nova chave segura)
SESSION_SECRET=your-super-secure-session-secret-key-here
```

### 3. Instalação das Dependências
```bash
# Instalar dependências
npm install

# Verificar se tsx está instalado globalmente (necessário para produção)
npm install -g tsx
```

### 4. Build da Aplicação
```bash
# Fazer build do frontend e backend
npm run build

# Verificar se os arquivos foram gerados
ls -la dist/
```

### 5. Migração do Banco de Dados
```bash
# Executar migrações do Drizzle
npm run db:push
```

### 6. Configuração do PM2
```bash
# Criar arquivo de configuração do PM2
nano ecosystem.config.js
```

**Conteúdo do ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'odontosync',
    script: 'dist/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
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
```

### 7. Criar Diretório de Logs
```bash
mkdir logs
```

### 8. Iniciar a Aplicação com PM2
```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs
pm2 logs odontosync

# Salvar configuração do PM2
pm2 save
pm2 startup
```

### 9. Configuração do Nginx
```bash
# Criar configuração do site
sudo nano /etc/nginx/sites-available/odontosync
```

**Conteúdo da configuração do Nginx:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;  # Substitua pelo seu domínio

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 10. Ativar Site no Nginx
```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/odontosync /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar nginx
sudo systemctl reload nginx
```

## Comandos Úteis de Manutenção

### PM2 Commands
```bash
# Verificar status
pm2 status

# Reiniciar aplicação
pm2 restart odontosync

# Parar aplicação
pm2 stop odontosync

# Ver logs em tempo real
pm2 logs odontosync --lines 50

# Monitorar recursos
pm2 monit
```

### Atualização da Aplicação
```bash
cd /var/www/odontosync

# Fazer backup
pm2 stop odontosync
cp -r /var/www/odontosync /var/www/odontosync-backup-$(date +%Y%m%d)

# Atualizar código
git pull origin main

# Reinstalar dependências (se necessário)
npm install

# Rebuild
npm run build

# Migrar banco (se necessário)
npm run db:push

# Reiniciar aplicação
pm2 restart odontosync
```

### Logs e Monitoramento
```bash
# Logs da aplicação
pm2 logs odontosync

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Status do sistema
sudo systemctl status nginx
pm2 status
```

## Configuração SSL (Opcional - Recomendado)

### 1. Instalar Certbot
```bash
sudo apt install snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 2. Obter Certificado SSL
```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

### 3. Renovação Automática
```bash
# Testar renovação
sudo certbot renew --dry-run

# Configurar renovação automática
sudo crontab -e
# Adicionar linha: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Solução de Problemas

### 1. Aplicação não inicia
```bash
# Verificar logs
pm2 logs odontosync

# Verificar se a porta está disponível
sudo netstat -tlnp | grep 5000

# Verificar variáveis de ambiente
pm2 show odontosync
```

### 2. Erro de conexão com banco
```bash
# Testar conexão manualmente
node -e "
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: 'sua-connection-string' });
pool.query('SELECT NOW()').then(res => console.log(res.rows[0])).catch(err => console.error(err));
"
```

### 3. Problemas de build
```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## Acesso ao Sistema

Após o deploy bem-sucedido:
- **URL**: `http://seu-dominio.com` ou `http://ip-do-servidor`
- **Login padrão**: admin / admin123
- **Porta**: 5000 (proxied via Nginx na porta 80/443)

## Checklist de Verificação

- [ ] Node.js 20 instalado
- [ ] Git instalado e repositório clonado
- [ ] Dependências instaladas
- [ ] Arquivo .env configurado
- [ ] Build realizado com sucesso
- [ ] Banco de dados migrado
- [ ] PM2 configurado e aplicação rodando
- [ ] Nginx configurado e proxy funcionando
- [ ] Firewall configurado
- [ ] SSL configurado (opcional)
- [ ] Logs sendo gerados corretamente
- [ ] Sistema acessível via navegador

## Notas Importantes

1. **Segurança**: Altere as chaves JWT_SECRET e SESSION_SECRET para valores seguros
2. **Backup**: Configure backup regular do banco de dados
3. **Monitoramento**: Configure alertas para monitorar o sistema
4. **Domínio**: Aponte seu domínio para o IP do servidor
5. **Atualizações**: Mantenha o sistema sempre atualizado

Este guia cobre todos os aspectos necessários para um deploy profissional e seguro do OdontoSync.