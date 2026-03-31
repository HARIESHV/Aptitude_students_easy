from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import deferred
from datetime import datetime, timedelta

db = SQLAlchemy()

def ist_now():
    # Tamil Nadu IST is UTC + 5:30
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, index=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), index=True, nullable=False) # 'admin' or 'student'
    full_name = db.Column(db.String(255), nullable=True)

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(100), nullable=False, default='General')
    subtopic = db.Column(db.String(100), nullable=False, default='General')
    time_limit = db.Column(db.Integer, default=0) # Total seconds
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(200), nullable=True)
    option_b = db.Column(db.String(200), nullable=True)
    option_c = db.Column(db.String(200), nullable=True)
    option_d = db.Column(db.String(200), nullable=True)
    correct_option = db.Column(db.String(10), nullable=True) # 'A', 'B', 'C', 'D'
    question_type = db.Column(db.String(20), default='mcq')
    answer_description = db.Column(db.Text, nullable=True)
    correct_text_answer = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=ist_now)

class Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    selected_option = db.Column(db.Text, nullable=True)
    is_correct = db.Column(db.Boolean, nullable=False)
    file_path = db.Column(db.String(255), nullable=True)
    file_data = deferred(db.Column(db.LargeBinary, nullable=True))
    file_mimetype = db.Column(db.String(100), nullable=True)
    submission_id = db.Column(db.String(36), unique=True, nullable=False)
    timestamp = db.Column(db.DateTime, default=ist_now)
    
    student = db.relationship('User', backref=db.backref('submissions', lazy=True, cascade="all, delete-orphan"))
    question = db.relationship('Question', backref=db.backref('submissions', lazy=True))

class MeetLink(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=ist_now)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sender_role = db.Column(db.String(20), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # null means broadcast to all
    content = db.Column(db.Text, nullable=False)
    file_path = db.Column(db.String(255), nullable=True)
    file_data = deferred(db.Column(db.LargeBinary, nullable=True))
    file_mimetype = db.Column(db.String(100), nullable=True)
    timestamp = db.Column(db.DateTime, default=ist_now)
    
    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_messages', lazy=True, cascade="all, delete-orphan"))
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref=db.backref('received_messages', lazy=True, cascade="all, delete-orphan"))
