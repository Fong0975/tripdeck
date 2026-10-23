# Multi-stage build for Vite React frontend
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --verbose

COPY . .
ARG VITE_API_DOMAIN=
ARG VITE_API_PORT=3001
ARG VITE_API_PUBLIC_PORT=
ENV VITE_API_DOMAIN=$VITE_API_DOMAIN
ENV VITE_API_PORT=$VITE_API_PORT
ENV VITE_API_PUBLIC_PORT=$VITE_API_PUBLIC_PORT
RUN npm run build

# Final stage
FROM nginx:alpine

# Lets nginx start as the arbitrary non-root user docker-compose runs this
# image as (APP_UID/APP_GID): the `user` directive only applies to root, the
# default pid path and cache dir are root-owned, and the CMD below renders
# the server config into conf.d at startup.
RUN sed -i -e '/^user /d' -e 's#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
    && chmod -R a+rwX /var/cache/nginx /etc/nginx/conf.d

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /tmp/nginx.conf.template

ARG FRONTEND_PORT=3000
EXPOSE ${FRONTEND_PORT}

ENV FRONTEND_PORT=${FRONTEND_PORT}
ENV VITE_API_PORT=3001

CMD ["/bin/sh", "-c", "envsubst '${FRONTEND_PORT} ${VITE_API_PORT}' < /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
