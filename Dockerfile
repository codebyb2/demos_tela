# Use Node.js LTS
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    tini \
    && rm -rf /var/cache/apk/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production \
    && npm cache clean --force

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs \
    && adduser -S tela -u 1001 -G nodejs

# Copiar código da aplicação
COPY --chown=tela:nodejs . .

# Mudar para usuário não-root
USER tela

# Expor porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Usar tini como init process
ENTRYPOINT ["/sbin/tini", "--"]

# Comando padrão
CMD ["node", "server/index.js"] 