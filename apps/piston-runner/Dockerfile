# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Security: run as non-root
RUN addgroup -S piston && adduser -S piston -G piston
USER piston

EXPOSE 2000

CMD ["node", "src/main.js"]
