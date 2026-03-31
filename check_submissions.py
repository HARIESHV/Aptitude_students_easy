
from app import app, db, Submission
with app.app_context():
    count = Submission.query.count()
    print(f"Total submissions: {count}")
    latest = Submission.query.order_by(Submission.timestamp.desc()).first()
    if latest:
        print(f"Latest submission at: {latest.timestamp}")
    else:
        print("No submissions found.")
