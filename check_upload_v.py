from app import app
import os
print(f"UPLOAD_FOLDER: {app.config['UPLOAD_FOLDER']}")
print(f"Exists: {os.path.exists(app.config['UPLOAD_FOLDER'])}")
print(f"Contents: {os.listdir(app.config['UPLOAD_FOLDER'])}")
