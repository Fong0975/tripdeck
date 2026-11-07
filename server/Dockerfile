# Multi-stage build for Node.js TypeScript backend
FROM node:24-alpine AS builder

WORKDIR /app

COPY server/package.json ./
RUN npm install --verbose

COPY server/ .
RUN npm run build

# Final stage
FROM node:24-alpine

WORKDIR /app

COPY server/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/swagger ./swagger

RUN mkdir -p uploads backups logs && chown 1000:1000 uploads backups logs

EXPOSE 3001

# Default to a non-root user; docker-compose overrides it with APP_UID/APP_GID.
USER 1000:1000

CMD ["node", "dist/index.js"]
