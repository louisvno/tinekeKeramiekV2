const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const POSTS_FILE_PATH = path.join(__dirname, '../../uploads/posts/posts.json');

// Helper to read posts from file
async function readPosts() {
  try {
    const data = fs.readFileSync(POSTS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(data);

    return parsed.posts || {};
  } catch (error) {
    console.error('Read posts error:', error);
    return {};
  }
}

// Helper to write posts to file
async function writePosts(posts) {
  try {
    const data = JSON.stringify({ posts }, null, 2);
    fs.writeFileSync(POSTS_FILE_PATH, data, 'utf8');
  } catch (error) {
    console.error('Write posts error:', error);
    throw error;
  }
}

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await readPosts();
    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts'
    });
  }
});

// Get single post by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Post ID is required' });
    }
    
    const posts = await readPosts();
    const post = posts[id];
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post'
    });
  }
});

// Create new post
router.post('/', async (req, res) => {
  try {
    const { title, text, category } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const posts = await readPosts();
    const id = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const post = {
      title: title,
      text: text || '',
      category: category || '',
      userId: req.body.userId || 'user_id',
      publishDate: new Date().toISOString(),
      images: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    posts[id] = post;
    await writePosts(posts);
    
    res.status(201).json({
      success: true,
      data: post,
      id: id
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post'
    });
  }
});

// Update post
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text, category } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Post ID is required' });
    }
    
    const posts = await readPosts();
    const post = posts[id];
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (text !== undefined) updates.text = text;
    if (category !== undefined) updates.category = category;
    updates.updatedAt = new Date().toISOString();
    
    Object.assign(post, updates);
    await writePosts(posts);
    
    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post'
    });
  }
});

// Delete post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Post ID is required' });
    }
    
    const posts = await readPosts();
    
    if (!posts[id]) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    delete posts[id];
    await writePosts(posts);
    
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post'
    });
  }
});

// Get posts by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const posts = await readPosts();
    const filtered = {};
    
    Object.keys(posts).forEach(postId => {
      if (posts[postId].category === category) {
        filtered[postId] = posts[postId];
      }
    });
    
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Get posts by category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts by category'
    });
  }
});

// Get most recent posts
router.get('/recent/:limit', async (req, res) => {
  try {
    const { limit } = req.params;
    const limitNum = parseInt(limit, 10) || 10;
    
    const posts = await readPosts();

    const sorted = Object.keys(posts)
      .sort((a, b) => new Date(posts[b].publishDate) - new Date(posts[a].publishDate))
      .slice(0, limitNum);
    console.log(sorted)
    const result = sorted.reduce((prev, curr) => Object.assign(prev, {[curr]: posts[curr]}), {})

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get recent posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent posts'
    });
  }
});

module.exports = router;
