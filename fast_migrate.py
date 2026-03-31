import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.environ.get('DATABASE_URL')
if not database_url:
    database_url = "postgresql://neondb_owner:npg_STrZjGzF32Vn@ep-sweet-mouse-ampyhmgg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

try:
    print("Attempting connection to Neon...")
    conn = psycopg2.connect(database_url, connect_timeout=60)
    conn.autocommit = True
    print("Connected!")
    
    cur = conn.cursor()
    
    print("Running migration query 1...")
    try:
        cur.execute("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)")
        print("Done: user.full_name")
    except Exception as e:
        print(f"Error user: {e}")

    print("Running migration query 2...")
    try:
        cur.execute("ALTER TABLE submission ADD COLUMN IF NOT EXISTS submission_id VARCHAR(36)")
        print("Done: submission.submission_id")
    except Exception as e:
        print(f"Error submission column: {e}")

    print("Running migration query 3...")
    try:
        cur.execute("UPDATE submission SET submission_id = CAST(id AS VARCHAR) WHERE submission_id IS NULL")
        print("Done: populate submission_id")
    except Exception as e:
        print(f"Error population: {e}")

    print("Running migration query 4...")
    try:
        cur.execute("ALTER TABLE submission ADD CONSTRAINT submission_submission_id_key UNIQUE (submission_id)")
        print("Done: unique constraint")
    except Exception as e:
         print(f"Error constraint: {e}")

    cur.close()
    conn.close()
    print("MIGRATION COMPLETE!")
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
