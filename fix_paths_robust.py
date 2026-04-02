from app import app, db, Submission
import time
import sqlalchemy

def repair():
    with app.app_context():
        subs = Submission.query.filter(Submission.file_path.isnot(None), Submission.file_path != '').all()
        print(f"Repairing {len(subs)} submissions...")
        count = 0
        for s in subs:
            # Reconstruct path from submission_id (UUID)
            if s.file_path.startswith('static/uploads/') or s.file_path == '/api/downloads' or not s.file_path.startswith('/api/downloads/submission/'):
                ext = 'bin'
                if '.' in s.file_path:
                    ext = s.file_path.rsplit('.', 1)[1]
                
                # Use submission_id which should be a UUID
                new_path = f"/api/downloads/submission/{s.submission_id}.{ext}"
                print(f"ID: {s.id} | Old: {s.file_path} -> New: {new_path}")
                s.file_path = new_path
                count += 1
        
        if count > 0:
            db.session.commit()
            print(f"Committed {count} changes.")
        else:
            print("No repairs needed.")

for i in range(10):
    try:
        repair()
        break
    except Exception as e:
        print(f"Retry {i+1}/10 due to {e}")
        time.sleep(2)
