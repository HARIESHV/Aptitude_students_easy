import os
import uuid
import threading
import time
from datetime import datetime, timedelta
from functools import wraps

# from flask import ... - heavy imports moved to route level
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
# import pandas as pd  <-- Moved inside export routes to save startup memory
from flask_cors import CORS
from dotenv import load_dotenv
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

import sqlalchemy
from sqlalchemy import func
from models import db, User, Question, Submission, MeetLink, Message

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))

database_url = os.environ.get('DATABASE_URL')

# Ensure we have a valid database URL
if not database_url:
    # Use fallback quietly
    database_url = "postgresql://neondb_owner:npg_6ravLTU9Bxmt@ep-spring-snow-adlcovzz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Handle Render's legacy postgres:// prefix
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

# Ensure the URL is clean and includes stable SSL/GSS flags for Neon
if "?" in database_url:
    base_part, _ = database_url.split("?", 1)
    # Reconstruct with optimized parameters for cloud stability
    database_url = f"{base_part}?sslmode=require&connect_timeout=30"
else:
    database_url = f"{database_url}?sslmode=require&connect_timeout=30"

print(f"Connected to Cloud Database (Neon/Postgres)")

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_pre_ping": True,          # Re-enabled: Verify connection before each use
    "pool_recycle": 270,            # Recycle connections every 270s (before Neon's ~300s idle timeout)
    "pool_size": 5,
    "max_overflow": 10,
    "pool_timeout": 30,
    "connect_args": {
        "keepalives": 1,            # Enable TCP keepalive
        "keepalives_idle": 30,      # Send keepalive after 30s idle
        "keepalives_interval": 10,  # Retry keepalive every 10s
        "keepalives_count": 5,      # Drop after 5 failed keepalives
        "connect_timeout": 60       # Increased timeout for unstable connections
    }
}
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'super-secret-aptitude-master-key-1234567890')
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db.init_app(app)

# Track if setup is done to avoid repeated runs in Gunicorn workers
_setup_done = False

def run_maintenance(app):
    global _setup_done
    while True: # Outer loop for total disaster recovery
        try:
            with app.app_context():
                # 1. Prepare Tables
                db.create_all()
                
                # 2. Seed Admin
                # Logic: We want at least one admin named 'admin'.
                # First, check if 'admin' username exists at all (regardless of role)
                existing_admin_by_name = User.query.filter_by(username='admin').first()
                
                if not existing_admin_by_name:
                    # 'admin' name is free, see if we have ANY admin to rename
                    any_admin = User.query.filter_by(role='admin').first()
                    if any_admin:
                        any_admin.username = 'admin'
                        db.session.commit()
                        print("DB Maintenance: Existing admin renamed to 'admin'.")
                    else:
                        # No admin at all, create one
                        new_admin = User(
                            username='admin',
                            password=generate_password_hash('admin123', method='pbkdf2:sha256'),
                            role='admin'
                        )
                        db.session.add(new_admin)
                        db.session.commit()
                        print("DB Maintenance: New admin user created.")
                else:
                    # 'admin' exists, ensure it has the admin role
                    if existing_admin_by_name.role != 'admin':
                        existing_admin_by_name.role = 'admin'
                        db.session.commit()
                        print("DB Maintenance: User 'admin' promoted to admin role.")

                # 3. Enter Keep-Alive Loop (ping every 45s — well within Neon's idle timeout)
                print("DB Maintenance: Keep-alive active (ping every 45s).")
                while True:
                    try:
                        # Use a raw connection to avoid ORM session state issues
                        with db.engine.connect() as conn:
                            conn.execute(db.text("SELECT 1"))
                    except Exception as e:
                        err_str = str(e)
                        # SSL EOF / connection dropped — dispose the whole pool so
                        # SQLAlchemy creates fresh connections for every future request
                        print(f"DB Keep-alive: connection lost ({err_str[:60]}...). Disposing pool...")
                        try:
                            db.engine.dispose()
                        except Exception:
                            pass
                        db.session.remove()
                        break  # Break inner loop to re-enter outer try and reconnect
                    time.sleep(45)
        except Exception as e:
            err_str = str(e)
            with app.app_context():
                # Dispose pool on any error so fresh connections are used next time
                try:
                    db.engine.dispose()
                except Exception:
                    pass
                db.session.remove()
            
            # Special handling for DNS / Host errors
            if "could not translate host name" in err_str.lower() or "timeout expired" in err_str.lower():
                print(f"DB Maintenance: Cloud DNS/Network error detected. Waiting 30s before retry... ({err_str[:80]}...)")
                time.sleep(30)
            elif "EOF" in err_str or "SSL" in err_str or "connection reset" in err_str.lower():
                print(f"DB Maintenance: Managed connection interrupted, retrying in 10s... ({err_str[:80]}...)")
                time.sleep(10)
            else:
                print(f"DB Maintenance Loop Error: {err_str[:120]}")
                time.sleep(10)

