
import requests
import json

API_BASE = "http://localhost:5000/api"

def test_submit():
    # 1. Login
    login_data = {"username": "student1", "password": "password123"}
    res = requests.post(f"{API_BASE}/login", json=login_data)
    if res.status_code != 200:
        # Try to register if login fails
        print("Login failed, trying to register...")
        reg_data = {"username": "student1", "password": "password123", "full_name": "Student One"}
        res = requests.post(f"{API_BASE}/register", json=reg_data)
        if res.status_code != 201:
            print(f"Registration failed: {res.text}")
            return
    
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get questions
    res = requests.get(f"{API_BASE}/questions", headers=headers)
    if not res.ok:
        print(f"Failed to get questions: {res.text}")
        return
    
    questions = res.json()["questions"]
    if not questions:
        print("No questions found")
        return
    
    q_id = questions[0]["id"]
    
    # 3. Submit
    submit_data = {"question_id": q_id, "selected_option": "A"}
    res = requests.post(f"{API_BASE}/submissions", headers=headers, data=submit_data)
    print(f"Submit result: {res.status_code}")
    print(res.json())
    
    # 4. Check if stored
    res = requests.get(f"{API_BASE}/student/history", headers=headers)
    if res.ok:
        print("History:")
        print(res.json())
    else:
        print(f"Failed to get history: {res.text}")

if __name__ == "__main__":
    test_submit()
