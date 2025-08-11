#!/bin/bash

# OdontoSync - Script de Deploy Automatizado
echo "🚀 OdontoSync - Deploy Automatizado"
echo "="*50

# Detectar sistema operacional
if command -v systemctl >/dev/null 2>&1; then
    SYSTEM="systemd"
elif command -v docker >/dev/null 2>&1; then
    SYSTEM="docker"
elif command -v pm2 >/dev/null 2>&1; then
    SYSTEM="pm2"
else
    SYSTEM="manual"
fi

echo "🔍 Sistema detectado: $SYSTEM"

case $SYSTEM in
    "systemd")
        echo "📋 Configurando serviço systemd..."
        
        # Copiar arquivo de serviço
        sudo cp odontosync.service /etc/systemd/system/
        
        # Recarregar systemd
        sudo systemctl daemon-reload
        
        # Habilitar e iniciar serviço
        sudo systemctl enable odontosync
        sudo systemctl restart odontosync
        
        # Verificar status
        sudo systemctl status odontosync --no-pager
        
        echo "✅ Serviço configurado! Comandos úteis:"
        echo "   sudo systemctl start odontosync    # Iniciar"
        echo "   sudo systemctl stop odontosync     # Parar"
        echo "   sudo systemctl restart odontosync  # Reiniciar"
        echo "   sudo systemctl status odontosync   # Status"
        echo "   sudo journalctl -u odontosync -f   # Ver logs"
        ;;
        
    "docker")
        echo "🐳 Configurando Docker..."
        
        # Parar container anterior se existir
        docker-compose down 2>/dev/null || true
        
        # Construir e iniciar
        docker-compose up -d --build
        
        # Verificar status
        docker-compose ps
        docker-compose logs --tail=20
        
        echo "✅ Docker configurado! Comandos úteis:"
        echo "   docker-compose up -d       # Iniciar"
        echo "   docker-compose down        # Parar"
        echo "   docker-compose restart     # Reiniciar"
        echo "   docker-compose logs -f     # Ver logs"
        ;;
        
    "pm2")
        echo "⚡ Configurando PM2..."
        
        # Parar processos anteriores
        pm2 delete odontosync-production 2>/dev/null || true
        
        # Criar diretório de logs
        mkdir -p logs
        
        # Iniciar com PM2
        pm2 start ecosystem.config.js
        
        # Salvar configuração para reinicialização automática
        pm2 save
        pm2 startup
        
        # Ver status
        pm2 status
        pm2 logs odontosync-production --lines 10
        
        echo "✅ PM2 configurado! Comandos úteis:"
        echo "   pm2 start ecosystem.config.js   # Iniciar"
        echo "   pm2 stop odontosync-production   # Parar"
        echo "   pm2 restart odontosync-production # Reiniciar"
        echo "   pm2 logs odontosync-production   # Ver logs"
        echo "   pm2 monit                        # Monitor"
        ;;
        
    "manual")
        echo "📝 Configuração manual..."
        
        # Criar script de inicialização
        cat > start-daemon.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
NODE_ENV=production PORT=4001 \
DATABASE_URL="postgresql://neondb_owner:npg_uCjQlFSAK78T@ep-round-violet-acrmg7wt-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" \
nohup node production-simple.cjs > odontosync.log 2>&1 &
echo $! > odontosync.pid
echo "✅ OdontoSync iniciado em background (PID: $(cat odontosync.pid))"
EOF
        
        # Criar script para parar
        cat > stop-daemon.sh << 'EOF'
#!/bin/bash
if [ -f odontosync.pid ]; then
    PID=$(cat odontosync.pid)
    kill $PID 2>/dev/null && echo "✅ OdontoSync parado (PID: $PID)" || echo "❌ Processo não encontrado"
    rm -f odontosync.pid
else
    echo "❌ Arquivo PID não encontrado"
fi
EOF

        # Criar script de status
        cat > status-daemon.sh << 'EOF'
#!/bin/bash
if [ -f odontosync.pid ]; then
    PID=$(cat odontosync.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "✅ OdontoSync rodando (PID: $PID)"
        echo "🌐 URL: http://localhost:4001"
        curl -s http://localhost:4001/health | head -3
    else
        echo "❌ Processo não está rodando (PID obsoleto)"
        rm -f odontosync.pid
    fi
else
    echo "❌ OdontoSync não está rodando"
fi
EOF
        
        chmod +x start-daemon.sh stop-daemon.sh status-daemon.sh
        
        # Iniciar automaticamente
        ./start-daemon.sh
        
        echo "✅ Scripts criados! Comandos disponíveis:"
        echo "   ./start-daemon.sh    # Iniciar"
        echo "   ./stop-daemon.sh     # Parar"  
        echo "   ./status-daemon.sh   # Status"
        echo "   tail -f odontosync.log # Ver logs"
        ;;
esac

echo ""
echo "🌐 Servidor rodando em: http://localhost:4001"
echo "🔐 Login: superadmin@odontosync.com / superadmin123"
echo "🔗 Health check: http://localhost:4001/health"
echo ""
echo "✅ Deploy concluído! O sistema agora inicia automaticamente."