# --- Global Error Handler ---
from werkzeug.exceptions import HTTPException

@app.errorhandler(Exception)
def handle_exception(e):
    # pass through HTTP errors
    if isinstance(e, HTTPException):
        return e
    
    # log the error
    print(f"CRITICAL SERVER ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    
    return jsonify({
        "message": "A server error occurred. Please try again later.",
        "details": str(e) if app.debug else None
    }), 500

# Start background tasks
def startup():
    global _setup_done
    if not _setup_done:
        threading.Thread(target=run_maintenance, args=(app,), daemon=True).start()
        _setup_done = True

startup()

# Decorator for verifying JWT
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = db.session.get(User, data['user_id'])
        except:
            return jsonify({'message': 'Token is invalid!'}), 401

        if not current_user:
             return jsonify({'message': 'User not found!'}), 401
             
        return f(current_user, *args, **kwargs)
    return decorated

# Decorator for Admin only routes
def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'message': 'Admin privileges required!'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

# -----------------
# Frontend Routes
# -----------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/admin_dashboard')
def admin_dashboard():
    return render_template('admin.html')

@app.route('/student_dashboard')
def student_dashboard():
    return render_template('student.html')

@app.route('/quiz')
def quiz_page():
    return render_template('quiz.html')

# -----------------
# API Authentication
# -----------------

@app.route('/api/ping', methods=['GET'])
def ping():
    """Lightweight token validation — no DB hit. Used by frontend to check session."""
    token = None
    if 'Authorization' in request.headers:
        token = request.headers['Authorization'].split(" ")[1]
    if not token:
        return jsonify({'message': 'No token'}), 401
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        return jsonify({'role': data.get('role'), 'user_id': data.get('user_id')}), 200
    except Exception:
        return jsonify({'message': 'Token invalid or expired'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = (data.get('username') or '').strip()
        full_name = (data.get('full_name') or username).strip()
        password = (data.get('password') or '').strip()
        role = data.get('role', 'student') 

        if not username or not password:
            return jsonify({'message': 'Missing data!'}), 400
        
        # Case-insensitive duplicate check: 'Hariesh' and 'hariesh' are the same user
        if User.query.filter(db.func.lower(User.username) == username.lower()).first():
            return jsonify({'message': 'User already exists!'}), 400
            
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(username=username, password=hashed_password, role=role, full_name=full_name)
        db.session.add(new_user)
        db.session.commit()
        
        # Auto-login: Generate token immediately
        import datetime as dt
        token = jwt.encode(
            {'user_id': new_user.id, 'role': new_user.role, 'exp': dt.datetime.now(dt.timezone.utc) + timedelta(hours=24)}, 
            app.config['SECRET_KEY'], 
            algorithm="HS256"
        )
        if isinstance(token, bytes):
            token = token.decode('utf-8')
            
        return jsonify({
            'message': 'Account created! Logging you in...', 
            'token': token, 
            'role': new_user.role, 
            'username': new_user.username, 
            'user_id': new_user.id
        }), 201
    except Exception as e:
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        raw_username = data.get('username', '')
        raw_password = data.get('password', '')
        
        # Strip whitespace from BOTH fields — mobile keyboards often add trailing spaces
        username = raw_username.strip() if raw_username else None
        password = raw_password.strip() if raw_password else None
        expected_role = data.get('role')

        if not username or not password:
            return jsonify({'message': 'Missing credentials'}), 400

        # Case-insensitive lookup: 'hariesh', 'Hariesh', 'HARIESH' all find the same account
        user = User.query.filter(db.func.lower(User.username) == str(username).lower()).first()

        if not user:
            return jsonify({'message': 'Invalid username or password'}), 401

        if expected_role and user.role != expected_role:
            return jsonify({'message': f'You must login as {user.role}!'}), 403

        if check_password_hash(user.password, password):
            import datetime as dt
            token = jwt.encode(
                {'user_id': user.id, 'role': user.role, 'exp': dt.datetime.now(dt.timezone.utc) + timedelta(hours=24)}, 
                app.config['SECRET_KEY'], 
                algorithm="HS256"
            )
            # Ensure token is string (for PyJWT 2.0+)
            if isinstance(token, bytes):
                token = token.decode('utf-8')
                
            return jsonify({'token': token, 'role': user.role, 'username': user.username, 'user_id': user.id}), 200

        return jsonify({'message': 'Invalid username or password'}), 401
    except Exception as e:
        return jsonify({'message': f'Server Error: {str(e)}'}), 500

# -----------------
# API Admin Features
# -----------------
@app.route('/api/questions', methods=['POST'])
@token_required
@admin_required
def add_question(current_user):
    data = request.get_json()
    new_question = Question(
        topic=data.get('topic', 'General'),
        subtopic=data.get('subtopic', 'General'),
        time_limit=int(data.get('time_limit', 0)),
        title=data['title'],
        description=data.get('description', ''),
        option_a=data.get('option_a'),
        option_b=data.get('option_b'),
        option_c=data.get('option_c'),
        option_d=data.get('option_d'),
        correct_option=data.get('correct_option'),
        question_type=data.get('question_type', 'mcq'),
        answer_description=data.get('answer_description'),
        correct_text_answer=data.get('correct_text_answer')
    )
    db.session.add(new_question)
    db.session.commit()
    return jsonify({'message': 'Question added successfully!'}), 201

@app.route('/api/questions/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_question(current_user, id):
    try:
        question = db.session.get(Question, id)
        if not question:
            return jsonify({'message': 'Question not found!'}), 404
        
        data = request.get_json()
        question.topic = data.get('topic', question.topic)
        question.subtopic = data.get('subtopic', question.subtopic)
        question.time_limit = int(data.get('time_limit', question.time_limit))
        question.title = data.get('title', question.title)
        question.description = data.get('description', question.description)
        question.option_a = data.get('option_a', question.option_a)
        question.option_b = data.get('option_b', question.option_b)
        question.option_c = data.get('option_c', question.option_c)
        question.option_d = data.get('option_d', question.option_d)
        question.correct_option = data.get('correct_option', question.correct_option)
        question.question_type = data.get('question_type', question.question_type)
        question.answer_description = data.get('answer_description', question.answer_description)
        question.correct_text_answer = data.get('correct_text_answer', question.correct_text_answer)
        
        db.session.commit()
        return jsonify({'message': 'Question updated successfully!'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Update Question Error: {e}")
        return jsonify({'message': f'Update failed: {str(e)}'}), 500

@app.route('/api/questions/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_question(current_user, id):
    try:
        question = db.session.get(Question, id)
        if not question:
            return jsonify({'message': 'Question not found!'}), 404
        
        # Delete related submissions first
        Submission.query.filter_by(question_id=id).delete()
        
        db.session.delete(question)
        db.session.commit()
        return jsonify({'message': 'Question deleted!'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Delete Question Error: {e}")
        return jsonify({'message': f'Delete failed: {str(e)}'}), 500

@app.route('/api/meetlinks', methods=['POST'])
@token_required
@admin_required
def add_meetlink(current_user):
    data = request.get_json()
    new_link = MeetLink(title=data['title'], url=data['url'])
    db.session.add(new_link)
    db.session.commit()
    return jsonify({'message': 'Meet link posted!'}), 201

@app.route('/api/meetlinks/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_meetlink(current_user, id):
    link = db.session.get(MeetLink, id)
    if not link:
        return jsonify({'message': 'Link not found!'}), 404
    db.session.delete(link)
    db.session.commit()
    return jsonify({'message': 'Link deleted!'})

@app.route('/api/students', methods=['GET'])
@token_required
@admin_required
def get_students(current_user):
    students = User.query.filter_by(role='student').all()
    output = []
    for std in students:
        submissions = Submission.query.filter_by(student_id=std.id).all()
        total = len(submissions)
        proofs = len([s for s in submissions if s.file_path])
        correct = len([s for s in submissions if s.is_correct])
        average = (correct / total * 100) if total > 0 else 0
        output.append({
            'id': std.id,
            'name': std.full_name or std.username,
            'username': std.username,
            'average': float("{:.2f}".format(average)),
            'total_submissions': total,
            'total_proofs': proofs
        })
    return jsonify({'students': output})



@app.route('/api/admin/stats', methods=['GET'])
@token_required
@admin_required
def get_admin_stats(current_user):
    total_students = User.query.filter_by(role='student').count()
    total_submissions = Submission.query.count()
    total_proofs = Submission.query.filter(Submission.file_path != None).count()
    total_questions = Question.query.count()
    
    # Calculate global average as total correct / total submissions
    if total_submissions > 0:
        correct_submissions = Submission.query.filter_by(is_correct=True).count()
        global_avg = (correct_submissions / total_submissions) * 100
    else:
        global_avg = 0
        
    return jsonify({
        'total_students': total_students,
        'total_submissions': total_submissions,
        'total_proofs': total_proofs,
        'total_questions': total_questions,
        'global_average': round(global_avg, 2)
    })

@app.route('/api/students/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_student(current_user, id):
    student = db.session.get(User, id)
    if not student or student.role != 'student':
        return jsonify({'message': 'Student not found!'}), 404
        
    # Delete related data first
    Submission.query.filter_by(student_id=id).delete()
    Message.query.filter((Message.sender_id == id) | (Message.receiver_id == id)).delete()
    
    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': 'Student and all related records deleted successfully!'})

@app.route('/api/export/students', methods=['GET'])
@token_required
@admin_required
def export_students(current_user):
    import pandas as pd
    import io
    students = User.query.filter_by(role='student').all()
    data = []
    for std in students:
        submissions = Submission.query.filter_by(student_id=std.id).all()
        total = len(submissions)
        correct = len([s for s in submissions if s.is_correct])
        average = (correct / total * 100) if total > 0 else 0
        data.append({
            'ID': std.id,
            'Username': std.username,
            'Total Submissions': total,
            'Average Score (%)': round(average, 2)
        })
        
    df = pd.DataFrame(data)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Students Leaderboard')
        
    output.seek(0)
    return send_file(
        output,
        download_name="AptitudeMaster_Student_Leaderboard.xlsx",
        as_attachment=True,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@app.route('/api/submissions', methods=['GET'])
@token_required
@admin_required
def get_all_submissions(current_user):
    submissions = Submission.query.order_by(Submission.timestamp.desc()).all()
    output = []
    for sub in submissions:
        output.append({
            'id': sub.id,
            'submission_id': sub.submission_id or str(sub.id),
            'student': sub.student.full_name or sub.student.username,
            'username': sub.student.username,
            'question_id': sub.question.id,
            'question': sub.question.title,
            'topic': sub.question.topic,
            'question_type': sub.question.question_type,
            'selected_option': sub.selected_option,
            'correct_answer': sub.question.correct_option if sub.question.question_type != 'text' else sub.question.correct_text_answer,
            'is_correct': sub.is_correct,
            'file_path': f"/api/downloads/submission/{sub.submission_id}" if sub.file_data else sub.file_path,
            'timestamp': sub.timestamp.strftime('%Y-%m-%d %I:%M %p')
        })
    return jsonify({'submissions': output})

@app.route('/api/submissions/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_submission(current_user, id):
    submission = db.session.get(Submission, id)
    if not submission:
        return jsonify({'message': 'Submission not found!'}), 404
        
    db.session.delete(submission)
    db.session.commit()
    return jsonify({'message': 'Submission deleted successfully!'})

@app.route('/api/export/submissions', methods=['GET'])
@token_required
@admin_required
def export_submissions(current_user):
    import pandas as pd
    import io
    submissions = Submission.query.order_by(Submission.timestamp.desc()).all()
    data = []
    for sub in submissions:
        data.append({
            'Submission ID': sub.id,
            'Student Username': sub.student.username,
            'Question Title': sub.question.title,
            'Topic': sub.question.topic,
            'Selected Option': sub.selected_option,
            'Correct Option': sub.question.correct_option,
            'Is Correct': 'Yes' if sub.is_correct else 'No',
            'Timestamp (IST)': sub.timestamp.strftime('%Y-%m-%d %I:%M %p')
        })
        
    df = pd.DataFrame(data)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='All Submissions')
        
    output.seek(0)
    return send_file(
        output,
        download_name="AptitudeMaster_All_Submissions.xlsx",
        as_attachment=True,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

# -----------------
# API Shared Features
# -----------------

@app.route('/api/meetlinks', methods=['GET'])
@token_required
def get_meetlinks(current_user):
    links = MeetLink.query.order_by(MeetLink.created_at.desc()).all()
    output = []
    for l in links:
        output.append({
            'id': l.id,
            'title': l.title,
            'url': l.url,
            'created_at': l.created_at.strftime('%Y-%m-%d %I:%M %p')
        })
    return jsonify({'meetlinks': output})

@app.route('/api/admin/meetlinks', methods=['POST'])
@token_required
@admin_required
def create_meetlink(current_user):
    data = request.get_json()
    new_link = MeetLink(
        title=data.get('title', 'Live Class'),
        url=data.get('url')
    )
    db.session.add(new_link)
    db.session.commit()
    return jsonify({'message': 'Meet link posted successfully!', 'id': new_link.id})

@app.route('/api/admin/meetlinks/<int:id>', methods=['DELETE'], endpoint='delete_admin_meetlink')
@token_required
@admin_required
def delete_admin_meetlink(current_user, id):
    link = db.session.get(MeetLink, id)
    if not link:
        return jsonify({'message': 'Link not found!'}), 404
        
    db.session.delete(link)
    db.session.commit()
    return jsonify({'message': 'Meet link deleted successfully!'})
@app.route('/api/questions', methods=['GET'])
@token_required
def get_questions(current_user):
    questions = Question.query.order_by(Question.created_at.desc()).all()
    output = []
    for q in questions:
        q_data = {
            'id': q.id,
            'topic': q.topic,
            'subtopic': q.subtopic,
            'time_limit': q.time_limit,
            'title': q.title,
            'description': q.description,
            'option_a': q.option_a,
            'option_b': q.option_b,
            'option_c': q.option_c,
            'option_d': q.option_d,
            'question_type': q.question_type,
            'answer_description': q.answer_description,
            'created_at': q.created_at.strftime('%Y-%m-%d %I:%M %p') if q.created_at else 'N/A'
        }
        if current_user.role == 'admin':
            q_data['correct_option'] = q.correct_option
            q_data['correct_text_answer'] = q.correct_text_answer
        output.append(q_data)
    return jsonify({'questions': output})

@app.route('/api/broadcast', methods=['POST'])
@token_required
@admin_required
def api_broadcast(current_user):
    data = request.get_json()
    content = data.get('content')
    if not content:
        return jsonify({'message': 'Content missing!'}), 400
    
    new_message = Message(
        sender_id=current_user.id,
        sender_role=current_user.role,
        receiver_id=None, # Broadcast
        content=content
    )
    db.session.add(new_message)
    db.session.commit()
    return jsonify({'message': 'Broadcast sent successfully!'}), 201

@app.route('/api/messages', methods=['POST'])
@token_required
def send_message(current_user):
    if request.is_json:
        data = request.get_json()
        content = data.get('content')
        receiver_id = data.get('receiver_id')
        file_path = None
    else:
        content = request.form.get('content')
        receiver_id = request.form.get('receiver_id')
        
        file_path = None
        if 'file' in request.files:
            file = request.files['file']
            if file.filename != '':
                filename = secure_filename(file.filename)
                
                # Store in DB for persistence
                file_data = file.read()
                file_mimetype = file.mimetype
                
                # Save locally as well if possible
                timestamp_prefix = datetime.now().strftime('%Y%m%d%H%M%S')
                filename = f"msg_{timestamp_prefix}_{filename}"
                full_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                try:
                    file.stream.seek(0)
                    file.save(full_path)
                except Exception as e:
                    print(f"Warning: message file copy failed: {str(e)}")
                    
                # Use download API link
                msg_uuid = str(uuid.uuid4())
                file_path = f'/api/downloads/message/{msg_uuid}'
    
    if receiver_id == 'all' or receiver_id == '' or receiver_id is None:
        receiver_id = None
    else:
        receiver_id = int(receiver_id)

    # SECURE: If a student is sending a message, force it to the main Admin (ID 1)
    if current_user.role == 'student':
        admin_user = User.query.filter_by(role='admin').first()
        receiver_id = admin_user.id if admin_user else 1

    new_message = Message(
        sender_id=current_user.id,
        sender_role=current_user.role,
        receiver_id=receiver_id,
        content=content,
        file_path=file_path,
        file_data=file_data if 'file_data' in locals() else None,
        file_mimetype=file_mimetype if 'file_mimetype' in locals() else None
    )
    db.session.add(new_message)
    db.session.commit()
    return jsonify({'message': 'Message sent successfully!'}), 201

@app.route('/api/messages', methods=['GET'])
@token_required
def get_messages(current_user):
    if current_user.role == 'admin':
        messages = Message.query.order_by(Message.timestamp.desc()).all()
    else:
        # Students see: 
        # 1. Private messages to them
        # 2. Messages they sent
        # 3. Broadcast messages (receiver_id is None) ONLY IF sent by an Admin
        messages = Message.query.filter(
            (Message.receiver_id == current_user.id) |
            (Message.sender_id == current_user.id) |
            ((Message.receiver_id == None) & (Message.sender_role == 'admin'))
        ).order_by(Message.timestamp.desc()).all()
        
    output = []
    for m in messages:
        receiver_name = "All Students"
        if m.receiver_id:
            recv = db.session.get(User, m.receiver_id)
            receiver_name = recv.username if recv else "Unknown"
            
        output.append({
            'id': m.id,
            'sender': m.sender.username,
            'sender_role': m.sender_role,
            'receiver': receiver_name,
            'receiver_id': m.receiver_id,
            'content': m.content,
            'file_path': m.file_path,
            'timestamp': m.timestamp.strftime('%Y-%m-%d %I:%M %p')
        })
    return jsonify({'messages': output})

@app.route('/api/messages/<int:id>', methods=['DELETE'])
@token_required
def delete_message(current_user, id):
    message = db.session.get(Message, id)
    if not message:
        return jsonify({'message': 'Message not found!'}), 404
        
    # Permission Check: 
    # Admin can delete anything. 
    # Students can only delete their own sent messages.
    if current_user.role != 'admin' and message.sender_id != current_user.id:
        return jsonify({'message': 'Permission denied!'}), 403
        
    db.session.delete(message)
    db.session.commit()
    return jsonify({'message': 'Message deleted successfully!'})

# -----------------
# API Student Features
# -----------------
@app.route('/api/submissions', methods=['POST'])
@token_required
def submit_answer(current_user):
    if current_user.role != 'student':
        return jsonify({'message': 'Only students can submit answers!'}), 403

    if request.is_json:
        data = request.get_json()
        question_id = data.get('question_id')
        selected_option = data.get('selected_option')
        file_path = None
    else:
        # Handle multipart/form-data for file uploads
        question_id = request.form.get('question_id')
        selected_option = request.form.get('selected_option')
        file_path = None
        
        if 'file' in request.files:
            file = request.files['file']
            if file.filename != '':
                filename = secure_filename(file.filename)
                
                # Restriction: Only allow PDF, Image, and DOCX
                allowed_extensions = {'.pdf', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}
                file_ext = os.path.splitext(filename)[1].lower()
                
                if file_ext not in allowed_extensions:
                    return jsonify({'message': 'Invalid file type! Only PDF, Images (JPG, PNG, SVG), and DOCX are allowed.'}), 400
                
                # We store file in memory to put into DB directly
                file_data = file.read()
                file_mimetype = file.mimetype
                
                # Still try to save a fast copy locally if it's not ephemeral (useful for debugging)
                timestamp_prefix = datetime.now().strftime('%Y%m%d%H%M%S')
                filename = f"sub_{timestamp_prefix}_{filename}"
                full_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                try:
                    file.stream.seek(0) # Reset stream after reading
                    file.save(full_path)
                except Exception as e:
                    print(f"Warning: local file copy failed: {str(e)}")
                    
                # Setup the DB file storing logic
                # Path is now the dynamic download endpoint
                sub_uuid = str(uuid.uuid4())
                file_path = f'/api/downloads/submission/{sub_uuid}'

    if not question_id:
        return jsonify({'message': 'Missing question ID!'}), 400

    question_id = int(question_id)
    question = db.session.get(Question, question_id)
    if not question:
        return jsonify({'message': 'Question not found!'}), 404

    # Multi-submission support enabled as per requirements
    # existing = Submission.query.filter_by(student_id=current_user.id, question_id=question_id).first()
    # if existing:
    #     return jsonify({'message': 'You have already submitted an answer for this question!'}), 400

    if question.question_type == 'text':
        is_correct = False
        if selected_option and question.correct_text_answer:
            is_correct = str(selected_option).strip().lower() == str(question.correct_text_answer).strip().lower()
    else:
        is_correct = (selected_option == question.correct_option)
    
    sub_uuid = sub_uuid if 'sub_uuid' in locals() else str(uuid.uuid4())
    
    new_sub = Submission(
        student_id=current_user.id,
        question_id=question_id,
        selected_option=selected_option,
        is_correct=is_correct,
        file_path=file_path,
        file_data=file_data if 'file_data' in locals() else None,
        file_mimetype=file_mimetype if 'file_mimetype' in locals() else None,
        submission_id=sub_uuid
    )
    db.session.add(new_sub)
    db.session.commit()

    return jsonify({
        'message': 'Answer submitted!',
        'is_correct': is_correct,
        'correct_option': question.correct_option if question.question_type != 'text' else question.correct_text_answer,
        'answer_description': question.answer_description
    }), 201

import io
@app.route('/api/downloads/submission/<string:submission_id>')
def download_submission_proof(submission_id):
    sub = Submission.query.filter_by(submission_id=submission_id).first()
    if not sub:
        return "File Not Found (Submission missing)", 404
        
    if getattr(sub, 'file_data', None):
        # Infer extension from mimetype
        ext_map = {
            'application/pdf': '.pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg'
        }
        ext = ext_map.get(sub.file_mimetype, '.bin')
        
        # Build a safe filename
        username = sub.student.username if sub.student else 'student'
        display_name = f"Proof_{username}_Q{sub.question_id}{ext}"
        
        return send_file(
            io.BytesIO(sub.file_data),
            mimetype=sub.file_mimetype or 'application/octet-stream',
            as_attachment=True,
            download_name=display_name
        )
    # Fallback to local file if missing in DB
    if sub.file_path and sub.file_path.startswith('/static/'):
        local_path = sub.file_path.replace('/static/', '')
        full_path = os.path.join(app.root_path, 'static', local_path)
        if os.path.exists(full_path):
            return send_from_directory(os.path.join(app.root_path, 'static'), local_path)
    
    return send_file(os.path.join(app.root_path, 'static', 'images', 'missing_file.png'), mimetype='image/png')

@app.route('/api/downloads/message/<string:msg_id>')
def download_message_file(msg_id):
    # UUID check (we stored it in file_path as /api/downloads/message/UUID)
    # But wait, we didn't add a message_uuid column. 
    # Let's use the file_path itself to identify, or just search by part of file_path.
    message = Message.query.filter(Message.file_path.like(f'%{msg_id}%')).first()
    if not message:
        return "File Not Found", 404
        
    if message.file_data:
        # Infer extension from mimetype
        ext_map = {
            'application/pdf': '.pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/msword': '.doc',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg'
        }
        ext = ext_map.get(message.file_mimetype, '.bin')
        display_name = f"Attachment_{message.id}{ext}"
        
        return send_file(
            io.BytesIO(message.file_data),
            mimetype=message.file_mimetype or 'application/octet-stream',
            as_attachment=True,
            download_name=display_name
        )
    return "File Not Found (Offline content)", 404

@app.route('/api/student/stats', methods=['GET'])
@token_required
def get_student_stats(current_user):
    if current_user.role != 'student':
        return jsonify({'message': 'Not a student!'}), 403
        
    submissions = Submission.query.filter_by(student_id=current_user.id).all()
    total = len(submissions)
    correct = len([s for s in submissions if s.is_correct])
    average = (correct / total * 100) if total > 0 else 0
    
    solved_questions = [s.question_id for s in submissions]
    
    return jsonify({
        'total_attempted': total,
        'correct_answers': correct,
        'average': round(average, 2),
        'solved_questions': solved_questions
    })

@app.route('/api/student/history', methods=['GET'])
@token_required
def get_student_history(current_user):
    if current_user.role != 'student':
        return jsonify({'message': 'Not a student!'}), 403
        
    submissions = Submission.query.filter_by(student_id=current_user.id).order_by(Submission.timestamp.desc()).all()
    output = []
    for sub in submissions:
        output.append({
            'id': sub.id,
            'question_title': sub.question.title,
            'topic': sub.question.topic,
            'subtopic': sub.question.subtopic,
            'selected_option': sub.selected_option,
            'correct_option': sub.question.correct_option if sub.question.question_type != 'text' else sub.question.correct_text_answer,
            'is_correct': sub.is_correct,
            'file_path': f"/api/downloads/submission/{sub.submission_id}" if sub.file_data else sub.file_path,
            'timestamp': sub.timestamp.strftime('%Y-%m-%d %I:%M %p')
        })
    return jsonify({'history': output})

@app.route('/api/leaderboard', methods=['GET'])
@token_required
def get_leaderboard(current_user):
    # Get all students
    students = User.query.filter_by(role='student').all()
    
    board = []
    for s in students:
        # Count unique correctly answered questions
        solved_ids = db.session.query(Submission.question_id)\
            .filter_by(student_id=s.id, is_correct=True)\
            .distinct().all()
        
        count = len(solved_ids)
        
        # Get latest correct submission timestamp for tie-breaking
        latest_sub = Submission.query.filter_by(student_id=s.id, is_correct=True)\
            .order_by(Submission.timestamp.desc()).first()
        
        # Calculate average for the leaderboard
        all_subs = Submission.query.filter_by(student_id=s.id).all()
        total_all = len(all_subs)
        correct_all = len([sub for sub in all_subs if sub.is_correct])
        avg = (correct_all / total_all * 100) if total_all > 0 else 0

        board.append({
            'name': s.full_name or s.username,
            'username': s.username,
            'answeredQuestions': count,
            'average': round(avg, 2),
            'lastActivity': latest_sub.timestamp.isoformat() if latest_sub else None
        })
    
    # Sort by count desc, then by activity (oldest activity first if tied? or newest?)
    # Usually, if tied, newest activity ranks lower (reached it later).
    # Lambda ranks desc for questions, then asc for timestamp maybe?
    # I'll use timestamp asc so earlier achiever is on top? Wait.
    # High count on top. If tied, earliest achieved is higher?
    # Usually: if tied, the one who REACHED that count EARLIEST is first.
    board.sort(key=lambda x: (-x['answeredQuestions'], x['lastActivity'] or '9999-12-31'))
    
    # Add Rank
    for i, item in enumerate(board):
        item['rank'] = i + 1
        
    return jsonify({'leaderboard': board})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
