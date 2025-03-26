# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Add Python and build tools for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies from package.json
RUN npm install

# Install Angular CLI 15 globally
RUN npm install -g @angular/cli@15.2.0

# Copy the rest of the application
COPY . .

# Clean install to ensure correct dependencies
RUN npm ci

# Build the Angular application
RUN ng build --configuration production

# Production stage
FROM nginx:alpine

# Copy built Angular files to nginx
COPY --from=builder /app/dist/belka-card-game/* /usr/share/nginx/html/

# Copy nginx configuration if you have custom config
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]