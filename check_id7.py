from app import app, db, Submission
with app.app_context():
    s = db.session.get(Submission, 7)
    if s:
        print(f"ID: {s.id} | Path: {s.file_path}")
    else:
        print("Not found")
