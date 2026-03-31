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
    
    for table in ['user', 'submission', 'message']:
        print(f"Columns in '{table}':")
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'")
        cols = [r[0] for r in cur.fetchall()]
        print(cols)
        print("-" * 20)
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
