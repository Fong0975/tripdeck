# Multi-stage build for Node.js TypeScript backend.
# Build context is the repository root so the `@tripdeck/shared` workspace
# package (not published to npm) is reachable.
FROM node:24-alpine AS builder

WORKDIR /app

# Replicate the npm workspace layout so `npm ci` can resolve
# `@tripdeck/shared` as a workspace link and honour the root lockfile.
# client/package.json is copied (manifest only) because npm validates every
# workspace listed in the root package.json against the lockfile; its
# dependencies are not installed thanks to the `-w` filter below.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci -w shared -w server --include-workspace-root=false

COPY shared/ ./shared/
COPY server/ ./server/
RUN npm run build -w shared && npm run build -w server

# Final stage
FROM node:24-alpine

WORKDIR /app

# The runtime keeps the original flat layout (/app/dist, /app/uploads, ...)
# because the server resolves those paths relative to __dirname and
# docker-compose mounts volumes there. A workspace link cannot exist in this
# flat layout, so the `@tripdeck/shared` dependency is dropped from the
# manifest (its own runtime dependencies are merged in instead) before a
# production install, and the built package is copied into node_modules.
COPY server/package.json ./
COPY shared/package.json /tmp/shared-package.json
RUN node -e "\
const fs = require('fs'); \
const server = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
const shared = JSON.parse(fs.readFileSync('/tmp/shared-package.json', 'utf8')); \
server.dependencies = { ...shared.dependencies, ...server.dependencies }; \
delete server.dependencies['@tripdeck/shared']; \
fs.writeFileSync('package.json', JSON.stringify(server, null, 2));" \
    && rm /tmp/shared-package.json \
    && npm install --omit=dev \
    && npm cache clean --force

COPY --from=builder /app/shared/package.json ./node_modules/@tripdeck/shared/package.json
COPY --from=builder /app/shared/dist ./node_modules/@tripdeck/shared/dist
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/swagger ./swagger

RUN mkdir -p uploads backups logs && chown 1000:1000 uploads backups logs

EXPOSE 3001

# Default to a non-root user; docker-compose overrides it with APP_UID/APP_GID.
USER 1000:1000

CMD ["node", "dist/index.js"]
