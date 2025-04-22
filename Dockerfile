# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Add Python and build tools for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies from package.json
RUN npm install

# Install Angular CLI globally with the same version as in package.json
RUN npm install -g @angular/cli@15.2.0

# Verify @angular/core and other essential Angular dependencies are installed
RUN npm list @angular/core || (echo "Installing @angular/core and other essential Angular packages" && \
    npm install @angular/core@15.2.0 @angular/common@15.2.0 @angular/platform-browser@15.2.0 \
    @angular/platform-browser-dynamic@15.2.0 @angular/compiler@15.2.0 @angular/forms@15.2.0 \
    @angular/router@15.2.0 @angular-devkit/build-angular@15.2.0 @angular/compiler-cli@15.2.0 \
    rxjs@7.8.0 zone.js@0.12.0)

# Create necessary directories
RUN mkdir -p data logs dist/bot

# Copy TypeScript configs
COPY tsconfig*.json ./

# Copy the rest of the application
COPY . .

# Check if node_modules/@angular/core exists before building
RUN test -d node_modules/@angular/core || (echo "ERROR: @angular/core is missing after setup" && exit 1)

# Build the Angular application
RUN ng build --configuration production

# Compile TypeScript bot files
RUN npx tsc --project tsconfig.bot.json

# Copy SQL files to dist/bot
RUN find src -name "*.sql" -exec cp --parents {} dist/bot \;

# Production stage
FROM nginx:alpine

# Install Node.js in production stage for running the bot
RUN apk add --no-cache nodejs npm

# Create app directory in production stage
WORKDIR /app

# Copy built Angular files to nginx
COPY --from=builder /app/dist/my-angular-app/* /usr/share/nginx/html/

# Copy compiled bot files and dependencies
COPY --from=builder /app/dist/bot ./dist/bot
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .

# Create and set permissions for data directories
RUN mkdir -p data logs && chown -R nginx:nginx data logs

# Copy nginx configuration if you have custom config
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 3000

# Start both nginx and the bot
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
CMD ["/docker-entrypoint.sh"]