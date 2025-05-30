# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Add Python and build tools for node-gyp
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package*.json ./

# Install all dependencies from package.json
RUN npm install

# Install proxy packages
RUN npm install --save https-proxy-agent proxy-agent node-fetch@2 socks-proxy-agent

# Create necessary directories
RUN mkdir -p data logs dist

# Copy TypeScript configs
COPY tsconfig*.json ./

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

# Install proxy packages in production stage
RUN npm install -g https-proxy-agent proxy-agent node-fetch@2 socks-proxy-agent

# Create app directory in production stage
WORKDIR /app

# Copy compiled files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .

# Create and set permissions for data directories
RUN mkdir -p data logs && chown -R node:node data logs

# Expose port for the bot
EXPOSE 3000

# Start the bot
CMD ["node", "dist/index.js"]