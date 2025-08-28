
# Build stage - This stage compiles the TypeScript code
FROM node:20-alpine AS builder

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker cache
# This means if package.json hasn't changed, we won't reinstall dependencies
COPY package*.json ./

# Use npm ci with cache mount for faster installs
# This creates a cache that persists between builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

# Copy source code (excluding node_modules and dist)
COPY src/ ./src/
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Build the application - this compiles TypeScript to JavaScript
RUN npm run build

# Production stage - This stage creates the final, smaller image
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --prefer-offline --no-audit --no-fund && \
    npm cache clean --force

# Copy the compiled application from the builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Switch to non-root user
USER nestjs

# Set Node environment to production
ENV NODE_ENV=production

# Expose the port the application will run on
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Command to run the application
CMD ["node", "dist/main"]