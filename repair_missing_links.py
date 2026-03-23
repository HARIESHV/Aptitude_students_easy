import os
from app import app, db
from models import Submission

def repair():
    with app.app_context():
        # 1. Repair Submissions
        subs = Submission.query.filter(Submission.file_path != None, Submission.file_data == None).all()
        
        # 2. Repair Messages
        msgs = Message.query.filter(Message.file_path != None, Message.file_data == None).all()
        
        print(f"Found {len(subs)} candidate submissions and {len(msgs)} candidate messages.")
        all_items = subs + msgs
        repaired_count = 0
        upload_folder = os.path.join(app.root_path, 'static', 'uploads')
        print(f"Checking in folder: {upload_folder}")
        
        for item in all_items:
            filename = item.file_path.split('/')[-1]
            filepath = os.path.join(upload_folder, filename)
            
            exists = os.path.exists(filepath)
            print(f"Checking {filename}... exists on disk: {exists}")
            
            if not exists:
                print(f"Repairing {filename} -> placeholder")
                item.file_path = "/static/images/missing_file.png"
                repaired_count += 1
        
        if repaired_count > 0:
            db.session.commit()
            print(f"Successfully repaired {repaired_count} broken links (Submissions + Messages).")
        else:
            print("No broken links found that needed repair.")

if __name__ == "__main__":
    from models import Submission, Message
    repair()
