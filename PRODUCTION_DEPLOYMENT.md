# Deploy OdontoSync via Git - Solução Definitiva

## Problema Identificado
Você está fazendo deploy via Git para servidor externo, e o servidor não está servindo os arquivos JavaScript com o Content-Type correto, causando erro "Unexpected token" no módulo de empresas.

## Solução Implementada

### 1. Servidor de Produção Otimizado (`server.js`)
Criado um servidor Express específico para produção que:
- **Prioriza arquivos JavaScript** com Content-Type correto
- **Valida integridade** dos arquivos antes de servir
- **Logs detalhados** para debug em produção
- **Fallback SPA** para rotas do React
- **Headers de cache** otimizados

### 2. Configuração de Deploy (`deploy-config.sh`)
Script que:
- Valida o build antes do deploy
- Verifica integridade dos arquivos JS
- Configura dependências de produção

### 3. Docker Support (`Dockerfile`)
Para deploy em containers se necessário.

## Como Fazer o Deploy

### Opção A: Deploy Direto (Recomendado)
```bash
# No seu repositório local:
git add .
git commit -m "Production server configuration"
git push origin main

# No seu servidor:
git pull origin main
npm install
npm run build
node server.js
```

### Opção B: Usando Script de Deploy
```bash
# Local:
./deploy-config.sh
git add .
git commit -m "Deploy ready"
git push origin main

# Servidor:
git pull origin main
npm start
```

## Configuração do Servidor

### Estrutura de Arquivos Necessária:
```
sua-pasta-do-projeto/
├── server.js                 # Servidor principal
├── package.json              # Dependências
├── dist/
│   └── public/
│       ├── index.html
│       └── assets/
│           ├── index-DSlahus0.js
│           └── index-BKwjsgsN.css
```

### Comandos para Verificar:
```bash
# Verificar se o servidor está funcionando
curl http://seu-servidor:5000/health

# Verificar Content-Type do JS
curl -I http://seu-servidor:5000/assets/index-DSlahus0.js

# Deve retornar:
# Content-Type: application/javascript; charset=utf-8
```

## Variáveis de Ambiente

```bash
# No seu servidor, configure:
export PORT=5000                    # Porta do servidor
export NODE_ENV=production          # Ambiente
```

## Resolução de Problemas

### Se ainda mostrar erro de "Unexpected token":
1. **Verificar build**: O arquivo `dist/public/assets/index-DSlahus0.js` deve existir
2. **Verificar Content-Type**: Deve ser `application/javascript`
3. **Verificar logs**: O servidor mostra logs detalhados

### Debug Commands:
```bash
# Verificar se o arquivo JS existe e está correto
ls -la dist/public/assets/
head -5 dist/public/assets/index-DSlahus0.js

# Verificar se não é HTML
grep "DOCTYPE" dist/public/assets/index-DSlahus0.js
# Não deve retornar nada
```

## Principais Diferenças da Solução

✅ **Servidor dedicado** para produção via Git
✅ **Headers corretos** garantidos por prioridade
✅ **Validação de integridade** dos arquivos
✅ **Logs de debug** para troubleshooting
✅ **SPA routing** mantido para o React
✅ **Zero dependências** complexas - só Express

## Próximo Passo
Faça commit e push dos novos arquivos para seu repositório, depois pull e execute `node server.js` no seu servidor.