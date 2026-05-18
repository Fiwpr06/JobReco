import os
import re

md_file = r"D:\Workspace\DACS\DACS3\JOB_RECOMMENDATION\PROMPT_TEST_BACKEND_AI_JOB_SYSTEM.md"
with open(md_file, "r", encoding="utf-8") as f:
    content = f.read()

# Match all python blocks
blocks = re.findall(r"```python\n(.*?)```", content, re.DOTALL)

for block in blocks:
    # First line usually contains the file path, e.g. # tests/test_phase0/test_schema.py
    lines = block.strip().split("\n")
    if not lines[0].startswith("# tests/"):
        continue
    
    file_path = lines[0].replace("# ", "").strip()
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines[1:]) + "\n")
        
    print(f"Created {file_path}")

# Create empty __init__.py files in each tests/ directory
for root, dirs, files in os.walk("tests"):
    with open(os.path.join(root, "__init__.py"), "w") as f:
        pass
