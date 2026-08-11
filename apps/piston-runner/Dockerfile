# # syntax=docker/dockerfile:1
# FROM node:20-alpine

# WORKDIR /app

# COPY package*.json ./
# RUN npm ci --omit=dev

# COPY . .

# # Security: run as non-root
# RUN addgroup -S piston && adduser -S piston -G piston
# USER piston

# EXPOSE 2000

# CMD ["node", "src/main.js"]


# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@11.16.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/piston-runner ./apps/piston-runner

RUN pnpm install --filter piston-runner...

WORKDIR /app/apps/piston-runner
RUN pnpm build

# --- Final lightweight image ---

FROM node:22-alpine
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@11.16.0 --activate

# Create non-root user
RUN addgroup -S piston && adduser -S piston -G piston

COPY --from=builder /app/apps/piston-runner/dist ./dist
COPY --from=builder /app/apps/piston-runner/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --prod

USER piston

EXPOSE 4000

CMD ["node", "dist/main.js"]