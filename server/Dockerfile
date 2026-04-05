# Multi-stage build for Node.js TypeScript backend
FROM node:20-alpine AS builder

WORKDIR /app

COPY server/package.json ./
RUN npm install --verbose

COPY server/ .
COPY .env .
RUN npm run build

# Final stage
FROM node:20-alpine

WORKDIR /app

COPY server/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/swagger ./swagger
COPY --from=builder /app/.env .

RUN mkdir -p uploads

EXPOSE 3001

CMD ["node", "dist/index.js"]
