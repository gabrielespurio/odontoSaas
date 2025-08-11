/**
 * PM2 Ecosystem Configuration for OdontoSync
 * Otimizado para produção na Contabo
 */

module.exports = {
  apps: [
    {
      // Aplicação principal
      name: 'odontosync',
      script: './production-server.js',
      instances: 'max', // Usar todos os cores disponíveis
      exec_mode: 'cluster',
      
      // Configurações de ambiente
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      
      // Configurações de restart automático
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Configurações de log
      log_file: '/var/log/odontosync/combined.log',
      out_file: '/var/log/odontosync/out.log',
      error_file: '/var/log/odontosync/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Configurações de restart
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Configurações de performance  
      node_args: '--max-old-space-size=2048',
      
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Configurações de deploy
      post_update: ['npm install', 'npm run build'],
      
      // Configurações de monitoramento
      monitoring: true,
      pmx: true,
      
      // Configurações específicas do cluster
      kill_timeout: 5000,
      listen_timeout: 3000,
      wait_ready: true,
      
      // Variáveis de ambiente específicas
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        SESSION_SECRET: process.env.SESSION_SECRET,
        DOMAIN: process.env.DOMAIN || 'localhost'
      }
    }
  ],
  
  deploy: {
    production: {
      user: 'root',
      host: ['seu-servidor.contabo.com'],
      ref: 'origin/main',
      repo: 'git@github.com:seu-usuario/odontosync.git',
      path: '/var/www/odontosync',
      'post-deploy': 'npm ci --only=production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    }
  }
};