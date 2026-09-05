const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_BASE = process.env.UPLOAD_BASE;

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = ['posts'];
  dirs.forEach(dir => {
    fs.mkdirSync(path.join(UPLOAD_BASE, dir), { recursive: true });
  });
};

// Generate unique filename
const generateFilename = (originalName) => {
  const extension = path.extname(originalName).toLowerCase();
  const name = path.basename(originalName, extension);
  const timestamp = Date.now();
  const random = uuidv4().replace(/-/g, '');
  return `${name}-${timestamp}-${random}${extension}`;
};

// Upload image and generate all sizes
const uploadImage = async (postId, file, imgId) => {
  ensureUploadDirs();
  
  const uploadPath = path.join(UPLOAD_BASE, 'posts', postId);
  const sourceDir = path.join(uploadPath, 'source');
  const sizes = ['thumbnails', 'x500', 'x1000'];
  
  // Create directories
  sizes.forEach(size => fs.mkdirSync(path.join(uploadPath, size), { recursive: true }));
  
  // Generate unique filename
  const filename = generateFilename(file.originalname);
  
  // Paths for each size
  const paths = {
    source: path.join(uploadPath, 'source', filename),
    thumbnails: path.join(uploadPath, 'thumbnails', imgId, filename),
    x500: path.join(uploadPath, 'x500', imgId, filename),
    x1000: path.join(uploadPath, 'x1000', imgId, filename)
  };
  
  try {
    // Read and process the image
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Write source image (original size)
    fs.writeFileSync(paths.source, buffer);
    
    // Generate thumbnails (max 200x200, fit, cover)
    const thumbnailBuffer = await sharp(buffer)
      .resize(200, 200, { fit: 'cover', position: 'center', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    fs.writeFileSync(paths.thumbnails, thumbnailBuffer);
    
    // Generate x500 (max 500x500)
    const x500Buffer = await sharp(buffer)
      .resize(500, 500, { fit: 'cover', position: 'center', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    fs.writeFileSync(paths.x500, x500Buffer);
    
    // Generate x1000 (max 1000x1000)
    const x1000Buffer = await sharp(buffer)
      .resize(1000, 1000, { fit: 'cover', position: 'center', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    fs.writeFileSync(paths.x1000, x1000Buffer);
    
    // Return image URLs relative to server
    return {
      success: true,
      imgId: imgId,
      filename: filename,
      paths: {
        source: `/uploads/posts/${postId}/source/${filename}`,
        thumbnails: `/uploads/posts/${postId}/thumbnails/${imgId}/${filename}`,
        x500: `/uploads/posts/${postId}/x500/${imgId}/${filename}`,
        x1000: `/uploads/posts/${postId}/x1000/${imgId}/${filename}`
      },
      originalName: file.originalname,
      fileSize: file.size
    };
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: 'Image processing failed',
      details: error.message
    };
  }
};

// Delete image and all its sizes
const deleteImage = async (postId, imgId) => {
  const uploadPath = path.join(UPLOAD_BASE, 'posts', postId);
  const sizes = ['source', 'thumbnails', 'x500', 'x1000'];
  
  sizes.forEach(size => {
    const dir = path.join(uploadPath, size, imgId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  
  return { success: true, deleted: true };
};

// List all images for a post
const listImagesForPost = (postId) => {
  const uploadPath = path.join(UPLOAD_BASE, 'posts', postId);
  const result = { thumb: [], x500: [], x1000: [] };
  const sizes = [ 'thumb', 'x500', 'x1000'];

  sizes.forEach(size => {
    const dir = uploadPath;

    if (fs.existsSync(dir)) {
      const items = fs.readdirSync(dir);
      result[size] = items.filter(item => item.startsWith(size)).map(item => ({
        imgId: item,
        filename: item,
        path: `/uploads/posts/${postId}/${item}`
      }));
    }
  });
  
  return result;
};

module.exports = {
  uploadImage,
  deleteImage,
  listImagesForPost,
  generateFilename,
  ensureUploadDirs
};
