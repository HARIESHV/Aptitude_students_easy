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
            "message": "Database connectivity mission failed. Re-establishing...",
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
            return jsonify({'message': 'Database uplink down. Retrying...'}), 503

        if not current_user:
             return jsonify({'message': 'User session invalid!'}), 401
             
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

@app.route('/api/ping', methods=['GET'])
