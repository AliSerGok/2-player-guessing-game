#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "======================================"
echo "Starting Django Deployment Script"
echo "======================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set!"
    exit 1
fi

echo "✓ DATABASE_URL is configured"

# Run database migrations
echo ""
echo "Running database migrations..."
python manage.py migrate --noinput

if [ $? -eq 0 ]; then
    echo "✓ Migrations completed successfully"
else
    echo "✗ Migration failed!"
    exit 1
fi

# Collect static files
echo ""
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

if [ $? -eq 0 ]; then
    echo "✓ Static files collected successfully"
else
    echo "✗ Static file collection failed!"
    exit 1
fi

# Check if PORT is set (Railway provides this)
if [ -z "$PORT" ]; then
    echo "WARNING: PORT not set, using default 8000"
    PORT=8000
fi

echo ""
echo "======================================"
echo "Starting Daphne ASGI Server"
echo "Port: $PORT"
echo "======================================"

# Start Daphne ASGI server
exec daphne -b 0.0.0.0 -p $PORT config.asgi:application
