# Quick Start - Deploy OdontoSync

## Resumo Executivo

Criei um guia completo para deploy do OdontoSync no seu servidor Ubuntu na Contabo. O sistema está pronto para produção com todas as configurações necessárias.

## Execução Rápida

### 1. Copiar arquivos para o servidor
```bash
# Fazer upload dos arquivos de configuração para o servidor
scp deploy-config.sh DEPLOY_GUIDE.md root@SEU_IP_SERVIDOR:/root/
```

### 2. Executar deploy automático
```bash
# Conectar ao servidor
ssh root@SEU_IP_SERVIDOR

# Dar permissão de execução
chmod +x deploy-config.sh

# Definir o token do GitHub
export GITHUB_PERSONAL_ACCESS_TOKEN="seu_token_aqui"

# Executar deploy
./deploy-config.sh deploy
```

### 3. Configurar domínio (opcional)
```bash
# Editar configuração do Nginx para seu domínio
sudo nano /etc/nginx/sites-available/odontosync
# Alterar server_name para seu domínio
```

## Comandos Úteis

```bash
# Ver status da aplicação
./deploy-config.sh status

# Ver logs em tempo real
./deploy-config.sh logs

# Atualizar aplicação
./deploy-config.sh update

# Reiniciar serviços
pm2 restart odontosync
sudo systemctl reload nginx
```

## Acesso ao Sistema

- **URL**: `http://SEU_IP_SERVIDOR` ou `http://seu-dominio.com`
- **Login**: admin
- **Senha**: admin123

## Arquivos Importantes

- `DEPLOY_GUIDE.md`: Guia completo com todos os detalhes
- `deploy-config.sh`: Script automatizado para deploy
- Logs da aplicação: `/var/www/odontosync/logs/`

## Próximos Passos

1. **Configurar SSL** (opcional, mas recomendado)
2. **Configurar backup** do banco de dados
3. **Configurar monitoramento** do sistema
4. **Apontar domínio** para o IP do servidor

## Suporte

O sistema está configurado para produção com:
- ✅ PM2 para gerenciamento de processos
- ✅ Nginx como proxy reverso
- ✅ Logs centralizados
- ✅ Restart automático em caso de erro
- ✅ Configuração de segurança básica

Para dúvidas, consulte o arquivo `DEPLOY_GUIDE.md` para detalhes completos.