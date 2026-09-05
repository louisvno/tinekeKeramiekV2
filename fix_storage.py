#!/usr/bin/env python3
import json

# Load the posts.json
json_path = "./server/uploads/posts/posts.json"
with open(json_path, 'r') as f:
    data = json.load(f)

posts = data.get("posts", {})

def fix_storage_path(foldername, storage_path):
    """
    Given foldername and a storage_path string that may contain extra subfolders,
    return the corrected path that is exactly foldername + '/' + image_path.
    Assumes the last component is the image filename (ending with .jpg or similar).
    """
    parts = storage_path.split('/')
    # Expected: [foldername, ..., image_path]
    # We want: [foldername, image_path]
    # Remove all intermediate parts; keep only the first and the last.
    if len(parts) < 2:
        # Already simple; return unchanged
        return storage_path
    # Keep foldername (which should match the subfolder name; we can verify) and the last part.
    # Ensure the first part matches foldername exactly (it should).
    # Return new path: foldername + '/' + last_part
    return f"{foldername}/{parts[-1]}"

# Apply fix to problematic subfolders
for foldername, post_data in posts.items():
    images = post_data.get("images", {})
    for img_key, img_data in images.items():
        storage_path = img_data.get("storagePath")
        # Check if storage_path has extra subfolders (more than 2 parts)
        parts = storage_path.split('/')
        if len(parts) > 2:
            # Fix it
            img_data["storagePath"] = fix_storage_path(foldername, storage_path)
            print(f"Fixed {foldername}/{img_key}: {storage_path} -> {img_data['storagePath']}")
        # If already correct (len == 2), leave unchanged

# Write the updated JSON back
with open(json_path, 'w') as f:
    json.dump(data, f, indent=2)

print("Storage paths corrected. JSON updated.")