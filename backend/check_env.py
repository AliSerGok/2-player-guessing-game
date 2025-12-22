#!/usr/bin/env python3
"""
Quick script to check which environment variables are available
Run this in Railway shell or locally to debug
"""
import os

print("=" * 60)
print("ENVIRONMENT VARIABLES CHECK")
print("=" * 60)

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

# Check what Django will use
print("\n" + "=" * 60)
print("DJANGO DATABASE CONFIG (from settings.py logic)")
print("=" * 60)

if os.getenv('DATABASE_URL'):
    print("✅ Will use DATABASE_URL")
elif os.getenv('PGHOST') or os.getenv('pghost'):
    host = os.getenv('PGHOST') or os.getenv('pghost')
    db = os.getenv('PGDATABASE') or os.getenv('pgdatabase') or 'railway'
    user = os.getenv('PGUSER') or os.getenv('pguser') or 'postgres'
    port = os.getenv('PGPORT') or os.getenv('pgport') or '5432'
    print(f"✅ Will use individual PG variables")
    print(f"   Host: {host}")
    print(f"   Database: {db}")
    print(f"   User: {user}")
    print(f"   Port: {port}")
else:
    print("❌ Will use LOCALHOST (fallback)")
    print("   This is why you see 127.0.0.1 connection errors!")

print("=" * 60)
