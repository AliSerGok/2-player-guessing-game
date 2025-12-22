#!/bin/bash

# Note: Not using 'set -e' to allow server to start even if migrations/collectstatic fail
# This helps with debugging when DATABASE_URL is not properly configured

echo "======================================"
echo "Starting Django Deployment Script"
echo "======================================"

# Run Python diagnostic to see all environment variables
echo ""
python check_env.py
echo ""

# Run database migrations
echo ""
echo "Running database migrations..."
python manage.py migrate --noinput

if [ $? -eq 0 ]; then
    echo "✓ Migrations completed successfully"
else
    echo "✗ Migration failed!"
    echo "⚠️  Continuing anyway - Daphne will start but database may not be ready"
    echo "    Check Railway logs and ensure PostgreSQL plugin is connected"
fi

# Collect static files
echo ""
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

if [ $? -eq 0 ]; then
    echo "✓ Static files collected successfully"
else
    echo "✗ Static file collection failed!"
    echo "⚠️  Continuing anyway - Admin panel may not have CSS"
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
