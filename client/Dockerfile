# Multi-stage build for Vite React frontend.
# Build context is the repository root (see docker-compose.yml) so the
# `@tripdeck/shared` sources under shared/src are reachable by the Vite alias.
FROM node:24-alpine AS builder

WORKDIR /app

# Replicate the npm workspace layout so `npm ci` honours the root lockfile.
# server/package.json is copied (manifest only) because npm validates every
# workspace listed in the root package.json; its dependencies are not
# installed thanks to the `-w` filter below.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci -w shared -w client --include-workspace-root=false

COPY shared/ ./shared/
COPY client/ ./client/
ARG VITE_API_DOMAIN=
ARG VITE_API_PORT=3001
ARG VITE_API_PUBLIC_PORT=
ENV VITE_API_DOMAIN=$VITE_API_DOMAIN
ENV VITE_API_PORT=$VITE_API_PORT
ENV VITE_API_PUBLIC_PORT=$VITE_API_PUBLIC_PORT
RUN npm run build -w client

# Final stage
FROM nginx:alpine

# Lets nginx start as the arbitrary non-root user docker-compose runs this
# image as (APP_UID/APP_GID): the `user` directive only applies to root, the
# default pid path and cache dir are root-owned, and the CMD below renders
# the server config into conf.d at startup.
RUN sed -i -e '/^user /d' -e 's#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
    && chmod -R a+rwX /var/cache/nginx /etc/nginx/conf.d

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf.template /tmp/nginx.conf.template

ARG FRONTEND_PORT=3000
EXPOSE ${FRONTEND_PORT}

ENV FRONTEND_PORT=${FRONTEND_PORT}
ENV VITE_API_PORT=3001

# Default to a non-root user; docker-compose overrides it with APP_UID/APP_GID.
USER 1000:1000

CMD ["/bin/sh", "-c", "envsubst '${FRONTEND_PORT} ${VITE_API_PORT}' < /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
