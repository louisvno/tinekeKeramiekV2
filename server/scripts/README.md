# Image Download Script

Standalone script to download images from Firebase Storage.

## Usage

```bash
# Download using default JSON file (images.json)
node download-images.js

# Specify input JSON file
node download-images.js /path/to/images.json

# Specify output directory
node download-images.js images.json ./my-images

# Both input and output
node download-images.js /path/to/images.json ./downloaded-images
```

## Arguments

- `INPUT_FILE`: JSON file containing image metadata (default: `images.json`)
- `OUTPUT_DIR`: Directory where images will be saved (default: `./downloaded-images`)

## Input JSON Structure

The JSON file should have the following structure:

```json
{
  "sourceImgs": {
    "<postId>": {
      "<imgId>": {
        "downloadUrl": "https://...",
        "path": "<folder>/<filename>",
        "timeCreated": "2022-06-07T18:57:04.920Z"
      }
    }
  },
  "thumbnails": { ... },
  "x1000Imgs": { ... },
  "x500Imgs": { ... }
}
```

## Output Structure

Images are downloaded maintaining the folder structure from the `path` field:

```
downloaded-images/
├── -N3zWXt-WzJmx-FQgpId/
│   └── -N3zWiieYRvnYlbhvi74/
│       ├── x500_20220211_141545.jpg
│       └── thumbnail.jpg
```

## Features

- ✅ Downloads all images from the 4 specified fields
- ✅ Maintains folder structure from the JSON paths
- ✅ Creates missing directories automatically
- ✅ Skips already downloaded files
- ✅ Handles redirects automatically
- ✅ Provides download statistics
- ✅ Exit code 1 if any downloads fail

## Example

```bash
# Run the script
cd server/scripts
node download-images.js

# Or from project root
node server/scripts/download-images.js
```

## Exit Codes

- `0`: All images downloaded successfully
- `1`: One or more downloads failed
