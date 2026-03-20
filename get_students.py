import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.environ.get('DATABASE_URL')
if not database_url:
    database_url = "postgresql://neondb_owner:npg_6ravLTU9Bxmt@ep-spring-snow-adlcovzz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

try:
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    cur.execute("SELECT username FROM \"user\" WHERE role='student' LIMIT 3")
    rows = cur.fetchall()
    print("Valid students:")
    for r in rows:
        print(r[0])
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
