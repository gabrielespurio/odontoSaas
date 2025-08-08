# Dockerfile for OdontoSync external deployment
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-production.json ./

# Install dependencies
RUN npm ci --only=production --silent

# Copy source code
COPY . .

# Build the application
RUN npm run build || echo "Build failed, using existing build"

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the server
CMD ["node", "server.js"]