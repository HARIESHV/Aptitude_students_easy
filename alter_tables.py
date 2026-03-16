import os
from app import app, db

with app.app_context():
    try:
        with db.engine.begin() as conn:
            conn.execute(db.text("ALTER TABLE question ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) DEFAULT 'mcq'"))
            conn.execute(db.text("ALTER TABLE question ADD COLUMN IF NOT EXISTS answer_description TEXT"))
            conn.execute(db.text("ALTER TABLE question ADD COLUMN IF NOT EXISTS correct_text_answer TEXT"))
            
            conn.execute(db.text("ALTER TABLE question ALTER COLUMN option_a DROP NOT NULL"))
            conn.execute(db.text("ALTER TABLE question ALTER COLUMN option_b DROP NOT NULL"))
            conn.execute(db.text("ALTER TABLE question ALTER COLUMN option_c DROP NOT NULL"))
            conn.execute(db.text("ALTER TABLE question ALTER COLUMN option_d DROP NOT NULL"))
            conn.execute(db.text("ALTER TABLE question ALTER COLUMN correct_option DROP NOT NULL"))
            
            conn.execute(db.text("ALTER TABLE submission ALTER COLUMN selected_option TYPE TEXT"))
            conn.execute(db.text("ALTER TABLE submission ALTER COLUMN selected_option DROP NOT NULL"))
        print("Database schema updated successfully.")
    except Exception as e:
        print(f"Error altering tables: {e}")
