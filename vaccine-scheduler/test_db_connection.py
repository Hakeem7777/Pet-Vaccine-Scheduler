"""Simple script to test Supabase database connection."""
import os
import socket
from dotenv import load_dotenv
import psycopg2

# Force IPv4
original_getaddrinfo = socket.getaddrinfo

def getaddrinfo_ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
    return original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)

socket.getaddrinfo = getaddrinfo_ipv4_only

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

print("Testing Supabase connection...")
print(f"Host: {DATABASE_URL.split('@')[1].split('/')[0] if DATABASE_URL else 'Not set'}")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Simple test query
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"\nConnection successful!")
    print(f"PostgreSQL version: {version[0]}")

    # Test we can query
    cursor.execute("SELECT 1 + 1 AS result;")
    result = cursor.fetchone()
    print(f"Test query (1+1): {result[0]}")

    cursor.close()
    conn.close()
    print("\nDatabase connection is working!")

except Exception as e:
    print(f"\nConnection failed!")
    print(f"Error: {e}")
