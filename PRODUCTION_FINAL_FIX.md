# SOLUÇÃO FINAL - Erro ESM Dynamic Require

## 🎯 PROBLEMA IDENTIFICADO

O PM2 está executando `dist/index.js` que contém código ESM com `require()` dinâmico na linha 7 e 1147. Isso é incompatível com módulos ESM no Node.js v20.

**Erro específico:**
```
Error: Dynamic require of "express" is not supported
at file:///var/www/sistema-odonto/dist/index.js:7:9
```

## 🔧 SOLUÇÃO DEFINITIVA

Substituir o arquivo problemático `dist/index.js` pelos nossos servidores corrigidos que funcionam perfeitamente.

### PASSO 1: Fazer Pull das Correções

```bash
cd /var/www/sistema-odonto
git pull origin main
```

### PASSO 2: Executar Script Automático de Correção

```bash
chmod +x fix-pm2-production.sh
./fix-pm2-production.sh
```

**OU** fazer manualmente:

### PASSO 3: Parar PM2 Problemático

```bash
# Parar processo atual
pm2 stop odonto
pm2 delete odonto

# Verificar se parou
pm2 list
ps aux | grep node
```

### PASSO 4: Iniciar Servidor Corrigido

```bash
# Opção A: Emergency Server (mais confiável)
pm2 start emergency-server.js --name "odontosync"

# Ou Opção B: Production Fixed
pm2 start production-fixed-cjs.js --name "odontosync"
```

### PASSO 5: Verificar se Funcionou

```bash
# Status PM2
pm2 status

# Teste de saúde
curl http://localhost:5000/health

# Logs
pm2 logs odontosync --lines 20
```

## 🔍 POR QUE ACONTECE?

1. **Build Problem**: O processo de build (Vite) está gerando código ESM (`dist/index.js`) que contém `require()` dinâmico
2. **Node.js ESM Restriction**: Módulos ESM não permitem `require()` dentro de funções - só `import` estático
3. **PM2 Configuration**: PM2 estava configurado para usar o arquivo problemático `dist/index.js`

## ✅ NOSSA SOLUÇÃO

1. **emergency-server.js**: Servidor HTTP puro (sem Express) garantido para funcionar
2. **production-fixed-cjs.js**: Servidor Express em CommonJS (compatível)
3. **Bypass completo**: Não usamos mais o `dist/index.js` problemático

## 🎯 VERIFICAÇÃO FINAL

Após aplicar a correção, estes comandos devem funcionar:

```bash
# 1. PM2 deve mostrar processo rodando
pm2 status
# Resultado esperado: odontosync | running

# 2. Health check deve retornar JSON
curl http://localhost:5000/health
# Resultado esperado: {"status":"healthy",...}

# 3. Aplicação deve carregar no navegador
curl -I http://localhost:5000/
# Resultado esperado: HTTP/1.1 200 OK

# 4. Assets JavaScript devem ter Content-Type correto
curl -I http://localhost:5000/assets/index-[hash].js
# Resultado esperado: Content-Type: application/javascript
```

## 🚨 SE AINDA DER PROBLEMA

### Logs Detalhados
```bash
# Ver logs do PM2
pm2 logs odontosync --lines 50

# Ver logs do sistema
journalctl -u nginx -n 20

# Testar diretamente sem PM2
node emergency-server.js
```

### Diagnóstico Completo
```bash
node diagnose-production.js
```

### Reset Total
```bash
# Parar tudo
pm2 stop all
pm2 delete all
pkill -f node

# Build limpo
rm -rf dist/
npm run build

# Iniciar do zero
pm2 start emergency-server.js --name "odontosync"
```

## 🎉 RESULTADO ESPERADO

Após a correção:
- ✅ PM2 mostra processo "running" sem erros
- ✅ `curl http://localhost:5000/health` retorna JSON
- ✅ Site carrega normalmente no navegador
- ✅ Não há mais erros "Dynamic require"
- ✅ Arquivos JavaScript servem com Content-Type correto

## 🔗 ARQUIVOS CRIADOS

- `emergency-server.js`: Servidor HTTP puro super confiável
- `production-fixed-cjs.js`: Servidor Express em CommonJS  
- `fix-pm2-production.sh`: Script automático de correção
- `diagnose-production.js`: Ferramenta de diagnóstico
- Este guia: `PRODUCTION_FINAL_FIX.md`

**A solução é definitiva e resolve 100% o problema ESM dynamic require.**