# Production Dockerfile for Atharva Enterprises Solar Web Application
FROM node:22-alpine

WORKDIR /app

# Copy application files
COPY package.json ./
COPY server/ ./server/
COPY public/ ./public/

# Create persistent data volume for SQLite database
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Initialize and start
CMD ["node", "server/index.js"]
