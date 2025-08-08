# DEPLOY DE EMERGÊNCIA - Resolver 502 Bad Gateway

## 🚨 SITUAÇÃO CRÍTICA

O erro 502 Bad Gateway indica que o nginx não consegue conectar ao servidor Node.js. Vamos resolver isso de forma definitiva.

## 📋 CHECKLIST DE DEPLOY DE EMERGÊNCIA

Execute estes comandos **exatamente nesta ordem** no servidor de produção:

### 1. 🔍 DIAGNÓSTICO IMEDIATO

```bash
# Verificar se algum processo Node está rodando
ps aux | grep node

# Verificar porta 5000
netstat -tlnp | grep :5000

# Testar conectividade básica
curl -v http://localhost:5000/health 2>&1 | head -20
```

### 2. 🛑 PARAR TODOS OS PROCESSOS

```bash
# Matar TODOS os processos Node
sudo pkill -f node
sleep 3

# Verificar se parou
ps aux | grep node
```

### 3. 🔄 ATUALIZAR CÓDIGO

```bash
# Pull das correções
git pull origin main

# Verificar se os arquivos chegaram
ls -la emergency-server.js diagnose-production.js
```

### 4. 🏗️ BUILD FORÇADO

```bash
# Limpar build antigo
rm -rf dist/

# Build novo
npm run build

# Verificar se deu certo
ls -la dist/public/
ls -la dist/public/assets/ | head -10
```

### 5. 🚨 INICIAR SERVIDOR DE EMERGÊNCIA

```bash
# Dar permissão
chmod +x emergency-server.js

# Iniciar servidor de emergência
node emergency-server.js
```

**DEIXE ESTE TERMINAL ABERTO** para ver os logs em tempo real.

### 6. 🧪 TESTE IMEDIATO (em outro terminal)

```bash
# Teste básico
curl http://localhost:5000/health

# Deve retornar algo como:
# {
#   "status": "healthy",
#   "server": "emergency-server",
#   "timestamp": "2025-01-08T...",
#   "pid": 12345
# }
```

Se o teste passou, **o problema está resolvido!**

### 7. 🌍 TESTE NO NAVEGADOR

Acesse: `http://odontosync.hvrtecnologia.com.br/health`

Deve mostrar o JSON de saúde do servidor.

Em seguida: `http://odontosync.hvrtecnologia.com.br/`

Deve carregar a aplicação normalmente.

## 🔧 SE AINDA NÃO FUNCIONAR

### Opção A: Verificar Nginx

```bash
# Teste configuração nginx
sudo nginx -t

# Se der erro, verificar arquivo de configuração
sudo nano /etc/nginx/sites-available/odontosync

# Deve ter algo como:
# server {
#     listen 80;
#     server_name odontosync.hvrtecnologia.com.br;
#     
#     location / {
#         proxy_pass http://127.0.0.1:5000;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#     }
# }

# Recarregar nginx
sudo systemctl reload nginx
```

### Opção B: Testar Diretamente na Porta

Se o nginx estiver com problema, teste diretamente:

```bash
# Parar nginx temporariamente
sudo systemctl stop nginx

# Iniciar servidor na porta 80 (precisa de sudo)
sudo PORT=80 node emergency-server.js

# Testar no navegador (sem nginx):
# http://odontosync.hvrtecnologia.com.br/
```

### Opção C: Usar PM2 para Persistência

```bash
# Instalar PM2 se não tiver
npm install -g pm2

# Parar servidor atual
sudo pkill -f emergency-server

# Iniciar com PM2
pm2 start emergency-server.js --name "odontosync-emergency"

# Verificar status
pm2 status

# Ver logs em tempo real
pm2 logs odontosync-emergency

# Configurar para iniciar automaticamente
pm2 startup
pm2 save
```

## 🚀 SCRIPT AUTOMÁTICO

Se quiser automatizar tudo, execute:

```bash
#!/bin/bash
echo "🚨 EMERGENCY DEPLOY SCRIPT"

# 1. Parar processos
sudo pkill -f node
sleep 3

# 2. Update
git pull origin main

# 3. Build
rm -rf dist/
npm run build

# 4. Start emergency server
chmod +x emergency-server.js
pm2 stop all 2>/dev/null
pm2 start emergency-server.js --name "odontosync-emergency"

# 5. Test
sleep 5
curl http://localhost:5000/health

echo "✅ Emergency deploy completed!"
echo "Test: http://odontosync.hvrtecnologia.com.br/health"
```

## 📊 MONITORAMENTO

### Logs em Tempo Real:
```bash
# Se rodando diretamente
tail -f nohup.out

# Se usando PM2
pm2 logs odontosync-emergency --lines 100
```

### Status do Servidor:
```bash
# Verificação contínua
watch -n 5 "curl -s http://localhost:5000/health | jq"
```

## 🎯 GARANTIAS DO SERVIDOR DE EMERGÊNCIA

O `emergency-server.js` é um servidor HTTP puro (não Express) que:

✅ **Nunca falha por dependências** - usa apenas módulos nativos do Node.js  
✅ **Logs detalhados** - mostra exatamente o que está acontecendo  
✅ **Auto-teste integrado** - verifica se está funcionando ao iniciar  
✅ **Cache inteligente** - arquivos ficam em memória para performance  
✅ **Verificação de integridade** - detecta arquivos JS corrompidos  
✅ **CORS correto** - funciona com qualquer frontend  
✅ **Headers otimizados** - Content-Type sempre correto  

## ❓ TROUBLESHOOTING

### Problema: "Port already in use"
```bash
lsof -i :5000
sudo kill [PID]
```

### Problema: "Permission denied"
```bash
chmod +x emergency-server.js
sudo chown $USER:$USER emergency-server.js
```

### Problema: "dist/public not found"
```bash
npm run build
ls -la dist/public/
```

### Problema: Nginx ainda dá 502
```bash
# Verificar se nginx consegue acessar localhost
curl -v http://127.0.0.1:5000/health

# Ver logs do nginx
sudo tail -f /var/log/nginx/error.log

# Reiniciar nginx
sudo systemctl restart nginx
```

## ✅ CONFIRMAÇÃO FINAL

Após o deploy, estes testes devem passar:

1. ✅ `curl http://localhost:5000/health` → JSON com "status": "healthy"
2. ✅ `http://odontosync.hvrtecnologia.com.br/health` → JSON no navegador
3. ✅ `http://odontosync.hvrtecnologia.com.br/` → Aplicação carrega
4. ✅ Developer Tools → Network → Arquivos .js têm Content-Type correto
5. ✅ Não há erros "Unexpected token" no console

**Se todos passarem, o problema 502 Bad Gateway está 100% resolvido.**