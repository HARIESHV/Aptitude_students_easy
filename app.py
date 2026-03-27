import os
import uuid
import threading
import time
import socket
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

import sqlalchemy
from sqlalchemy import func
from sqlalchemy.pool import NullPool
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
    database_url = "postgresql://neondb_owner:npg_6ravLTU9Bxmt@ep-spring-snow-adlcovzz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Handle Render's legacy postgres:// prefix
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

# FORCE direct connection for Stability (strip Neon pooler if present)
if "-pooler" in database_url:
    print("DB Maintenance: Switching to Direct Endpoint for session stability.")
    database_url = database_url.replace("-pooler", "")

# Ensure the URL is clean and includes stable SSL/GSS flags for Neon
if "?" in database_url:
    base_part, _ = database_url.split("?", 1)
    # Reconstruct with optimized parameters for cloud stability
    database_url = f"{base_part}?sslmode=require&connect_timeout=60&gssencmode=disable"
else:
    database_url = f"{database_url}?sslmode=require&connect_timeout=60&gssencmode=disable"

print(f"Connected to Cloud Database (Neon/Postgres)")

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_pre_ping": True,          # Verify connection before each use
    "pool_recycle": 60,             # Still useful to ensure fresh connections
    "poolclass": NullPool,          # FORCE NO POOLING for serverless session stability
    "connect_args": {
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
        "connect_timeout": 60,
        "options": "-c search_path=public -c application_name=aptitude_master"
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
                existing_admin_by_name = User.query.filter_by(username='admin').first()
                if not existing_admin_by_name:
                    any_admin = User.query.filter_by(role='admin').first()
                    if any_admin:
                        any_admin.username = 'admin'
                        db.session.commit()
                    else:
                        new_admin = User(
                            username='admin',
                            password=generate_password_hash('admin123', method='pbkdf2:sha256'),
                            role='admin'
                        )
                        db.session.add(new_admin)
                        db.session.commit()
                else:
                    if existing_admin_by_name.role != 'admin':
                        existing_admin_by_name.role = 'admin'
                        db.session.commit()

                # 3. Keep-Alive Loop
                while True:
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(db.text("SELECT 1"))
                    except Exception as e:
                        err_str = str(e)
                        print(f"DB Keep-alive: connection lost. Disposing pool...")
                        try:
                            db.engine.dispose()
                        except Exception:
                            pass
                        db.session.remove()
                        break 
                    time.sleep(45)
        except Exception as e:
            err_str = str(e)
            with app.app_context():
                try:
                    db.engine.dispose()
                except Exception:
                    pass
                db.session.remove()
            
            if "translate host name" in err_str.lower() or "timeout expired" in err_str.lower():
                print(f"DB Maintenance: Cloud DNS/Network error detected. Waiting 30s...")
                time.sleep(30)
            elif "EOF" in err_str or "SSL" in err_str or "connection reset" in err_str.lower():
                print(f"DB Maintenance: Managed connection interrupted, retrying in 10s...")
                time.sleep(10)
            else:
                print(f"DB Maintenance Loop Error: {err_str[:120]}")
                time.sleep(10)

# --- Global Error Handler ---
@app.errorhandler(Exception)
def handle_exception(e):
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return e
    
    err_msg = str(e).lower()
    if "could not translate host name" in err_msg or "connection reset" in err_msg or "timeout expired" in err_msg:
        return jsonify({
            "message": "Database connectivity mission failed. Re-establishing uplink...",
            "details": str(e)
        }), 503
    
    return jsonify({"message": "Server error", "details": str(e)}), 500

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
            auth_header = request.headers['Authorization']
            token = auth_header.split(" ")[1] if " " in auth_header else auth_header

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            user_id = data.get('user_id')
        except Exception:
            return jsonify({'message': 'Authentication failed!'}), 401

        current_user = None
        db_error = None
        for i in range(5):
            try:
                current_user = db.session.get(User, user_id)
                if current_user: break
            except Exception as e:
                db_error = e
                err_str = str(e).lower()
                if "translate host name" in err_str or "connection" in err_str or "reset" in err_str or "eof" in err_str:
                    print(f"Auth DB Retry {i+1}/5")
                    try: db.engine.dispose()
                    except Exception: pass
                    db.session.remove()
                    time.sleep(1 + i)
                else: break

        if db_error and not current_user:
            return jsonify({'message': 'Database uplink temporarily down. Retrying mission...'}), 503

        if not current_user:
             return jsonify({'message': 'User session no longer valid!'}), 401
             
        return f(current_user, *args, **kwargs)
    return decorated

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
def index(): return render_template('index.html')

@app.route('/login')
def login_page(): return render_template('login.html')

@app.route('/admin_dashboard')
def admin_dashboard(): return render_template('admin.html')

@app.route('/student_dashboard')
def student_dashboard(): return render_template('student.html')

@app.route('/quiz')
def quiz_page(): return render_template('quiz.html')

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
        
        if User.query.filter(db.func.lower(User.username) == username.lower()).first():
            return jsonify({'message': 'User already exists!'}), 400
            
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(username=username, password=hashed_password, role=role, full_name=full_name)
        db.session.add(new_user)
        db.session.commit()
        
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
        username = raw_username.strip() if raw_username else None
        password = raw_password.strip() if raw_password else None
        expected_role = data.get('role')

        if not username or not password:
            return jsonify({'message': 'Missing credentials'}), 400

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
        
        old_correct_option = question.correct_option
        old_correct_text = question.correct_text_answer
        old_type = question.question_type

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
        
        if (question.correct_option != old_correct_option or 
            question.correct_text_answer != old_correct_text or 
            question.question_type != old_type):
            
            submissions = Submission.query.filter_by(question_id=id).all()
            for sub in submissions:
                if question.question_type == 'text':
                    if sub.selected_option and question.correct_text_answer:
                        sub.is_correct = str(sub.selected_option).strip().lower() == str(question.correct_text_answer).strip().lower()
                    else:
                        sub.is_correct = False
                else:
                    sub.is_correct = (sub.selected_option == question.correct_option)
        
        db.session.commit()
        return jsonify({'message': 'Question updated and student scores re-evaluated!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Update failed: {str(e)}'}), 500

@app.route('/api/questions/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_question(current_user, id):
    try:
        question = db.session.get(Question, id)
        if not question:
            return jsonify({'message': 'Question not found!'}), 404
        Submission.query.filter_by(question_id=id).delete()
        db.session.delete(question)
        db.session.commit()
        return jsonify({'message': 'Question deleted!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Delete failed: {str(e)}'}), 500

@app.route('/api/students', methods=['GET'])
@token_required
@admin_required
def get_students(current_user):
    students = User.query.filter_by(role='student').all()
    output = []
    for std in students:
        submissions = Submission.query.filter_by(student_id=std.id).all()
        total = len(submissions)
        correct = len([s for s in submissions if s.is_correct])
        average = (correct / total * 100) if total > 0 else 0
        output.append({
            'id': std.id,
            'name': std.full_name or std.username,
            'username': std.username,
            'average': float("{:.2f}".format(average)),
            'total_submissions': total,
            'correct': correct
        })
    output.sort(key=lambda x: (-x['correct'], -x['average']))
    return jsonify({'students': output})

@app.route('/api/admin/stats', methods=['GET'])
@token_required
@admin_required
def get_admin_stats(current_user):
    total_students = User.query.filter_by(role='student').count()
    total_submissions = Submission.query.count()
    total_questions = Question.query.count()
    correct_submissions = Submission.query.filter_by(is_correct=True).count()
    global_avg = (correct_submissions / total_submissions * 100) if total_submissions > 0 else 0
        
    return jsonify({
        'total_students': total_students,
        'total_submissions': total_submissions,
        'total_questions': total_questions,
        'global_average': round(global_avg, 2)
    })

@app.route('/api/students/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_student(current_user, id):
    student = db.session.get(User, id)
    if not student: return jsonify({'message': 'Student not found!'}), 404
    Submission.query.filter_by(student_id=id).delete()
    Message.query.filter((Message.sender_id == id) | (Message.receiver_id == id)).delete()
    db.session.delete(student)
    db.session.commit()
    return jsonify({'message': 'Student deleted!'})

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
        question_id = request.form.get('question_id')
        selected_option = request.form.get('selected_option')
        file_path = None
        if 'file' in request.files:
            file = request.files['file']
            if file.filename != '':
                filename = secure_filename(file.filename)
                file_data = file.read()
                file_mimetype = file.mimetype
                sub_uuid = str(uuid.uuid4())
                file_path = f'/api/downloads/submission/{sub_uuid}'

    if not question_id: return jsonify({'message': 'Missing data!'}), 400

    question = db.session.get(Question, int(question_id))
    if not question: return jsonify({'message': 'Question not found!'}), 404

    if question.question_type == 'text':
        is_correct = str(selected_option).strip().lower() == str(question.correct_text_answer).strip().lower() if selected_option and question.correct_text_answer else False
    else:
        is_correct = (selected_option == question.correct_option)
    
    sub_uuid = sub_uuid if 'sub_uuid' in locals() else str(uuid.uuid4())
    new_sub = Submission(
        student_id=current_user.id,
        question_id=int(question_id),
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

@app.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    notifications = []
    
    # 1. Fetch meeting links
    meetlinks = MeetLink.query.order_by(MeetLink.created_at.desc()).limit(5).all()
    for ml in meetlinks:
        notifications.append({
            'id': f'ml_{ml.id}',
            'timestamp': ml.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'type': 'meetlink',
            'title': 'New Live Session',
            'content': ml.title
        })

    # 2. Fetch messages
    if current_user.role == 'student':
        messages = Message.query.filter(
            (Message.receiver_id == current_user.id) | (Message.receiver_id == None)
        ).order_by(Message.timestamp.desc()).limit(5).all()
    else:
        messages = Message.query.order_by(Message.timestamp.desc()).limit(5).all()
        
    for msg in messages:
        notifications.append({
            'id': f'msg_{msg.id}',
            'timestamp': msg.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'type': 'message',
            'title': 'New Transmission' if current_user.role == 'student' else f'Log: {msg.sender.username}',
            'content': msg.content[:100] + '...' if len(msg.content) > 100 else msg.content
        })

    # 3. Submissions (Admin-only view of global activity)
    if current_user.role == 'admin':
        subs = Submission.query.options(sqlalchemy.orm.joinedload(Submission.student), sqlalchemy.orm.joinedload(Submission.question)).order_by(Submission.timestamp.desc()).limit(5).all()
        for s in subs:
            notifications.append({
                'id': f'sub_{s.id}',
                'timestamp': s.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                'type': 'submission',
                'title': 'Quiz Update',
                'content': f'{s.student.username} solved {s.question.title}',
                'is_correct': s.is_correct
            })

    notifications.sort(key=lambda x: x['timestamp'], reverse=True)
    return jsonify({'notifications': notifications[:10]})

@app.route('/api/leaderboard', methods=['GET'])
@token_required
def get_leaderboard(current_user):
    students = User.query.filter_by(role='student').all()
    board = []
    for s in students:
        solved_ids = db.session.query(Submission.question_id).filter_by(student_id=s.id, is_correct=True).distinct().all()
        count = len(solved_ids)
        latest_sub = Submission.query.filter_by(student_id=s.id, is_correct=True).order_by(Submission.timestamp.desc()).first()
        all_subs = Submission.query.filter_by(student_id=s.id).all()
        avg = (len([sub for sub in all_subs if sub.is_correct]) / len(all_subs) * 100) if all_subs else 0
        board.append({
            'name': s.full_name or s.username,
            'username': s.username,
            'answeredQuestions': count,
            'average': round(avg, 2),
            'lastActivity': latest_sub.timestamp.isoformat() if latest_sub else None
        })
    board.sort(key=lambda x: (-x['answeredQuestions'], -x['average'], x['lastActivity'] or '9999-12-31'))
    for i, item in enumerate(board): item['rank'] = i + 1
    return jsonify({'leaderboard': board})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
