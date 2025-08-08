#!/bin/bash

echo "🔧 Corrigindo configuração PM2 - OdontoSync"
echo "==========================================="

# 1. Parar processo PM2 problemático
echo "1. Parando processo PM2 atual..."
pm2 stop odonto 2>/dev/null || echo "   (processo já parado)"
pm2 delete odonto 2>/dev/null || echo "   (processo já removido)"

# Verificar se há outros processos rodando
echo "2. Verificando outros processos Node..."
pm2 list
ps aux | grep node | grep -v grep

# 3. Garantir que não há processos na porta 5000
echo "3. Liberando porta 5000..."
pkill -f "node.*5000" 2>/dev/null || echo "   (nenhum processo na porta 5000)"
sleep 2

# 4. Verificar se os arquivos corrigidos existem
echo "4. Verificando arquivos corrigidos..."
if [ ! -f "emergency-server.js" ]; then
    echo "❌ emergency-server.js não encontrado!"
    exit 1
fi

if [ ! -f "production-fixed-cjs.js" ]; then
    echo "❌ production-fixed-cjs.js não encontrado!"
    exit 1
fi

echo "✅ Arquivos corrigidos encontrados"

# 5. Dar permissões
chmod +x emergency-server.js
chmod +x production-fixed-cjs.js

# 6. Verificar se pasta dist existe e fazer build se necessário
if [ ! -d "dist/public" ]; then
    echo "5. Pasta dist não encontrada, executando build..."
    npm run build
    
    if [ ! -d "dist/public" ]; then
        echo "❌ Build falhou!"
        exit 1
    fi
    echo "✅ Build concluído"
else
    echo "5. ✅ Pasta dist existe"
fi

# 7. Iniciar servidor corrigido com PM2
echo "6. Iniciando servidor corrigido com PM2..."

# Usar o emergency-server como principal (é mais confiável)
pm2 start emergency-server.js --name "odontosync" --log-date-format="YYYY-MM-DD HH:mm:ss"

# Aguardar um pouco
sleep 3

# 8. Verificar status
echo "7. Verificando status..."
pm2 status

# 9. Testar servidor
echo "8. Testando servidor..."
curl -s http://localhost:5000/health | head -5

if [ $? -eq 0 ]; then
    echo "✅ Servidor respondendo!"
else
    echo "❌ Servidor não responde, verificando logs..."
    pm2 logs odontosync --lines 10
fi

# 10. Configurar para reiniciar automaticamente
echo "9. Configurando auto-restart..."
pm2 save

echo ""
echo "🎉 Configuração concluída!"
echo "================================"
echo "Comandos úteis:"
echo "  pm2 status                    # Ver status"
echo "  pm2 logs odontosync          # Ver logs"
echo "  pm2 restart odontosync       # Reiniciar"
echo "  curl http://localhost:5000/health  # Testar"
echo ""
echo "Teste no navegador:"
echo "  http://odontosync.hvrtecnologia.com.br/health"
echo "  http://odontosync.hvrtecnologia.com.br/"
echo ""