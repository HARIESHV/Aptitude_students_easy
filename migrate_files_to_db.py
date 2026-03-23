import os
import io
import mimetypes
from app import app, db
from models import Submission

def migrate():
    with app.app_context():
        # Find submissions that have a file_path pointing to static/uploads
        # and don't have file_data yet
        submissions = Submission.query.filter(
            Submission.file_path.like('/static/uploads/%'),
            Submission.file_data == None
        ).all()
        
        print(f"Found {len(submissions)} submissions to migrate.")
        
        upload_folder = os.path.join(app.root_path, 'static', 'uploads')
        
        migrated_count = 0
        error_count = 0
        
        for sub in submissions:
            filename = sub.file_path.split('/')[-1]
            filepath = os.path.join(upload_folder, filename)
            
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'rb') as f:
                        file_data = f.read()
                    
                    # Get mimetype
                    mimetype, _ = mimetypes.guess_type(filepath)
                    
                    # Update submission
                    sub.file_data = file_data
                    sub.file_mimetype = mimetype or 'application/octet-stream'
                    
                    # Update file_path to use the API link
                    sub.file_path = f"/api/downloads/submission/{sub.submission_id}"
                    
                    migrated_count += 1
                    print(f"Migrated: {filename} for submission {sub.id}")
                except Exception as e:
                    print(f"Error migrating {filename}: {e}")
                    error_count += 1
            else:
                print(f"File not found on disk: {filename} (Path in DB: {sub.file_path})")
                # Even if file is missing, we might want to update the link if we ever recover it,
                # but for now we just leave it or mark it.
        
        if migrated_count > 0:
            db.session.commit()
            print(f"Successfully migrated {migrated_count} files to database.")
        else:
            print("No files were migrated.")
            
        if error_count > 0:
            print(f"Encountered {error_count} errors during migration.")

if __name__ == "__main__":
    migrate()
