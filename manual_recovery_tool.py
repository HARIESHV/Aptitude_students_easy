import psycopg2
from psycopg2.extras import RealDictCursor

# --- CONFIGURATION ---
SOURCE_URL = "postgresql://neondb_owner:npg_6ravLTU9Bxmt@ep-spring-snow-adlcovzz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
TARGET_URL = "postgresql://neondb_owner:npg_STrZjGzF32Vn@ep-sweet-mouse-ampyhmgg-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def migrate_essential_data():
    try:
        print(f"🔗 Testing connection to OLD: {SOURCE_URL.split('@')[1]}")
        old_conn = psycopg2.connect(SOURCE_URL)
        old_cur = old_conn.cursor(cursor_factory=RealDictCursor)
        
        print(f"🔗 Testing connection to NEW: {TARGET_URL.split('@')[1]}")
        new_conn = psycopg2.connect(TARGET_URL)
        new_cur = new_conn.cursor()
        
        # 1. USERS
        print("👤 Fetching Students...")
        old_cur.execute("SELECT id, username, password, role, full_name FROM \"user\" WHERE role = 'student'")
        rows = old_cur.fetchall()
        for r in rows:
            new_cur.execute(
                "INSERT INTO \"user\" (id, username, password, role, full_name) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (username) DO NOTHING",
                (r['id'], r['username'], r['password'], r['role'], r['full_name'])
            )
        new_conn.commit()
        print(f"   ✅ Rescued {len(rows)} students.")

        # 2. QUESTIONS
        print("❓ Fetching Questions...")
        old_cur.execute("SELECT id, topic, subtopic, time_limit, title, description, option_a, option_b, option_c, option_d, correct_option, question_type, answer_description, correct_text_answer FROM question")
        rows = old_cur.fetchall()
        for r in rows:
            new_cur.execute(
                "INSERT INTO question (id, topic, subtopic, time_limit, title, description, option_a, option_b, option_c, option_d, correct_option, question_type, answer_description, correct_text_answer) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (r['id'], r['topic'], r['subtopic'], r['time_limit'], r['title'], r['description'], r['option_a'], r['option_b'], r['option_c'], r['option_d'], r['correct_option'], r['question_type'], r['answer_description'], r['correct_text_answer'])
            )
        new_conn.commit()
        print(f"   ✅ Rescued {len(rows)} questions.")

        # 3. SUBMISSIONS (Metadata only)
        print("📝 Fetching Submissions...")
        old_cur.execute("SELECT id, student_id, question_id, selected_option, is_correct, file_path, submission_id, timestamp FROM submission")
        rows = old_cur.fetchall()
        for r in rows:
            new_cur.execute(
                "INSERT INTO submission (id, student_id, question_id, selected_option, is_correct, file_path, submission_id, timestamp) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (submission_id) DO NOTHING",
                (r['id'], r['student_id'], r['question_id'], r['selected_option'], r['is_correct'], r['file_path'], r['submission_id'], r['timestamp'])
            )
        new_conn.commit()
        print(f"   ✅ Rescued {len(rows)} submissions.")

        print("\n🎉 MIGRATION SUCCESSFUL! Data is now in the new project.")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
    finally:
        if 'old_conn' in locals(): old_conn.close()
        if 'new_conn' in locals(): new_conn.close()

if __name__ == "__main__":
    migrate_essential_data()
