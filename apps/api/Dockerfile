# Build stage – monorepo root as context
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm run build --filter=@kipio/shared
RUN pnpm run build --filter=@kipio/api

# Run stage
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Copy built outputs
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/main.js"]
