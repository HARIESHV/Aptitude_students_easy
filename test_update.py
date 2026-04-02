import os
import zlib
from app import app, db, Submission, User, Question
import uuid

with app.app_context():
    # 1. Setup test data
    student = User.query.filter_by(role='student').first()
    question = Question.query.first()
    
    if not student or not question:
        print("Missing student or question for test")
        exit()
        
    sub_uuid = str(uuid.uuid4())
    test_binary = b"Detailed working proof data"
    
    # 2. Simulate storage (as done in submit_answer)
    compressed = zlib.compress(test_binary)
    
    new_sub = Submission(
        student_id=student.id,
        question_id=question.id,
        selected_option='Test Correct',
        is_correct=True,
        file_path=f'/api/downloads/submission/{sub_uuid}.png',
        file_data=compressed,
        submission_id=sub_uuid
    )
    
    db.session.add(new_sub)
    db.session.commit()
    print(f"Created sub {new_sub.id} with compressed data in DB.")
    
    # 3. Simulate retrieval (as done in download_submission_file)
    fetched = Submission.query.get(new_sub.id)
    if fetched.file_data:
        try:
            decompressed = zlib.decompress(fetched.file_data)
            print(f"Success! Retrieved and decompressed: {decompressed.decode()}")
        except Exception as e:
            print(f"Decompression failed: {e}")
    else:
        print("Error: No file_data in DB")
        
    # Cleanup
    db.session.delete(new_sub)
    db.session.commit()
    print("Test record cleaned up.")
