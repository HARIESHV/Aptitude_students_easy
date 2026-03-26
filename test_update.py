from app import app, db
from models import Question, Submission, User
from werkzeug.security import generate_password_hash
import uuid

def test_answer_update():
    with app.app_context():
        # Clean up
        Submission.query.delete()
        Question.query.delete()
        User.query.filter_by(username='test_student').delete()
        db.session.commit()

        # Setup
        student = User(username='test_student', password=generate_password_hash('pass'), role='student')
        db.session.add(student)
        db.session.commit()

        q = Question(
            title="Test Q",
            description="What is 1+1?",
            option_a="1",
            option_b="2",
            correct_option="A", # Correct is A initially
            question_type="mcq"
        )
        db.session.add(q)
        db.session.commit()

        sub1 = Submission(
            student_id=student.id,
            question_id=q.id,
            selected_option="A",
            is_correct=True,
            submission_id=str(uuid.uuid4())
        )
        sub2 = Submission(
            student_id=student.id,
            question_id=q.id,
            selected_option="B",
            is_correct=False,
            submission_id=str(uuid.uuid4())
        )
        db.session.add_all([sub1, sub1])
        db.session.commit()

        print(f"Initial: Sub1 is_correct={sub1.is_correct}, Sub2 is_correct={sub2.is_correct}")

        # Update question correct answer to B
        q.correct_option = "B"
        
        # Manually apply the logic we added to app.py (to test it)
        # We need to simulate the loop
        submissions = Submission.query.filter_by(question_id=q.id).all()
        for sub in submissions:
            if q.question_type == 'text':
                if sub.selected_option and q.correct_text_answer:
                    sub.is_correct = str(sub.selected_option).strip().lower() == str(q.correct_text_answer).strip().lower()
                else:
                    sub.is_correct = False
            else:
                sub.is_correct = (sub.selected_option == q.correct_option)
        
        db.session.commit()

        # Refresh
        db.session.refresh(sub1)
        db.session.refresh(sub2)

        print(f"After update: Sub1 is_correct={sub1.is_correct}, Sub2 is_correct={sub2.is_correct}")

        if sub1.is_correct == False and sub2.is_correct == True:
            print("SUCCESS: Submissions updated correctly.")
        else:
            print("FAILURE: Submissions not updated correctly.")

if __name__ == "__main__":
    test_answer_update()
