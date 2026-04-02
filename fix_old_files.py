"""
Emergency Migration: Link old-format disk files to DB submissions.

Old disk files: sub_TIMESTAMP_name.ext
New format:     UUID.ext (stored as file_path in DB)

This script:
1. Finds all submissions in DB where file is MISSING from disk
2. Finds old-format files in uploads dir
3. Copies the old file to UUID.ext so the download route can find it
4. Also compresses and stores it in DB as a backup blob
"""

import os
import zlib
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import app as flask_app
from models import db, Submission

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')

with flask_app.app.app_context():
    # 1. Get all submissions with a file path
    subs = Submission.query.filter(Submission.file_path != None).all()
    uploads_files = os.listdir(UPLOAD_FOLDER)
    
    print(f"Found {len(subs)} submissions with file paths")
    print(f"Files on disk: {uploads_files}")
    print()
    
    for sub in subs:
        if not sub.file_path:
            continue
            
        # Extract UUID from path like /api/downloads/submission/UUID.ext
        path_part = sub.file_path.split('/')[-1]  # e.g. "UUID.jpeg"
        expected_filename = path_part  # e.g. "b72bf45e-9fd9-41b8-a57e-4fd2c264e9cf.jpeg"
        expected_path = os.path.join(UPLOAD_FOLDER, expected_filename)
        ext = expected_filename.rsplit('.', 1)[-1] if '.' in expected_filename else 'bin'
        
        print(f"Submission ID {sub.id}: looking for '{expected_filename}'")
        
        if os.path.exists(expected_path):
            print(f"  ✅ File exists on disk: {expected_filename}")
            # Ensure DB blob exists too
            if not sub.file_data:
                print(f"  📦 Adding DB blob backup...")
                with open(expected_path, 'rb') as f:
                    raw = f.read()
                # Try decompressing first (might already be compressed)
                try:
                    actual_data = zlib.decompress(raw)
                except:
                    actual_data = raw
                sub.file_data = zlib.compress(actual_data)
                if not sub.file_mimetype:
                    import mimetypes
                    mt, _ = mimetypes.guess_type(expected_filename)
                    sub.file_mimetype = mt or 'application/octet-stream'
                db.session.commit()
                print(f"  ✅ DB blob stored (compressed)")
        else:
            print(f"  ❌ File NOT on disk. Searching old-format files...")
            # Find any old-format file with matching extension
            matching_old = [f for f in uploads_files if f.endswith(f'.{ext}') and f.startswith('sub_')]
            
            if matching_old:
                # Pick the closest match (could be same ext)
                old_file = matching_old[0]
                old_path = os.path.join(UPLOAD_FOLDER, old_file)
                print(f"  🔎 Found old file: {old_file}")
                
                with open(old_path, 'rb') as f:
                    raw = f.read()
                
                # Decompress if compressed, then recompress
                try:
                    actual_data = zlib.decompress(raw)
                    print(f"  📦 Old file was compressed, decompressed successfully")
                except:
                    actual_data = raw
                    print(f"  📦 Old file was not compressed / read raw bytes")
                
                # Write as UUID-named file (decompressed - plain bytes for new system)
                # Actually, the download route decompresses, so store compressed
                compressed = zlib.compress(actual_data)
                with open(expected_path, 'wb') as f:
                    f.write(compressed)
                print(f"  ✅ Copied to UUID format: {expected_filename}")
                
                # Also store in DB as blob backup
                sub.file_data = compressed
                import mimetypes
                mt, _ = mimetypes.guess_type(expected_filename)
                sub.file_mimetype = mt or 'application/octet-stream'
                db.session.commit()
                print(f"  ✅ DB blob updated")
            else:
                print(f"  ⚠️  No matching old-format file found for .{ext}")
                # If has DB blob, save to disk
                if sub.file_data:
                    print(f"  💾 DB blob exists! Saving to disk...")
                    with open(expected_path, 'wb') as f:
                        f.write(sub.file_data)
                    print(f"  ✅ Restored from DB to disk: {expected_filename}")
                else:
                    print(f"  🔴 No recovery possible for submission {sub.id}")
        
        print()
    
    print("Migration complete!")
