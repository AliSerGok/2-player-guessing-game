#!/usr/bin/env python3
"""
Quick script to check which environment variables are available
Run this in Railway shell or locally to debug
"""
import os

print("=" * 60)
print("ENVIRONMENT VARIABLES CHECK")
print("=" * 60)

# Check CORS configuration
print("\n🌐 CORS Configuration:")
cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'NOT SET')
if cors_origins != 'NOT SET':
    origins_list = cors_origins.split(',')
    print(f"  CORS_ALLOWED_ORIGINS ({len(origins_list)} origins):")
    for idx, origin in enumerate(origins_list, 1):
        print(f"    {idx}. '{origin}' (length: {len(origin)})")
        if origin.endswith('/'):
            print(f"       ⚠️  WARNING: Has trailing slash!")
else:
    print(f"  CORS_ALLOWED_ORIGINS: {cors_origins}")

csrf_origins = os.getenv('CSRF_TRUSTED_ORIGINS', 'NOT SET')
if csrf_origins != 'NOT SET':
    origins_list = csrf_origins.split(',')
    print(f"  CSRF_TRUSTED_ORIGINS ({len(origins_list)} origins):")
    for idx, origin in enumerate(origins_list, 1):
        print(f"    {idx}. '{origin}' (length: {len(origin)})")
        if origin.endswith('/'):
            print(f"       ⚠️  WARNING: Has trailing slash!")
else:
    print(f"  CSRF_TRUSTED_ORIGINS: {csrf_origins}")

allowed_hosts = os.getenv('ALLOWED_HOSTS', 'NOT SET')
print(f"  ALLOWED_HOSTS: {allowed_hosts}")

print("=" * 60)

# Check Railway environment
railway_env = os.getenv('RAILWAY_ENVIRONMENT')
print(f"\nRAILWAY_ENVIRONMENT: {railway_env or 'NOT SET (not on Railway)'}")
if railway_env:
    print("  ✅ Running on Railway - will use Railway PostgreSQL config")

# Check DATABASE_URL
db_url = os.getenv('DATABASE_URL')
print(f"\nDATABASE_URL: {'SET (hidden)' if db_url else 'NOT SET'}")
if db_url:
    # Show just the host part for debugging
    if '@' in db_url and '/' in db_url:
        host_part = db_url.split('@')[1].split('/')[0]
        print(f"  Host: {host_part}")

# Check uppercase PG variables
print("\nUppercase PG Variables:")
print(f"  PGHOST: {os.getenv('PGHOST', 'NOT SET')}")
print(f"  PGDATABASE: {os.getenv('PGDATABASE', 'NOT SET')}")
print(f"  PGUSER: {os.getenv('PGUSER', 'NOT SET')}")
print(f"  PGPASSWORD: {'SET (hidden)' if os.getenv('PGPASSWORD') else 'NOT SET'}")
print(f"  PGPORT: {os.getenv('PGPORT', 'NOT SET')}")

# Check lowercase pg variables
print("\nLowercase pg variables:")
print(f"  pghost: {os.getenv('pghost', 'NOT SET')}")
print(f"  pgdatabase: {os.getenv('pgdatabase', 'NOT SET')}")
print(f"  pguser: {os.getenv('pguser', 'NOT SET')}")
print(f"  pgpassword: {'SET (hidden)' if os.getenv('pgpassword') else 'NOT SET'}")
print(f"  pgport: {os.getenv('pgport', 'NOT SET')}")

# Check POSTGRES variables (typo with double S?)
print("\nPOSTGRESS Variables (typo?):")
print(f"  POSTGRESS_DB: {os.getenv('POSTGRESS_DB', 'NOT SET')}")
print(f"  POSTGRESS_USER: {os.getenv('POSTGRESS_USER', 'NOT SET')}")
print(f"  POSTGRESS_PASSWORD: {'SET (hidden)' if os.getenv('POSTGRESS_PASSWORD') else 'NOT SET'}")

# Check what Django will use (NEW LOGIC)
print("\n" + "=" * 60)
print("DJANGO DATABASE CONFIG (from settings.py logic)")
print("=" * 60)

railway_env = os.getenv('RAILWAY_ENVIRONMENT')

if railway_env:
    print("🚂 Railway Environment Detected!")
    if os.getenv('DATABASE_URL'):
        print("  ✅ Will use DATABASE_URL")
    else:
        print("  ✅ Will use DIRECT Railway PostgreSQL config")
        host = os.getenv('PGHOST') or os.getenv('pghost') or 'postgres.railway.internal'
        password_source = 'env var' if (os.getenv('PGPASSWORD') or os.getenv('pgpassword')) else 'hardcoded'
        print(f"     Host: {host}")
        print(f"     Database: railway")
        print(f"     User: postgres")
        print(f"     Password: {password_source}")
        print(f"     Port: 5432")
else:
    print("💻 Local Development Mode")
    print("  Will use localhost configuration")
    print(f"     Host: localhost")
    print(f"     Database: {os.getenv('DB_NAME', 'betting_game_db')}")

print("=" * 60)
