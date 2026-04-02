import app
from models import db, Submission

with app.app.app_context():
    subs = Submission.query.filter(Submission.file_path != None).all()
    if not subs:
        print("No submissions with files found.")
    else:
        for s in subs:
            print(f"ID: {s.id} | Path: {s.file_path} | HasData: {bool(s.file_data)} | UUID: {s.submission_id}")
