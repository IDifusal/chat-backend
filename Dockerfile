# ========= Build stage =========
FROM node:20-alpine AS builder

RUN apk add --no-cache dumb-init
WORKDIR /app

# Manifests primero (aprovecha cache)
COPY package*.json ./

# Dependencias con cache (si tu Docker soporta BuildKit)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

# Código y configs de build
COPY src/ ./src/
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Compilar a /app/dist
RUN npm run build

# ========= Runtime stage =========
FROM node:20-alpine

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
WORKDIR /app

# Solo package files
COPY package*.json ./

# Prod deps (sin limpiar cache del mount)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --no-audit --no-fund

# 👉 Aquí sí existe la etapa "builder"
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

USER nestjs
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
