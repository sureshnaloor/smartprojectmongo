import os
import glob
import re

pages_dir = "frontend-smartproject/src/pages"
files = glob.glob(os.path.join(pages_dir, "*.tsx"))

replacements = {
    "file.fileInfo?.uploadedBy": "(file.fileInfo?.uploadedBy || file.fileInfo?.uploadedby)",
    "file.fileInfo?.drawingName": "(file.fileInfo?.drawingName || file.fileInfo?.drawingname)",
    "file.fileInfo?.boqName": "(file.fileInfo?.boqName || file.fileInfo?.boqname)",
    "file.fileInfo?.scopeName": "(file.fileInfo?.scopeName || file.fileInfo?.scopename)",
    "file.fileInfo?.docName": "(file.fileInfo?.docName || file.fileInfo?.docname)",
    "file.fileInfo?.rfiName": "(file.fileInfo?.rfiName || file.fileInfo?.rfiname)",
    "file.fileInfo?.correspondenceName": "(file.fileInfo?.correspondenceName || file.fileInfo?.correspondencename)",
    "item.fileInfo?.uploadedBy": "(item.fileInfo?.uploadedBy || item.fileInfo?.uploadedby)",
    "item.fileInfo?.correspondenceName": "(item.fileInfo?.correspondenceName || item.fileInfo?.correspondencename)",
}

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Simple search and replace
    for old, new in replacements.items():
        # Avoid double replacement if already replaced
        if new not in content:
            content = content.replace(old, new)
            
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

