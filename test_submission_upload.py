import requests
import sys
import os

BASE_URL = "http://127.0.0.1:5000/api"

def register(username, password, role="student"):
    return requests.post(f"{BASE_URL}/register", json={"username": username, "password": password, "role": role})

def login(username, password, role):
    return requests.post(f"{BASE_URL}/login", json={"username": username, "password": password, "role": role}).json()

def test_submission_upload():
    try:
        # Setup
        register("tester_sub_file", "pw123", "student")
        register("admin_sub_file", "pw123", "admin")
        
        std = login("tester_sub_file", "pw123", "student")
        admin = login("admin_sub_file", "pw123", "admin")
        
        # Get a question ID
        q_res = requests.get(f"{BASE_URL}/questions", headers={"Authorization": f"Bearer {std['token']}"})
        questions = q_res.json()["questions"]
        if not questions:
            print("SKIP: No questions available to test.")
            return 0
        q_id = questions[0]["id"]
        
        # Create a mock file
        with open("mock_sub.txt", "w") as f:
            f.write("This is a mock submission file.")
        
        # Submit with file
        print(f"Action: Submitting answer for question {q_id} with file")
        with open("mock_sub.txt", "rb") as f:
            files = {"file": f}
            data = {"question_id": q_id, "selected_option": "A"}
            res = requests.post(f"{BASE_URL}/submissions", data=data, files=files, headers={"Authorization": f"Bearer {std['token']}"})
        
        if res.status_code == 201:
            print("PASS: Submission with file created (201).")
            sub_data = res.json()
            if "Answer submitted!" in sub_data["message"]:
                 print("PASS: Got success message.")
            else:
                 print("FAIL: Missing success message.")
                 return 1
        else:
            print(f"FAIL: Submission failed with status {res.status_code}: {res.text}")
            return 1
            
        # Verify as Admin
        print("Action: Verifying submission list as Admin")
        res_admin = requests.get(f"{BASE_URL}/submissions", headers={"Authorization": f"Bearer {admin['token']}"})
        subs = res_admin.json()["submissions"]
        
        found = False
        for s in subs:
            if s["student"] == "tester_sub_file" and s["file_path"]:
                print(f"PASS: Found submission with file_path: {s['file_path']}")
                found = True
                break
        
        if not found:
            print("FAIL: Submission or file_path not found in Admin list.")
            return 1
            
        print("Cleanup mock file")
        os.remove("mock_sub.txt")
        print("VERIFICATION SUCCESSFUL")
        return 0
        
    except Exception as e:
        print(f"ERROR: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(test_submission_upload())
