# Production stage
FROM node:20-alpine

RUN apk add --no-cache dumb-init

# (opcional) crear usuario como antes
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /app

COPY package*.json ./

# 👉 usar cache mount, pero SIN limpiar cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --no-audit --no-fund

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

USER nestjs
ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
