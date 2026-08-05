# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci --prefer-offline

# Copy source and build the production bundle
COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy the compiled React build from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx config that:
#   - forwards /api/* requests to the backend service
#   - handles React Router (SPA fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
