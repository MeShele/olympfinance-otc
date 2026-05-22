# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

ARG CACHEBUST=default
RUN echo "Cache bust: ${CACHEBUST}"

COPY . .

# Vite embeds these at build time. Real values can be passed as build
# args from the orchestrator (Coolify, docker compose) or left as
# placeholders and replaced at container start by docker-entrypoint.sh.
ARG VITE_SUPABASE_URL=RUNTIME_PLACEHOLDER_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY=RUNTIME_PLACEHOLDER_SUPABASE_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

# Runtime ENV injection + nginx start
CMD ["/docker-entrypoint.sh"]
