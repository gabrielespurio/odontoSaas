FROM node:20-alpine

# Criar diretório da aplicação
WORKDIR /app

# Instalar dependências do sistema necessárias
RUN apk add --no-cache curl

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --only=production && \
    npm install pg bcrypt jsonwebtoken express

# Copiar código da aplicação
COPY production-simple.cjs ./

# Criar diretório para logs
RUN mkdir -p /app/logs

# Expor porta
EXPOSE 4001

# Comando para executar a aplicação
CMD ["node", "production-simple.cjs"]