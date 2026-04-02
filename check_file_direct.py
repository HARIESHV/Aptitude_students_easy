import os
upload_folder = r'c:\Users\harie\Desktop\hh\Aptitude_students_easy\static\uploads'
files = os.listdir(upload_folder)
print(f"Files in {upload_folder}:")
for f in files:
    print(f" - {f}")
uuid_to_check = 'b72bf45e-9fd9-41b8-a57e-4fd2c264e9cf.jpeg'
path = os.path.join(upload_folder, uuid_to_check)
print(f"Checking for {uuid_to_check}: {os.path.exists(path)}")
