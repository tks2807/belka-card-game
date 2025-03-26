# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Add Python and build tools for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
RUN npm install

# Install Angular CLI and build packages globally
RUN npm install -g @angular/cli @angular-devkit/build-angular

# Copy the rest of the application
COPY . .

# Install all necessary Angular dependencies
RUN npm install --save @angular/core @angular/common @angular/platform-browser @angular/platform-browser-dynamic @angular/router @angular/forms @angular/compiler tslib rxjs zone.js
RUN npm install --save-dev @angular-devkit/build-angular @angular/compiler-cli @angular/language-service @types/node typescript

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