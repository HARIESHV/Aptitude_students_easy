
from app import app, db, Submission, User, Question
with app.app_context():
    latest_subs = Submission.query.order_by(Submission.timestamp.desc()).limit(5).all()
    print(f"Total: {Submission.query.count()}")
    for s in latest_subs:
        student = User.query.get(s.student_id)
        question = Question.query.get(s.question_id)
        print(f"Sub ID: {s.id}, Student: {student.username if student else '?'}, Q: {question.id if question else '?'}, Time: {s.timestamp}")
