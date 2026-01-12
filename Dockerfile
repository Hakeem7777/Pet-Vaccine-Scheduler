# Unified Dockerfile for Vaccine Scheduler (Frontend + Backend)
# Builds React frontend and serves it via Django/WhiteNoise

# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

# Copy package files first for better caching
COPY vaccine-scheduler-frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy frontend source
COPY vaccine-scheduler-frontend/ ./

# Build the frontend with production API URL (relative path for same-origin)
ENV VITE_API_BASE_URL=/api
RUN npm run build

# ============================================
# Stage 2: Production Backend + Frontend Static
# ============================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY vaccine-scheduler/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install WhiteNoise for serving static files
RUN pip install --no-cache-dir whitenoise

# Copy backend project files
COPY vaccine-scheduler/ .

# Copy built frontend to staticfiles/frontend directory
COPY --from=frontend-builder /frontend/dist /app/frontend_build

# Create directories for data persistence
RUN mkdir -p /app/db /app/data /app/llm_context /app/staticfiles

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app

USER appuser

# Collect static files (Django admin, DRF, etc.)
RUN python manage.py collectstatic --noinput --clear 2>/dev/null || true

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || curl -f http://localhost:8000/api/auth/login/ || exit 1

# Run startup script (handles migrations and starts gunicorn)
CMD ["/app/start.sh"]
