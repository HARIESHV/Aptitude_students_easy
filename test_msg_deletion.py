import requests
import sys

BASE_URL = "http://127.0.0.1:5000/api"

def register(username, password, role="student"):
    return requests.post(f"{BASE_URL}/register", json={"username": username, "password": password, "role": role})

def login(username, password, role):
    return requests.post(f"{BASE_URL}/login", json={"username": username, "password": password, "role": role}).json()

def send_message(token, content, receiver_id=None):
    return requests.post(f"{BASE_URL}/messages", json={"content": content, "receiver_id": receiver_id}, headers={"Authorization": f"Bearer {token}"})

def get_messages(token):
    return requests.get(f"{BASE_URL}/messages", headers={"Authorization": f"Bearer {token}"}).json()["messages"]

def delete_message(token, msg_id):
    return requests.delete(f"{BASE_URL}/messages/{msg_id}", headers={"Authorization": f"Bearer {token}"})

def test_msg_deletion():
    try:
        # Register if needed
        register("admin_msg_test", "pw1", "admin")
        register("std_msg_test", "pw1", "student")
        
        admin = login("admin_msg_test", "pw1", "admin")
        std = login("std_msg_test", "pw1", "student")
        
        # 1. Std sends message
        res = send_message(std["token"], "DeleteMe")
        msg_id = None
        for m in get_messages(std["token"]):
            if m["content"] == "DeleteMe":
                msg_id = m["id"]
                break
        
        # 2. Std deletes own message
        print(f"Action: Student deletes own message {msg_id}")
        del_res = delete_message(std["token"], msg_id)
        if del_res.status_code == 200:
            print("PASS: Student deleted own message.")
        else:
            print(f"FAIL: Student delete own msg failed: {del_res.status_code}")
            return 1
            
        # 3. Admin sends message to Student
        send_message(admin["token"], "AdminSecret", receiver_id=std["user_id"])
        msg_id = None
        for m in get_messages(std["token"]):
            if m["content"] == "AdminSecret":
                msg_id = m["id"]
                break
        
        # 4. Student tries to delete Admin's message
        print(f"Action: Student tries to delete Admin's message {msg_id}")
        del_res = delete_message(std["token"], msg_id)
        if del_res.status_code == 403:
            print("PASS: Student denied deleting Admin's message.")
        else:
            print(f"FAIL: Student allowed to delete Admin's message! Status: {del_res.status_code}")
            return 1
            
        # 5. Admin deletes message
        print(f"Action: Admin deletes message {msg_id}")
        del_res = delete_message(admin["token"], msg_id)
        if del_res.status_code == 200:
            print("PASS: Admin deleted message.")
        else:
            print(f"FAIL: Admin delete failed: {del_res.status_code}")
            return 1
            
        print("ALL MESSAGE DELETION TESTS PASSED")
        return 0
    except Exception as e:
        print(f"ERROR: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(test_msg_deletion())
