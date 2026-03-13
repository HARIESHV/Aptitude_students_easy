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

def test_privacy():
    try:
        # Register if needed (might fail if exists, that's fine)
        register("admin_test2", "pw1", "admin")
        register("std_a2", "pw1", "student")
        register("std_b2", "pw1", "student")
        
        admin = login("admin_test2", "pw1", "admin")
        std_a = login("std_a2", "pw1", "student")
        std_b = login("std_b2", "pw1", "student")
        
        # 1. Std A -> Admin
        send_message(std_a["token"], "SecretA", receiver_id=admin["user_id"])
        
        # 2. Verify Std B doesn't see it
        b_msgs = [m["content"] for m in get_messages(std_b["token"])]
        if "SecretA" in b_msgs:
            print("FAIL: Std B saw Std A message")
            return 1
            
        # 3. Admin -> Broadcast
        send_message(admin["token"], "PublicInfo", receiver_id=None)
        
        # 4. Verify both see
        a_msgs = [m["content"] for m in get_messages(std_a["token"])]
        b_msgs = [m["content"] for m in get_messages(std_b["token"])]
        if "PublicInfo" not in a_msgs or "PublicInfo" not in b_msgs:
            print("FAIL: Broadcast failed")
            return 1
            
        # 5. Admin -> Std A
        send_message(admin["token"], "PrivateReply", receiver_id=std_a["user_id"])
        
        # 6. Verify Std B doesn't see
        b_msgs = [m["content"] for m in get_messages(std_b["token"])]
        if "PrivateReply" in b_msgs:
            print("FAIL: Std B saw private reply")
            return 1
            
        print("ALL TESTS PASSED")
        return 0
    except Exception as e:
        print(f"ERROR: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(test_privacy())
