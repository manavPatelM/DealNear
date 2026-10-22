FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install
COPY index.html vite.config.js ./
COPY src src
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
# The official nginx image renders /etc/nginx/templates/*.template with envsubst at startup.
ENV API_UPSTREAM="http://api-gateway:3000"
ENV DNS_RESOLVER="127.0.0.11"
# Only these variables are substituted, so nginx runtime variables like $host stay intact.
ENV NGINX_ENVSUBST_FILTER="^(API_UPSTREAM|DNS_RESOLVER)$"
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
