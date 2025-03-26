# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy config file
COPY config.yaml ./

# Create data directory for file storage
RUN mkdir -p ./data

# Create directory for logs
RUN mkdir -p ./logs

# Set environment variables
ENV NODE_ENV=production

# Run as non-root user for better security
USER node

# Command to run the application
CMD ["node", "dist/index.js"]