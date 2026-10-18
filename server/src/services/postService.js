const datalayerService = require('./datalayerService');

function filterPostsByCategory(posts, category) {
  const filtered = {};
  Object.keys(posts).forEach(postId => {
    if (posts[postId]?.category === category) {
      filtered[postId] = posts[postId];
    }
  });
  return filtered;
}

function getRecentPosts(posts, limit = 10) {
  const limitNum = parseInt(limit, 10) || 10;
  const sorted = Object.keys(posts)
    .sort((a, b) => new Date(posts[b]?.publishDate || 0) - new Date(posts[a]?.publishDate || 0))
    .slice(0, limitNum);
  return sorted.reduce((prev, curr) => Object.assign(prev, { [curr]: posts[curr] }), {});
}

async function getAllPosts() {
  return datalayerService.readPosts();
}

async function getPost(id) {
  const posts = await datalayerService.readPosts();
  return posts[id] || null;
}

async function createPost({ title, text, category, userId }) {
  if (!title) {
    const error = new Error('Title is required');
    error.code = 'VALIDATION';
    throw error;
  }

  const id = datalayerService.generateId('post');
  const now = new Date().toISOString();
  const post = {
    title,
    text: text || '',
    category: category || '',
    userId: userId || 'user_id',
    publishDate: now,
    images: {},
    createdAt: now,
    updatedAt: now
  };

  const posts = await datalayerService.readPosts();
  posts[id] = post;
  await datalayerService.savePosts(posts);

  return { id, post };
}

async function updatePost(id, updates) {
  const posts = await datalayerService.readPosts();
  const post = posts[id];

  if (!post) {
    const error = new Error('Post not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const allowed = ['title', 'text', 'category'];
  allowed.forEach(key => {
    if (updates[key] !== undefined) {
      post[key] = updates[key];
    }
  });
  post.updatedAt = new Date().toISOString();

  posts[id] = post;
  await datalayerService.savePosts(posts);

  return post;
}

async function deletePost(id) {
  const posts = await datalayerService.readPosts();

  if (!posts[id]) {
    const error = new Error('Post not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  delete posts[id];
  await datalayerService.savePosts(posts);
}

function nextImageKey(images) {
  let max = -1;
  Object.keys(images || {}).forEach(key => {
    const match = /^img(\d+)$/.exec(key);
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  });
  return `img${max + 1}`;
}

async function addImageToPost(postId, { name, storagePath, publishDate }) {
  const posts = await datalayerService.readPosts();
  const post = posts[postId];

  if (!post) {
    const error = new Error('Post not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!post.images) {
    post.images = {};
  }

  const imgKey = nextImageKey(post.images);
  const now = publishDate || new Date().toISOString();
  post.images[imgKey] = {
    name,
    publishDate: now,
    storagePath
  };
  post.updatedAt = now;

  posts[postId] = post;
  await datalayerService.savePosts(posts);

  return { imgKey, image: post.images[imgKey], post };
}

function stripSizePrefix(name) {
  let base = name || '';
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
}

async function removeImageFromPost(postId, imageRef) {
  const posts = await datalayerService.readPosts();
  const post = posts[postId];

  if (!post) {
    const error = new Error('Post not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!post.images) {
    return { removed: false, post };
  }

  const refBase = stripSizePrefix(imageRef.split('/').pop());
  const imgKey = Object.keys(post.images).find(key => {
    const image = post.images[key];
    const storageName = (image.storagePath || '').split('/').pop();
    return (
      key === imageRef ||
      image.name === imageRef ||
      image.storagePath === imageRef ||
      image.storagePath === `${postId}/${imageRef}` ||
      image.storagePath.endsWith(`/${imageRef}`) ||
      stripSizePrefix(image.name) === refBase ||
      stripSizePrefix(storageName) === refBase
    );
  });

  if (!imgKey) {
    return { removed: false, post };
  }

  delete post.images[imgKey];
  post.updatedAt = new Date().toISOString();
  posts[postId] = post;
  await datalayerService.savePosts(posts);

  return { removed: true, imgKey, post };
}

module.exports = {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  addImageToPost,
  removeImageFromPost,
  filterPostsByCategory,
  getRecentPosts
};
