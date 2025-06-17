# ============================================
# DEPLOYMENT INSTRUCTIONS
# ============================================
# 1. On your local machine:
#    - Make sure Docker is installed
#    - Build the image: docker build -t chat-backend:prod .
#    - Test locally: docker run -p 3000:3000 --env-file .env chat-backend:prod
#
# 2. On your production server:
#    - Install Docker if not already installed:
#      curl -fsSL https://get.docker.com -o get-docker.sh
#      sudo sh get-docker.sh
#
#    - Create a directory for your application:
#      mkdir -p /opt/chat-backend
#      cd /opt/chat-backend
#
#    - Copy your .env file to the server
#      scp .env user@your-server:/opt/chat-backend/
#
#    - Copy the Dockerfile to the server
#      scp Dockerfile user@your-server:/opt/chat-backend/
#
#    - Build and run the container:
#      docker build -t chat-backend:prod .
#      docker run -d --name chat-backend \
#        -p 3000:3000 \
#        --env-file .env \
#        --restart unless-stopped \
#        chat-backend:prod
#
#    - To view logs:
#      docker logs -f chat-backend
#
#    - To stop the container:
#      docker stop chat-backend
#
#    - To update the application:
#      docker stop chat-backend
#      docker rm chat-backend
#      docker build -t chat-backend:prod .
#      docker run -d --name chat-backend \
#        -p 3000:3000 \
#        --env-file .env \
#        --restart unless-stopped \
#        chat-backend:prod
# ============================================

# Build stage - This stage compiles the TypeScript code
FROM node:20-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker cache
# This means if package.json hasn't changed, we won't reinstall dependencies
COPY package*.json ./

# Install ALL dependencies (including dev dependencies) needed for building
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application - this compiles TypeScript to JavaScript
RUN npm run build

# Production stage - This stage creates the final, smaller image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files again
COPY package*.json ./

# Install ONLY production dependencies
# This reduces the final image size significantly
RUN npm ci --only=production

# Copy the compiled application from the builder stage
# We only need the dist folder, not the source code
COPY --from=builder /app/dist ./dist

# Set Node environment to production
# This enables various optimizations in Node.js
ENV NODE_ENV=production

# Expose the port the application will run on
# This is just documentation - you still need to map the port when running the container
EXPOSE 3000

# Command to run the application
# Using node directly instead of npm start for better process management
CMD ["node", "dist/main"] 