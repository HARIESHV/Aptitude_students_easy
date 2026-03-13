import requests
import os
import uuid

BASE_URL = "http://127.0.0.1:5000/api"

def create_submission_with_file():
    suffix = str(uuid.uuid4())[:8]
    username = f"std_{suffix}"
    password = "pw"
    
    # 1. Register/Login
    requests.post(f"{BASE_URL}/register", json={"username": username, "password": password, "role": "student"})
    login_resp = requests.post(f"{BASE_URL}/login", json={"username": username, "password": password, "role": "student"}).json()
    token = login_resp['token']
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get a question
    q_resp = requests.get(f"{BASE_URL}/questions", headers=headers).json()
    q_id = q_resp['questions'][0]['id']
    
    # 3. Submit with file
    with open("test_upload.pdf", "w") as f:
        f.write("%PDF-1.4 Mock Content")
    
    with open("test_upload.pdf", "rb") as f:
        files = {"file": f}
        data = {"question_id": q_id, "selected_option": "A"}
        requests.post(f"{BASE_URL}/submissions", data=data, files=files, headers=headers)
    
    os.remove("test_upload.pdf")
    print("Created submission for", username)

if __name__ == "__main__":
    create_submission_with_file()
