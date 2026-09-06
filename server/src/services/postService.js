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

module.exports = {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  filterPostsByCategory,
  getRecentPosts
};
