
from app import app, db, User
with app.app_context():
    students = User.query.filter_by(role='student').all()
    for s in students:
        print(f"Student: {s.username}")
