# syntax=docker/dockerfile:1
#
# Build:
#   docker build -f apps/dashboard/Dockerfile -t czyblog-dashboard .

FROM node:26-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# deps: install full workspace deps
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# build: compile the Next.js app
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/dashboard ./apps/dashboard
RUN npm run build:dashboard

# runner: distroless Node 26 (no shell/npm, nonroot). `node` is the entrypoint.
FROM gcr.io/distroless/nodejs26-debian13:nonroot AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0 \
    API_URL=http://localhost:4000
WORKDIR /app

# Copy the standalone output and the static assets
COPY --from=build /app/apps/dashboard/.next/standalone ./
COPY --from=build /app/apps/dashboard/.next/static ./apps/dashboard/.next/static

EXPOSE 3001

CMD ["apps/dashboard/server.js"]
