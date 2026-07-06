# --- Stage 1: Build the React frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Runtime image for Python Flask ---
FROM python:3.10-slim
WORKDIR /app

# Install system utilities, build tools, and the Microsoft ODBC Driver for SQL Server (msodbcsql18)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg2 \
    apt-transport-https \
    ca-certificates \
    build-essential \
    unixodbc-dev \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft.gpg \
    && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 mssql-tools18 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Flask backend code
COPY app.py ./

# Copy compiled React frontend assets from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose runtime port
EXPOSE 8000

# Start server using Gunicorn, dynamically binding to the port Azure Web App supplies
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 4 app:app"]
