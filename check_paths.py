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
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    cur.execute("SELECT id, file_path FROM submission WHERE file_path IS NOT NULL LIMIT 20")
    rows = cur.fetchall()
    print("Submissions with file_path:")
    for r in rows:
        print(f"ID {r[0]}: {r[1]}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
