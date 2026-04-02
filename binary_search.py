import os
import binascii

search_bytes = b"TRY DIRECT DOWNLOAD"
for root, dirs, files in os.walk('.'):
    for name in files:
        path = os.path.join(root, name)
        try:
            with open(path, 'rb') as f:
                data = f.read()
                if search_bytes in data:
                    print(f"FOUND IN: {path}")
                elif b"missing from the server storage" in data:
                    print(f"FOUND IN: {path} (partial match)")
        except:
            pass
