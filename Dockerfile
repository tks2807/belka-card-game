# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Add Python and build tools for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json ./

# Remove existing package-lock.json if it exists
RUN rm -f package-lock.json

# Install dependencies and generate new package-lock.json
RUN npm install

# Add bot dependencies
RUN npm install telegraf@4.12.2 dotenv@16.0.3 typescript@4.9.4 ts-node@10.9.1 @types/node@18.15.11

# Install Angular CLI 15 globally
RUN npm install -g @angular/cli@15.2.0

# Create necessary directories
RUN mkdir -p data logs dist/bot

# Copy the rest of the application
COPY . .

# Build the Angular application
RUN ng build --configuration production

# Compile TypeScript bot files
COPY tsconfig.bot.json ./
RUN npx tsc --project tsconfig.bot.json

# Production stage
FROM nginx:alpine

# Install Node.js in production stage for running the bot
RUN apk add --no-cache nodejs npm

# Create app directory in production stage
WORKDIR /app

# Copy built Angular files to nginx
COPY --from=builder /app/dist/belka-card-game/* /usr/share/nginx/html/

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