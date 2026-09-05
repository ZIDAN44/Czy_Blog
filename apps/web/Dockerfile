# syntax=docker/dockerfile:1
#
# Build:
#   docker build -f apps/web/Dockerfile -t czyblog-web .

FROM node:26-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# deps: install full workspace deps (all workspace manifests must be present for `npm ci`)
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# build: compile the Next.js app
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/web ./apps/web
RUN npm run build:web

# runner: minimal runtime image
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_URL=http://localhost:4000
WORKDIR /app

# Copy the standalone output and the static assets
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

USER node

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
