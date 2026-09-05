# Tineke Keramiek - Express Server

A Node.js/Express server for storing and serving images

## Features

- **Image Upload**: Upload images with automatic resizing (thumbnails, x500, x1000)
- **Image Storage**: Store images locally in `/uploads/posts/{postId}/`
- **Post Management**: Full CRUD operations for posts
- **REST API**: JSON API for frontend integration

## Installation

```bash
cd server
npm install
```

## Configuration

Create or edit `.env` file:

```env
# Server
PORT=3001
HOST=localhost

# Upload directory
UPLOAD_BASE=/tinekeKeramiekV2/server/uploads

## Running the Server

```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

## API Endpoints

### Images

- `POST /api/images/upload` - Upload an image for a post
- `GET /api/images/post/:postId` - List all images for a post
- `GET /api/images/:postId/:imgId` - Get single image
- `DELETE /api/images/:postId/:imgId` - Delete an image

### Posts

- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `GET /api/posts/category/:category` - Get posts by category
- `GET /api/posts/recent/:limit` - Get most recent posts

### Migration

- `GET /api/migrate/posts-to-migrate` - List posts with images to migrate
- `POST /api/migrate/posts/:postId/migrate` - Migrate single post
- `POST /api/migrate/migrate-all` - Migrate all posts

## File Structure

```
server/
├── src/
│   ├── index.js              # Main server entry
│   ├── config/               # Configuration files
│   ├── routes/               # API route definitions
│   │   ├── images.js         # Image endpoints
│   │   ├── posts.js          # Post endpoints
│   │   └── migrate.js        # Migration endpoints
│   ├── storage/              # Image storage logic
│   │   └── images.js         # Image processing and storage
│   └── migrate.js            # CLI migration script
├── uploads/                  # Image storage
│   └── posts/
│       └── {postId}/         # Per-post directory containing original and processed images
├── front/                    # Frontend assets (optional)
│   ├── assets/               # Frontend static assets
│   └── scripts/              # Frontend scripts
├── scripts/                  # Utility scripts
└── package.json
```

## Important Notes

- **Image Sizes**: Images are automatically resized to thumbnails (200px), x500 (500px), x1000 (1000px), and source (original)
- **Storage Location**: Images stored in `/uploads/posts/{postId}/`
- **Node.js Version**: Requires Node.js 14+

## Troubleshooting

### Images not loading
- Check server is running: `GET http://localhost:3001/api/health`
- Verify image exists: Check `/uploads/posts/{postId}/` directory
- Check server logs for errors

### Upload fails
- Check file size (max 10MB)
- Verify file type (JPEG, PNG, GIF, WebP)
- Check `UPLOAD_BASE` path is writable
