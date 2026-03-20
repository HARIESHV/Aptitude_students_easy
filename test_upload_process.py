import requests
import os

API_BASE = "http://127.0.0.1:5000/api"

def test_upload():
    # 1. Login as a student
    # Note: I'll assume student1 exists. If not, I'll check.
    login_data = {"username": "student1", "password": "password123"}
    res = requests.post(f"{API_BASE}/login", json=login_data)
    if res.status_code != 200:
        print(f"Login failed: {res.json()}")
        return
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get questions
    res = requests.get(f"{API_BASE}/questions", headers=headers)
    if not res.ok:
        print("Failed to get questions")
        return
    questions = res.json()["questions"]
    if not questions:
        print("No questions to answer")
        return
    q_id = questions[0]["id"]

    # 3. Create dummy file
    dummy_path = "proof_test.txt"
    with open(dummy_path, "w") as f:
        f.write("This is a test proof.")

    # 4. Submit with file
    files = {"file": open(dummy_path, "rb")}
    data = {"question_id": q_id, "selected_option": "A"}
    res = requests.post(f"{API_BASE}/submissions", headers=headers, data=data, files=files)
    print(f"Submit status: {res.status_code}")
    print(f"Response: {res.json()}")

    # 5. Check local static/uploads
    upload_dir = r"static\uploads"
    print(f"Contents of {upload_dir}: {os.listdir(upload_dir)}")

if __name__ == "__main__":
    test_upload()
