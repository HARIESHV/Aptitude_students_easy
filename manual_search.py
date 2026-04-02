import os
for root, dirs, files in os.walk('.'):
    for name in files:
        if name.endswith(('.html', '.js', '.py', '.css')):
            path = os.path.join(root, name)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'missing from the server storage' in content:
                        print(f"FOUND IN: {path}")
            except:
                pass
