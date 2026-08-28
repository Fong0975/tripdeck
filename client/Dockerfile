# Multi-stage build for Vite React frontend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --verbose

COPY . .
ARG VITE_API_DOMAIN=
ARG VITE_API_PORT=3001
ARG VITE_API_PUBLIC_PORT=
ARG VITE_OWM_API_KEY=
ARG VITE_VC_API_KEY=
ENV VITE_API_DOMAIN=$VITE_API_DOMAIN
ENV VITE_API_PORT=$VITE_API_PORT
ENV VITE_API_PUBLIC_PORT=$VITE_API_PUBLIC_PORT
ENV VITE_OWM_API_KEY=$VITE_OWM_API_KEY
ENV VITE_VC_API_KEY=$VITE_VC_API_KEY
RUN npm run build

# Final stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /tmp/nginx.conf.template

ARG FRONTEND_PORT=3000
EXPOSE ${FRONTEND_PORT}

ENV FRONTEND_PORT=${FRONTEND_PORT}
ENV VITE_API_PORT=3001

CMD ["/bin/sh", "-c", "envsubst '${FRONTEND_PORT} ${VITE_API_PORT}' < /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
