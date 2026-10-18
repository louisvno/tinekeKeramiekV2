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

// Generate unique filename (keeps original extension)
const generateFilename = (originalName) => {
  const extension = path.extname(originalName).toLowerCase();
  const name = path.basename(originalName, extension);
  const timestamp = Date.now();
  const random = uuidv4().replace(/-/g, '');
  return `${name}-${timestamp}-${random}${extension}`;
};

// Encode resized image in a format matching the file extension
const encodeForExtension = (pipeline, ext, quality) => {
  switch (ext) {
    case '.png':
      return pipeline.png();
    case '.webp':
      return pipeline.webp({ quality });
    default:
      return pipeline.jpeg({ quality });
  }
};

// Derive the shared base name (original filename incl. ext) from any size filename
const baseNameFromImgId = (imgId) => {
  let base = imgId;
  if (base.startsWith('thumb_')) {
    base = base.slice('thumb_'.length);
    if (base.toLowerCase().endsWith('.png')) {
      base = base.slice(0, -4);
    }
  } else if (base.startsWith('x500_')) {
    base = base.slice('x500_'.length);
  } else if (base.startsWith('x1000_')) {
    base = base.slice('x1000_'.length);
  }
  return base;
};

// Upload image and generate all sizes as flat files:
//   thumb_<name>.<ext>.png
//   x500_<name>.<ext>
//   x1000_<name>.<ext>
const uploadImage = async (postId, file, imgId) => {
  ensureUploadDirs();

  const uploadPath = path.join(UPLOAD_BASE, 'posts', postId);
  fs.mkdirSync(uploadPath, { recursive: true });

  // GIF resized output is stored as JPEG; normalize extension so bytes match the name
  let baseName = generateFilename(file.originalname);
  let ext = path.extname(baseName).toLowerCase();
  if (ext === '.gif') {
    baseName = baseName.slice(0, -4) + '.jpg';
    ext = '.jpg';
  }

  const paths = {
    thumb: path.join(uploadPath, `thumb_${baseName}.png`),
    x500: path.join(uploadPath, `x500_${baseName}`),
    x1000: path.join(uploadPath, `x1000_${baseName}`)
  };

  try {
    const buffer = file.buffer;

    // Thumbnail: always PNG (frontend strips a trailing .png to derive x500 path)
    const thumbnailBuffer = await sharp(buffer)
      .resize(200, 200, { fit: 'cover', position: 'center', withoutEnlargement: true })
      .png()
      .toBuffer();
    fs.writeFileSync(paths.thumb, thumbnailBuffer);

    // x500 / x1000: keep original extension in the filename
    const x500Buffer = await encodeForExtension(
      sharp(buffer).resize(500, 500, { fit: 'cover', position: 'center', withoutEnlargement: true }),
      ext,
      85
    ).toBuffer();
    fs.writeFileSync(paths.x500, x500Buffer);

    const x1000Buffer = await encodeForExtension(
      sharp(buffer).resize(1000, 1000, { fit: 'cover', position: 'center', withoutEnlargement: true }),
      ext,
      90
    ).toBuffer();
    fs.writeFileSync(paths.x1000, x1000Buffer);

    return {
      success: true,
      imgId: imgId,
      filename: baseName,
      paths: {
        thumbnails: `/uploads/posts/${postId}/thumb_${baseName}.png`,
        x500: `/uploads/posts/${postId}/x500_${baseName}`,
        x1000: `/uploads/posts/${postId}/x1000_${baseName}`
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

// Delete image and all its sizes (flat prefixed files)
const deleteImage = (postId, imgId) => {
  const uploadPath = path.join(UPLOAD_BASE, 'posts', postId);
  const base = baseNameFromImgId(imgId);

  const files = [
    `thumb_${base}.png`,
    `x500_${base}`,
    `x1000_${base}`
  ];

  files.forEach(filename => {
    const filePath = path.join(uploadPath, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  return { success: true, deleted: true };
};

// List all images for a post (flat files with size prefixes)
const listImagesForPost = (postId) => {
  const uploadPath = path.join(UPLOAD_BASE, 'posts', postId);
  const result = { thumb: [], x500: [], x1000: [] };
  const sizes = ['thumb', 'x500', 'x1000'];

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
