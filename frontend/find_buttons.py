import os
import re

for root, _, files in os.walk('/Users/dextersargent/Documents/PlanningApp/frontend/src'):
    for file in files:
        if file.endswith('.js'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            buttons = re.findall(r'<button[^>]*>(.*?)</button>', content, re.DOTALL)
            for b in buttons:
                b_stripped = b.strip()
                if '<' not in b_stripped:
                    print(f"{file}: {b_stripped}")
