# Como Resolver o Erro 502 Bad Gateway - OdontoSync

## O que é o erro 502?

O erro 502 Bad Gateway significa que o nginx (proxy reverso) não consegue se conectar com o servidor Node.js. Isso acontece quando:

1. O servidor Node.js não está rodando
2. O servidor está rodando na porta errada  
3. O servidor travou ou teve erro
4. Problemas de firewall/rede

## Solução Passo a Passo

### 1. Diagnóstico Rápido

Execute no servidor de produção:

```bash
# Verificar se o servidor está rodando
curl http://localhost:5000/health

# Se retornar JSON com "status": "healthy", o servidor está OK
# Se der erro de conexão, o servidor não está rodando
```

### 2. Verificar Processos

```bash
# Ver processos Node.js rodando
ps aux | grep node

# Ver o que está usando a porta 5000
netstat -tlnp | grep :5000
# ou
ss -tlnp | grep :5000
```

### 3. Parar Processos Antigos

```bash
# Matar todos os processos do servidor
pkill -f "node.*production"
pkill -f "node.*server"

# Ou matar por PID específico se souber
kill [PID_DO_PROCESSO]
```

### 4. Executar Build (se necessário)

```bash
# Se a pasta dist/public não existir
npm run build

# Verificar se o build foi criado
ls -la dist/public/
ls -la dist/public/assets/
```

### 5. Iniciar o Servidor Corrigido

**Opção A - Execução Simples:**
```bash
# Servidor simples e robusto
node start-production-simple.js

# Deixar rodando em background
nohup node start-production-simple.js > server.log 2>&1 &
```

**Opção B - Usar PM2 (Recomendado):**
```bash
# Instalar PM2 se não tiver
npm install -g pm2

# Iniciar com PM2
pm2 start start-production-simple.js --name "odontosync"

# Ver status
pm2 status

# Ver logs
pm2 logs odontosync
```

### 6. Verificar se Funcionou

```bash
# Teste básico
curl http://localhost:5000/health

# Deve retornar algo como:
# {"status":"healthy","timestamp":"2025-01-08T...","pid":12345}

# Teste de arquivo JS
curl -I http://localhost:5000/assets/index-[hash].js

# Deve retornar:
# Content-Type: application/javascript; charset=utf-8
```

### 7. Verificar Nginx

Se o servidor local está funcionando mas ainda dá 502:

```bash
# Testar configuração nginx
sudo nginx -t

# Recarregar nginx
sudo systemctl reload nginx
# ou
sudo service nginx reload

# Ver logs do nginx
sudo tail -f /var/log/nginx/error.log
```

## Configuração Nginx Recomendada

Se o problema persistir, verifique se o nginx está configurado assim:

```nginx
server {
    listen 80;
    server_name odontosync.hvrtecnologia.com.br;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Importante para evitar timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Scripts de Diagnóstico

Execute este script para diagnóstico completo:

```bash
node diagnose-production.js
```

Ele irá verificar:
- Se os arquivos necessários existem
- Se o build foi feito
- Se o servidor está rodando
- Se as portas estão corretas
- Se há erros nos arquivos

## Comandos de Emergência

### Restart Completo
```bash
# 1. Parar tudo
pkill -f node
sudo systemctl stop nginx

# 2. Limpar e rebuild
rm -rf dist/
npm run build

# 3. Iniciar servidor
pm2 start start-production-simple.js --name "odontosync"

# 4. Iniciar nginx
sudo systemctl start nginx

# 5. Verificar
curl http://localhost:5000/health
```

### Monitoramento

```bash
# Logs em tempo real
pm2 logs odontosync --lines 50

# Ou se rodando sem PM2
tail -f server.log

# Status do servidor
curl http://localhost:5000/health
```

## Problemas Comuns

### 1. "EADDRINUSE: address already in use"
```bash
# Encontrar e matar processo na porta 5000
lsof -i :5000
kill [PID]
```

### 2. "dist/public not found"
```bash
npm run build
```

### 3. "permission denied"
```bash
# Verificar permissões
ls -la start-production-simple.js
chmod +x start-production-simple.js
```

### 4. Nginx ainda dá 502
```bash
# Verificar se nginx consegue acessar localhost:5000
curl -v http://127.0.0.1:5000/health

# Verificar logs do nginx
sudo tail -f /var/log/nginx/error.log
```

## Verificação Final

Após seguir os passos, teste no navegador:

1. Acesse: `http://odontosync.hvrtecnologia.com.br/health`
   - Deve mostrar JSON com status "healthy"

2. Acesse: `http://odontosync.hvrtecnologia.com.br/`
   - Deve carregar a aplicação

3. Abra Developer Tools (F12) → Network
   - Recarregue a página
   - Verifique se arquivos .js têm Content-Type: "application/javascript"
   - Não deve haver erros "Unexpected token"

Se tudo funcionar, o problema 502 estará resolvido e a aplicação funcionará normalmente.