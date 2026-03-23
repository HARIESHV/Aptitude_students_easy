import os
from app import app, db
import time

with app.app_context():
    success = False
    retries = 5
    while not success and retries > 0:
        try:
            with db.engine.begin() as conn:
                conn.execute(db.text("ALTER TABLE submission ADD COLUMN IF NOT EXISTS file_data BYTEA"))
                conn.execute(db.text("ALTER TABLE submission ADD COLUMN IF NOT EXISTS file_mimetype VARCHAR(100)"))
                conn.execute(db.text("ALTER TABLE message ADD COLUMN IF NOT EXISTS file_data BYTEA"))
                conn.execute(db.text("ALTER TABLE message ADD COLUMN IF NOT EXISTS file_mimetype VARCHAR(100)"))
            print("Database schema updated with file_data successfully.")
            success = True
        except Exception as e:
            print(f"Error altering tables: {e}. Retrying...")
            # Dispose pool on error
            try:
                db.engine.dispose()
            except:
                pass
            time.sleep(2)
            retries -= 1
