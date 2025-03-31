#!/bin/sh

# Start nginx in background
nginx

# Start the compiled bot
cd /app && node dist/bot/index.js 