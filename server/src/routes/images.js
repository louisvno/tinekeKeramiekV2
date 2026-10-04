const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadImage, deleteImage, listImagesForPost } = require('../storage/images');

const router = express.Router();
const enableWriteRoutes = process.env.READONLY !== 'true';


// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
});

// Upload image for a post (disabled in readonly mode)
router.post('/upload', upload.single('file'), (req, res) => {
  if (!enableWriteRoutes) {
    return res.status(403).json({
      success: false,
      error: 'Read-only mode: POST /upload not allowed'
    });
  }
  
  try {
    const { postId } = req.body;
    
    if (!postId) {
      return res.status(400).json({ error: 'postId is required' });
    }
    
    // Validate postId format (should be alphanumeric)
    if (!/^[a-zA-Z0-9_-]+$/.test(postId)) {
      return res.status(400).json({ error: 'Invalid postId format' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Generate unique image ID
    const imgId = postId + '-' + Date.now();
    
    // Upload image
    const result = uploadImage(postId, req.file, imgId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      details: error.message
    });
  }
});

// Get all images for a post
router.get('/post/:postId', (req, res) => {
  try {
    const { postId } = req.params;
    
    if (!postId) {
      return res.status(400).json({ error: 'postId is required' });
    }
    
    const images = listImagesForPost(postId);
    res.json({ success: true, data: images });
  } catch (error) {
    console.error('List images error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list images'
    });
  }
});

// Get single image by ID
router.get('/:postId/:imgId', (req, res) => {
  try {
    const { postId, imgId } = req.params;
    
    // Construct image path (try all sizes)
    const possiblePaths = [
      `/uploads/posts/${postId}/${imgId}`,
      `/uploads/posts/${postId}/${imgId}/`,
    ];
    
    res.redirect(301, possiblePaths[0]);
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get image'
    });
  }
});

// Delete image (disabled in readonly mode)
router.delete('/:postId/:imgId', (req, res) => {
  if (!enableWriteRoutes) {
    return res.status(403).json({
      success: false,
      error: 'Read-only mode: DELETE /:postId/:imgId not allowed'
    });
  }
  
  try {
    const { postId, imgId } = req.params;
    
    if (!postId || !imgId) {
      return res.status(400).json({ error: 'postId and imgId are required' });
    }
    
    const result = deleteImage(postId, imgId);
    
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image',
      details: error.message
    });
  }
});

module.exports = router;
