# ============================================================
# Employee Management System - Multi-Stage Dockerfile
# Stack: React (Vite) frontend + Python Flask backend
#        Azure SQL via pyodbc / ODBC Driver 18
# ============================================================

# -------------------------------------------------------------------
# Stage 1: Build the React (Vite) frontend
# -------------------------------------------------------------------
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Install dependencies first (layer-cache friendly)
COPY frontend/package*.json ./
RUN npm ci --prefer-offline

# Copy source and build
COPY frontend/ ./
RUN npm run build
# Output: /app/frontend/dist


# -------------------------------------------------------------------
# Stage 2: Python Flask runtime with ODBC Driver 18 for SQL Server
# -------------------------------------------------------------------
FROM python:3.11-slim AS runtime

WORKDIR /app

# ── System deps + Microsoft ODBC Driver 18 ──────────────────────────
# Uses the official Microsoft apt repository for Debian 12 (bookworm)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        gnupg2 \
        apt-transport-https \
        ca-certificates \
        build-essential \
        unixodbc-dev \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
       | gpg --dearmor -o /usr/share/keyrings/microsoft.gpg \
    && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/microsoft.gpg] \
       https://packages.microsoft.com/debian/12/prod bookworm main" \
       > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends \
        msodbcsql18 \
        mssql-tools18 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ──────────────────────────────────────────────
# requirements.txt lives in backend/
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ── Flask application code ───────────────────────────────────────────
# app.py lives in backend/; Flask is configured with
#   static_folder='frontend/dist'  (relative to /app)
COPY backend/app.py ./

# ── Compiled React assets from Stage 1 ──────────────────────────────
# Must land at /app/frontend/dist to match Flask's static_folder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# ── Runtime configuration ────────────────────────────────────────────
# Expose the default port; Azure App Service overrides via $PORT
EXPOSE 8000

# Gunicorn: 2 workers × 4 threads; binds to $PORT or 8000
# --preload reduces per-worker startup time for ODBC initialisation
CMD ["sh", "-c", \
     "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 4 --preload app:app"]
