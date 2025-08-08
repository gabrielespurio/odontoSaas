# Guia de Deploy em Produção - OdontoSync

## Problema Identificado

O erro "SyntaxError: Unexpected token '<'" ocorre quando o servidor retorna HTML ao invés de arquivos JavaScript. Isso acontece quando:

1. O servidor não tem Content-Type correto para arquivos .js
2. A rota catch-all (SPA fallback) intercepta requests de assets
3. Arquivos JavaScript estão corrompidos com conteúdo HTML

## Solução Implementada

Criamos um servidor de produção otimizado (`production-fixed.js`) que resolve especificamente esses problemas.

## Instruções de Deploy

### 1. Preparação do Build

```bash
# No servidor ou localmente, execute:
npm run build
```

Isso criará a pasta `dist/public` com todos os arquivos otimizados.

### 2. Verificar estrutura necessária

Certifique-se de que existe:
```
dist/
├── public/
│   ├── index.html
│   └── assets/
│       ├── index-[hash].js
│       ├── index-[hash].css
│       └── outros arquivos...
```

### 3. Deploy do servidor corrigido

#### Opção A: Usar o servidor corrigido diretamente

```bash
# Copie o arquivo production-fixed.js para o servidor
# Execute:
node production-fixed.js
```

#### Opção B: Integrar ao package.json

Adicione ao `package.json`:
```json
{
  "scripts": {
    "start:production": "node production-fixed.js"
  }
}
```

### 4. Configuração de Proxy Reverso (Nginx/Apache)

#### Nginx
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Configuração específica para assets
    location /assets/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

#### Apache
```apache
<VirtualHost *:80>
    ServerName seu-dominio.com
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    ProxyPass /assets/ http://127.0.0.1:5000/assets/
    ProxyPassReverse /assets/ http://127.0.0.1:5000/assets/
    
    ProxyPass / http://127.0.0.1:5000/
    ProxyPassReverse / http://127.0.0.1:5000/
    
    <Location "/assets/">
        Header always set Cache-Control "public, max-age=31536000, immutable"
    </Location>
</VirtualHost>
```

### 5. Verificação do Deploy

#### A. Verificar saúde do servidor
```bash
curl http://localhost:5000/health
```

Deve retornar JSON com status "healthy".

#### B. Verificar arquivos JavaScript
```bash
curl -I http://localhost:5000/assets/index-[hash].js
```

Deve retornar:
```
Content-Type: application/javascript; charset=utf-8
```

#### C. Verificar no navegador
1. Abra o Developer Tools (F12)
2. Vá para Network tab
3. Recarregue a página
4. Verifique se arquivos .js têm Content-Type: "application/javascript"

## Solução de Problemas

### Se ainda aparecer erro "Unexpected token"

1. **Verificar se o build foi feito corretamente:**
```bash
ls -la dist/public/assets/
```
Deve mostrar arquivos .js e .css

2. **Verificar conteúdo dos arquivos JS:**
```bash
head -n 5 dist/public/assets/index-*.js
```
Não deve começar com `<!DOCTYPE html>`

3. **Verificar logs do servidor:**
O servidor mostra logs detalhados para debug:
- `🔥 JS REQUEST: arquivo.js` - quando JS é solicitado
- `✅ Serving JS: arquivo.js` - quando JS é servido corretamente
- `🚨 CRITICAL: File contains HTML` - quando arquivo JS está corrompido

4. **Rebuild se necessário:**
```bash
rm -rf dist/
npm run build
node production-fixed.js
```

### Se alguns módulos não carregarem

1. **Verificar se todos os assets existem:**
```bash
# Liste todos os arquivos JS no build
find dist/public/assets -name "*.js" -exec basename {} \;
```

2. **Comparar com requests no Network tab do navegador**

3. **Verificar se o bundling incluiu todos os módulos**

## Variáveis de Ambiente

```bash
# Porta do servidor (padrão: 5000)
PORT=5000

# Host do servidor (padrão: 0.0.0.0)
HOST=0.0.0.0

# Para debug adicional
DEBUG=true
```

## Monitoramento em Produção

### Logs importantes para acompanhar:

1. **Requisições de assets:**
```
[timestamp] GET /assets/index-abc123.js - IP
🔥 JS REQUEST: index-abc123.js
✅ Serving JS: index-abc123.js (12345 bytes)
```

2. **Erros críticos:**
```
🚨 CRITICAL: File index-abc123.js contains HTML instead of JavaScript!
❌ JS file not found: arquivo.js
💥 Error reading JS file: detalhes do erro
```

3. **Health check:**
```bash
# Automatizar verificação
*/5 * * * * curl -f http://localhost:5000/health || echo "Server down" | mail admin@empresa.com
```

## Backup e Rollback

1. **Backup da versão anterior:**
```bash
cp production-fixed.js production-fixed.js.backup
```

2. **Rollback se necessário:**
```bash
# Parar servidor atual
pkill -f "node production-fixed.js"

# Restaurar versão anterior
cp production-fixed.js.backup production-fixed.js
node production-fixed.js
```

## Performance em Produção

O servidor corrigido inclui:
- ✅ Cache headers otimizados
- ✅ Compressão automática
- ✅ Headers de segurança
- ✅ Logs de performance
- ✅ Graceful shutdown
- ✅ Health check endpoint

## Próximos Passos

Após o deploy, você pode:
1. Integrar com API backend
2. Configurar HTTPS/SSL
3. Adicionar CDN para assets
4. Implementar monitoring avançado
5. Configurar auto-restart (PM2, systemd)