import re

with open("backend-smartproject/src/routes.ts", "r") as f:
    text = f.read()

# Add fileUploads to imports
text = text.replace("resources,\n} from \"./schema\";", "resources,\n  fileUploads,\n} from \"./schema\";")

# Define handlers config
handlers = [
    {
        "category": "drawings",
        "nameVar": "drawingName",
        "searchDoc": "drawingName",
        "searchCode": "uploadedBy",
    },
    {
        "category": "boq",
        "nameVar": "boqName",
        "searchDoc": "boqName",
        "searchCode": "uploadedBy",
    },
    {
        "category": "scope",
        "nameVar": "scopeName",
        "searchDoc": "scopeName",
        "searchCode": "uploadedBy",
    },
    {
        "category": "request-for-inspection",
        "nameVar": "rfiName",
        "searchDoc": "rfiName",
        "searchCode": "uploadedBy",
    },
    {
        "category": "itp-and-reports",
        "nameVar": "docName",
        "searchDoc": "docName",
        "searchCode": "uploadedBy",
    },
    {
        "category": "other-documents",
        "nameVar": "docName",
        "searchDoc": "docName",
        "searchCode": "uploadedBy",
    },
    {
        "category": "equipment-catalogue",
        "nameVar": "docName",
        "searchDoc": "docName",
        "searchCode": "uploadedBy",
    },
]

for handler in handlers:
    cat = handler["category"]
    nvar = handler["nameVar"]
    
    # Replace the "const uploadedBy = ..."
    old_by_1 = '      const uploadedBy = req.body.uploadedBy || "Unknown User"; // In a real app, get from req.user'
    old_by_2 = '      const uploadedBy = req.body.uploadedBy || "Unknown User";'
    new_by = f'''      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";
      const uploadedById = user?.id || null;
      const uploadedByEmail = user?.email || null;'''
    
    if old_by_1 in text and cat == "drawings":
        text = text.replace(old_by_1, new_by)
    else:
        # For the others, need to isolate to the correct block
        block_start = text.find(f'/api/projects/:projectId/{cat}/upload')
        block_end = text.find('res.status(201).json(result);', block_start) + 30
        block = text[block_start:block_end]
        
        new_block = block.replace(old_by_2, new_by)
        text = text.replace(block, new_block)

    # Replace the fileInfo and result line
    block_start = text.find(f'/api/projects/:projectId/{cat}/upload')
    block_end = text.find('res.status(201).json(result);', block_start) + 30
    block = text[block_start:block_end]
    
    old_info = f'''      const fileInfo = {{
        {nvar}: {nvar},
        description: description,
        uploadedBy: uploadedBy
      }};

      const result = await uploadFile(fileName, fileData, file.mimetype, fileInfo);
      res.status(201).json(result);'''
      
    new_info = f'''      const fileInfo = {{
        {nvar}: {nvar},
        description: description,
        uploadedBy: uploadedByName
      }};

      const result = await uploadFile(fileName, fileData, file.mimetype, fileInfo);
      
      await db.insert(fileUploads).values({{
        projectId,
        category: "{cat}",
        fileName: result.fileName || fileName,
        originalName: file.name,
        displayName: {nvar},
        description,
        fileSize: file.size,
        contentType: file.mimetype,
        b2FileId: result.fileId,
        uploadedById,
        uploadedByName,
        uploadedByEmail,
      }});

      res.status(201).json(result);'''
      
    new_block = block.replace(old_info, new_info)
    text = text.replace(block, new_block)

# Special case for "correspondence" (Client Correspondence upload link logic)
cat = "correspondence"
block_start = text.find('/api/projects/:projectId/correspondence/create')
block_end = text.find('res.status(201).json(result);', block_start) + 30
block = text[block_start:block_end]

old_by_corr = '      const { name, link, description, uploadedBy } = req.body;'
new_by_corr = '''      const { name, link, description } = req.body;
      const user = (req as any).user;
      const uploadedByName = user?.name || req.body.uploadedBy || "Unknown User";
      const uploadedById = user?.id || null;
      const uploadedByEmail = user?.email || null;'''

old_info_corr = '''      const fileInfo = {
        correspondenceName: name,
        description: description || "",
        linkUrl: link,
        uploadedBy: uploadedBy || "Unknown User"
      };

      const result = await uploadFile(fileName, Buffer.from(fileContent), "application/json", fileInfo);
      res.status(201).json(result);'''
      
new_info_corr = '''      const fileInfo = {
        correspondenceName: name,
        description: description || "",
        linkUrl: link,
        uploadedBy: uploadedByName
      };

      const result = await uploadFile(fileName, Buffer.from(fileContent), "application/json", fileInfo);
      
      await db.insert(fileUploads).values({
        projectId,
        category: "correspondence",
        fileName: result.fileName || fileName,
        originalName: "link.json",
        displayName: name,
        description,
        fileSize: Buffer.from(fileContent).length,
        contentType: "application/json",
        b2FileId: result.fileId,
        uploadedById,
        uploadedByName,
        uploadedByEmail,
      });

      res.status(201).json(result);'''

new_block = block.replace(old_by_corr, new_by_corr)
new_block = new_block.replace(old_info_corr, new_info_corr)
text = text.replace(block, new_block)


with open("backend-smartproject/src/routes.ts", "w") as f:
    f.write(text)

