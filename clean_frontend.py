import os
import glob

pages_dir = "frontend-smartproject/src/pages"
files = glob.glob(os.path.join(pages_dir, "*.tsx"))

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Remove formData.append("uploadedBy", ...)
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        if 'formData.append("uploadedBy"' in line:
            continue
        if 'uploadedBy: "Current User"' in line:
            # This is in JSON objects like correspondence
            # Need to be careful about commas, but usually it's the last item or we can just replace the whole line if it's not breaking syntax.
            continue
        new_lines.append(line)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write('\n'.join(new_lines))
