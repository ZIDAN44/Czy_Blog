# syntax=docker/dockerfile:1
#
# Build:
#   docker build -f apps/api/Dockerfile -t czyblog-api .

FROM node:26-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# Full workspace install — only used to compile, never shipped.
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Prisma client + TypeScript -> dist/
FROM deps AS build
COPY apps/api ./apps/api
RUN npm run build:api

# Runtime deps only. --legacy-peer-deps stops npm pulling @prisma/client's
# optional `prisma` peer (the CLI + engines + studio, ~220 MB) that the pg
# driver adapter never uses at runtime.
FROM base AS prod-deps
WORKDIR /app/apps/api
COPY apps/api/package.json ./package.json
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force

# One-shot image that applies migrations (this is what needs the Prisma CLI).
FROM base AS migrator
ENV NODE_ENV=production HOME=/home/node
WORKDIR /app/apps/api
COPY apps/api/package.json ./package.json
RUN npm install --no-save --no-audit --no-fund \
      "prisma@$(node -p "require('./package.json').devDependencies.prisma")" dotenv \
 && npm cache clean --force
COPY apps/api/prisma ./prisma
COPY apps/api/prisma.config.ts ./prisma.config.ts
USER node
CMD ["npx", "--no-install", "prisma", "migrate", "deploy"]

# The API service. Distroless has no shell/npm — just the Node 26 runtime and a
# nonroot user; `node` is the image's entrypoint, so CMD is only the script.
FROM gcr.io/distroless/nodejs26-debian13:nonroot AS runner
ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0
WORKDIR /app/apps/api
COPY --from=prod-deps /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/dist ./dist
EXPOSE 4000
CMD ["dist/server.js"]
