# ── Stage 1: Build React app ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Use non-root user for the build stage
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

# Copy lockfile + manifest first — maximises layer cache hits.
# npm ci only re-runs when these two files change.
COPY --chown=appuser:appgroup package.json package-lock.json ./
RUN npm ci --prefer-offline --ignore-scripts

# Copy remaining source and produce an optimised production bundle
COPY --chown=appuser:appgroup . .
RUN npm run build

# ── Stage 2: Serve with Nginx (alpine) ────────────────────────────────────────
# nginx:alpine is ~25 MB vs ~140 MB for the debian variant
FROM nginx:1.27-alpine AS runtime

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy only the compiled static assets — nothing else from the build stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx config:
#   - proxies /api/* to the ems-backend ClusterIP Service
#   - SPA fallback (React Router)
#   - static asset caching + security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose only the HTTP port
EXPOSE 80

# Nginx runs as the built-in non-root 'nginx' user (uid 101) by default in
# the alpine image — no extra USER directive needed.
CMD ["nginx", "-g", "daemon off;"]
