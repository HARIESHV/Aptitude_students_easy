import os
import time
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
database_url = os.environ.get('DATABASE_URL')
if not database_url:
    database_url = "postgresql://neondb_owner:npg_6ravLTU9Bxmt@ep-spring-snow-adlcovzz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

def run_migration():
    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            # Use stable connection string from app.py
            clean_url = database_url
            if "?" not in clean_url:
                clean_url += "?sslmode=require&connect_timeout=60"
            else:
                base, params = clean_url.split("?", 1)
                clean_url = f"{base}?sslmode=require&connect_timeout=60"
            
            engine = create_engine(clean_url, connect_args={"sslmode": "require"})
            
            with engine.connect() as conn:
                print(f"Connected to Neon (Attempt {attempt+1})")
                
                # Check User table
                res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='user' AND column_name='full_name'"))
                if not res.fetchone():
                    print("Adding full_name to user...")
                    conn.execute(text("ALTER TABLE \"user\" ADD COLUMN full_name VARCHAR(255)"))
                    conn.commit()

                # Check Submission table
                res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='submission' AND column_name='submission_id'"))
                if not res.fetchone():
                    print("Adding submission_id to submission...")
                    conn.execute(text("ALTER TABLE submission ADD COLUMN submission_id VARCHAR(36)"))
                    conn.execute(text("UPDATE submission SET submission_id = CAST(id AS VARCHAR)"))
                    conn.execute(text("ALTER TABLE submission ALTER COLUMN submission_id SET NOT NULL"))
                    conn.execute(text("ALTER TABLE submission ADD CONSTRAINT submission_submission_id_key UNIQUE (submission_id)"))
                    conn.commit()

                print("Migration executed successfully!")
                return True
        except Exception as e:
            print(f"Attempt {attempt+1} failed: {e}")
            time.sleep(retry_delay)
    return False

if __name__ == "__main__":
    run_migration()
