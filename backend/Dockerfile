# ── Stage 1: Install Python dependencies (build-time only) ────────────────────
# Use a full Python image in the builder so we can compile native extensions
# (pyodbc / unixodbc), then copy only the installed wheels to the slim runtime.
FROM python:3.11-slim AS builder

WORKDIR /app

# Install only what is needed to compile pyodbc wheels + ODBC headers
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        gnupg2 \
        apt-transport-https \
        ca-certificates \
        build-essential \
        unixodbc-dev \
    # Add Microsoft package repo for the ODBC 18 driver
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
       | gpg --dearmor -o /usr/share/keyrings/microsoft.gpg \
    && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/microsoft.gpg] \
       https://packages.microsoft.com/debian/12/prod bookworm main" \
       > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends \
        msodbcsql18 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages into an isolated prefix so we can copy them cleanly
COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Lean runtime image ────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime-only system dependencies:
#   - libodbc2        : ODBC shared library (needed by pyodbc at runtime)
#   - msodbcsql18     : Microsoft ODBC 18 driver (DSO loaded at connect time)
# We re-add only the MS repo and install the runtime package — no build tools.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        gnupg2 \
        apt-transport-https \
        ca-certificates \
        unixodbc \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
       | gpg --dearmor -o /usr/share/keyrings/microsoft.gpg \
    && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/microsoft.gpg] \
       https://packages.microsoft.com/debian/12/prod bookworm main" \
       > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends \
        msodbcsql18 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built Python packages from the builder stage
COPY --from=builder /install /usr/local

# Copy application source — only app.py is needed at runtime
COPY app.py ./

# Run as a non-root user for security
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
USER appuser

EXPOSE 8000

# 2 workers × 4 threads handles concurrent requests well on a typical 2-CPU pod.
# Adjust via environment variables if needed.
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers ${GUNICORN_WORKERS:-2} --threads ${GUNICORN_THREADS:-4} --timeout ${GUNICORN_TIMEOUT:-30} --preload app:app"]
