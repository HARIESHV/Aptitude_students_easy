import os
import psycopg2
from psycopg2.extras import RealDictCursor

# --- CONFIGURATION ---
# OLD DATABASE (The locked one)
OLD_DB_URL = "postgresql://neondb_owner:npg_6ravLTU9Bxmt@ep-spring-snow-adlcovzz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# NEW DATABASE (The active one)
NEW_DB_URL = "postgresql://neondb_owner:npg_STrZjGzF32Vn@ep-sweet-mouse-ampyhmgg-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def restore():
    try:
        print("🔗 Connecting to OLD database...")
        old_conn = psycopg2.connect(OLD_DB_URL)
        old_cur = old_conn.cursor(cursor_factory=RealDictCursor)
        
        print("🔗 Connecting to NEW database...")
        new_conn = psycopg2.connect(NEW_DB_URL)
        new_cur = new_conn.cursor()
        
        # 1. Restore USERS
        print("👤 Fetching Students...")
        old_cur.execute("SELECT id, username, password, role, full_name FROM \"user\" WHERE role = 'student'")
        students = old_cur.fetchall()
        print(f"   Found {len(students)} students.")
        for s in students:
            try:
                new_cur.execute(
                    "INSERT INTO \"user\" (id, username, password, role, full_name) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (username) DO NOTHING",
                    (s['id'], s['username'], s['password'], s['role'], s['full_name'])
                )
            except Exception as e:
                print(f"   Skipping user {s['username']}: {e}")
        new_conn.commit()
        
        # 2. Restore QUESTIONS
        print("❓ Fetching Questions...")
        old_cur.execute("SELECT id, topic, subtopic, time_limit, title, description, option_a, option_b, option_c, option_d, correct_option, question_type, answer_description, correct_text_answer, created_at FROM question")
        questions = old_cur.fetchall()
        print(f"   Found {len(questions)} questions.")
        for q in questions:
            new_cur.execute(
                "INSERT INTO question (id, topic, subtopic, time_limit, title, description, option_a, option_b, option_c, option_d, correct_option, question_type, answer_description, correct_text_answer, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (q['id'], q['topic'], q['subtopic'], q['time_limit'], q['title'], q['description'], q['option_a'], q['option_b'], q['option_c'], q['option_d'], q['correct_option'], q['question_type'], q['answer_description'], q['correct_text_answer'], q['created_at'])
            )
        new_conn.commit()
        
        # 3. Restore SUBMISSIONS (Skipping file_data to avoid quota lock)
        print("📝 Fetching Submissions (Excluding heavy binary data)...")
        old_cur.execute("SELECT id, student_id, question_id, selected_option, is_correct, file_path, submission_id, timestamp FROM submission")
        subs = old_cur.fetchall()
        print(f"   Found {len(subs)} records.")
        for s in subs:
            new_cur.execute(
                "INSERT INTO submission (id, student_id, question_id, selected_option, is_correct, file_path, submission_id, timestamp) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (submission_id) DO NOTHING",
                (s['id'], s['student_id'], s['question_id'], s['selected_option'], s['is_correct'], s['file_path'], s['submission_id'], s['timestamp'])
            )
        new_conn.commit()
        
        # 4. Restore MESSAGES (Skipping file_data)
        print("💬 Fetching Messages...")
        old_cur.execute("SELECT sender_id, sender_role, receiver_id, content, file_path, timestamp FROM message")
        msgs = old_cur.fetchall()
        for m in msgs:
            new_cur.execute(
                "INSERT INTO message (sender_id, sender_role, receiver_id, content, file_path, timestamp) VALUES (%s, %s, %s, %s, %s, %s)",
                (m['sender_id'], m['sender_role'], m['receiver_id'], m['content'], m['file_path'], m['timestamp'])
            )
        new_conn.commit()
        
        # 5. Restore MEETLINKS
        print("📹 Fetching Meet Links...")
        old_cur.execute("SELECT title, url, created_at FROM meet_link")
        links = old_cur.fetchall()
        for l in links:
            new_cur.execute(
                "INSERT INTO meet_link (title, url, created_at) VALUES (%s, %s, %s)",
                (l['title'], l['url'], l['created_at'])
            )
        new_conn.commit()
        
        print("\n🎉 SUCCESS: Data has been restored to the new link!")
        print("Note: Images/Proofs were not transferred to keep bandwidth low, but links to them were preserved.")
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        if "quota" in str(e).lower():
            print("\n⚠️ The old project is still too locked down to allow even small data transfers.")
    finally:
        if 'old_conn' in locals(): old_conn.close()
        if 'new_conn' in locals(): new_conn.close()

if __name__ == "__main__":
    restore()
