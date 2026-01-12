#!/bin/bash
set -e

echo "=== Vaccine Scheduler Startup ==="

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Load vaccine data if not already loaded
echo "Loading vaccine data..."
python manage.py load_vaccines || echo "Vaccines already loaded or no changes"

# Start gunicorn server
echo "Starting Gunicorn server..."
exec gunicorn \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${GUNICORN_WORKERS:-2} \
    --timeout ${GUNICORN_TIMEOUT:-120} \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    config.wsgi:application
