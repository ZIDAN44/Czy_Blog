# syntax=docker/dockerfile:1
#
# Build:
#   docker build -f apps/api/Dockerfile -t czyblog-api .

FROM node:26-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# deps: install full workspace deps
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
RUN npm ci

# build: generate Prisma client + compile TypeScript
FROM deps AS build
COPY apps/api ./apps/api
RUN npm run build:api

# runner: minimal runtime image
FROM base AS runner
ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0 \
    HOME=/home/node
WORKDIR /app/apps/api

# Full node_modules (incl. the Prisma CLI) so migrations can run
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/prisma.config.ts ./prisma.config.ts
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p ./uploads \
    && chown -R node:node /app/apps/api/uploads

USER node

VOLUME ["/app/apps/api/uploads"]

EXPOSE 4000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
