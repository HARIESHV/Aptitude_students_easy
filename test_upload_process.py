import requests
import os

url = 'http://127.0.0.1:5000/api/submissions'
# Need a token. I'll get one for admin or student.
# But for now, let's just check if app.py has any obvious errors.

# Let's check the file_path in a new submission.
# I will use a script that uses the app's internal logic.

from app import app, db, Submission, User, Question
import uuid
import zlib

with app.app_context():
    student = User.query.filter_by(role='student').first()
    question = Question.query.first()
    
    if not student or not question:
        print("Missing student or question for test")
        exit()
        
    sub_uuid = str(uuid.uuid4())
    ext = 'txt'
    file_name = f"{sub_uuid}.{ext}"
    physical_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
    
    test_data = b"Hello world"
    compressed = zlib.compress(test_data)
    
    try:
        with open(physical_path, 'wb') as f:
            f.write(compressed)
        print(f"Test file written to: {physical_path}")
        
        new_sub = Submission(
            student_id=student.id,
            question_id=question.id,
            selected_option='Test',
            is_correct=True,
            file_path=f'/api/downloads/submission/{sub_uuid}.{ext}',
            submission_id=sub_uuid
        )
        db.session.add(new_sub)
        db.session.commit()
        print(f"Test submission created with ID: {new_sub.id}")
        
        # Now try to read it back using the route logic
        if os.path.exists(physical_path):
            with open(physical_path, 'rb') as f:
                read_data = f.read()
            decompressed = zlib.decompress(read_data)
            print(f"Decompressed data matches: {decompressed == test_data}")
        else:
            print("Physical file MISSING after write!")
            
    except Exception as e:
        print(f"Error: {e}")
