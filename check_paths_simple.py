from app import app, db, Submission
with app.app_context():
    subs = Submission.query.filter(Submission.file_path.isnot(None), Submission.file_path != '').all()
    print(f"Checking {len(subs)} submissions with files...")
    for s in subs:
        print(f"ID: {s.id} | Name: {s.file_path}")
