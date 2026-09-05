#!/usr/bin/env python3
import json
import os

# Load posts.json
json_path = "./server/uploads/posts/posts.json"
with open(json_path, 'r') as f:
    data = json.load(f)

posts = data.get("posts", {})

# Function to check if storagePath is valid for a given foldername and image
def is_storage_path_valid(foldername, storage_path):
    """
    Return True if storage_path follows the pattern: foldername + '/' + image_path,
    where image_path is the final component (no extra slashes).
    i.e., storage_path should split into exactly 2 parts when split by '/'.
    """
    # Ensure storage_path starts with foldername + '/'
    if not storage_path.startswith(foldername + '/'):
        return False
    parts = storage_path.split('/')
    # Must have exactly 2 parts: [foldername, image_path]
    if len(parts) != 2:
        return False
    # Optionally verify the image_path part is non-empty and not empty?
    return True

# Analyze each subfolder
results = []
for foldername, post_data in posts.items():
    images = post_data.get("images", {})
    valid = True
    problematic_images = []
    for img_key, img_data in images.items():
        storage_path = img_data.get("storagePath")
        if not is_storage_path_valid(foldername, storage_path):
            valid = False
            problematic_images.append({
                "img_key": img_key,
                "storage_path": storage_path
            })
    results.append({
        "foldername": foldername,
        "valid": valid,
        "problematic_images": problematic_images
    })

# Print results
print("Validation of storage paths in uploads/posts")
print("=" * 60)
for result in results:
    folder = result["foldername"]
    valid = result["valid"]
    if valid:
        print(f"✅ {folder}: All images have correct storage path (foldername/imagepath)")
    else:
        print(f"❌ {folder}: Invalid storage paths found")
        for img in result["problematic_images"]:
            print(f"    - {img['img_key']}: {img['storage_path']}")

# Optionally save to file
output_path = "./storage_validation_report.txt"
with open(output_path, 'w') as f:
    f.write("Storage path validation report\n")
    f.write("=" * 60 + "\n")
    for result in results:
        folder = result["foldername"]
        valid = result["valid"]
        if valid:
            f.write(f"✅ {folder}: All images have correct storage path (foldername/imagepath)\n")
        else:
            f.write(f"❌ {folder}: Invalid storage paths found\n")
            for img in result["problematic_images"]:
                f.write(f"    - {img['img_key']}: {img['storage_path']}\n")
        f.write("\n")
print(f"\nReport written to {output_path}")