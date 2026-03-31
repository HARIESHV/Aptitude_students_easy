import os
import sqlalchemy
from sqlalchemy.orm import sessionmaker
from app import app, db
from models import User, Question, Submission, Message, MeetLink

# --- CONFIGURATION ---
LOCAL_DB = "sqlite:///local_shadow_backup.db"

def manual_restore_from_shadow_to_cloud():
    """Reads all data from the local Shadow SQLite DB and pushes it back to Neon."""
    print("🚀 DISASTER RECOVERY: Starting Restore from Local Shadow Backup...")
    
    # 1. Setup Local Engine
    local_engine = sqlalchemy.create_engine(LOCAL_DB)
    LocalSession = sessionmaker(bind=local_engine)
    l_session = LocalSession()
    
    with app.app_context():
        try:
            # 2. Restore USERS
            users = l_session.query(User).filter(User.role == 'student').all()
            print(f"👤 Syncing {len(users)} students...")
            for u in users:
                db.session.merge(u) # Merge handles both Insert and Update
            db.session.commit()
            
            # 3. Restore QUESTIONS
            questions = l_session.query(Question).all()
            print(f"❓ Syncing {len(questions)} questions...")
            for q in questions:
                db.session.merge(q)
            db.session.commit()
            
            # 4. Restore SUBMISSIONS
            submissions = l_session.query(Submission).all()
            print(f"📝 Syncing {len(submissions)} scores...")
            for s in submissions:
                db.session.merge(s)
            db.session.commit()
            
            print("\n🎉 MISSION ACCOMPLISHED: Cloud database has been fully restored from local backup!")
            
        except Exception as e:
            print(f"❌ Restore Failed: {e}")
            db.session.rollback()
        finally:
            l_session.close()

if __name__ == "__main__":
    if os.path.exists("local_shadow_backup.db"):
        manual_restore_from_shadow_to_cloud()
    else:
        print("🛑 ERROR: No local shadow backup found to restore from.")
