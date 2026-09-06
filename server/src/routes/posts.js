const express = require('express');
const router = express.Router();
const postService = require('../services/postService');

const enableWriteRoutes = process.env.READONLY !== 'true';

function mapError(res, error, fallbackMessage) {
  if (error.code === 'VALIDATION') {
    return res.status(400).json({ success: false, error: error.message });
  }
  if (error.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, error: error.message });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ success: false, error: fallbackMessage });
}

router.get('/', async (req, res) => {
  try {
    const posts = await postService.getAllPosts();
    res.json({ success: true, data: posts });
  } catch (error) {
    mapError(res, error, 'Failed to fetch posts');
  }
});

router.get('/category/:category', async (req, res) => {
  try {
    const posts = await postService.getAllPosts();
    const filtered = postService.filterPostsByCategory(posts, req.params.category);
    res.json({ success: true, data: filtered });
  } catch (error) {
    mapError(res, error, 'Failed to fetch posts by category');
  }
});

router.get('/recent/:limit', async (req, res) => {
  try {
    const posts = await postService.getAllPosts();
    const recent = postService.getRecentPosts(posts, req.params.limit);
    res.json({ success: true, data: recent });
  } catch (error) {
    mapError(res, error, 'Failed to fetch recent posts');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    const post = await postService.getPost(id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    mapError(res, error, 'Failed to fetch post');
  }
});

router.post('/', async (req, res) => {
  if (!enableWriteRoutes) {
    return res.status(403).json({
      success: false,
      error: 'Read-only mode: POST not allowed'
    });
  }

  try {
    const { title, text, category, userId } = req.body;
    const { id, post } = await postService.createPost({ title, text, category, userId });
    res.status(201).json({ success: true, data: post, id });
  } catch (error) {
    mapError(res, error, 'Failed to create post');
  }
});

router.put('/:id', async (req, res) => {
  if (!enableWriteRoutes) {
    return res.status(403).json({
      success: false,
      error: 'Read-only mode: PUT not allowed'
    });
  }

  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    const { title, text, category } = req.body;
    const post = await postService.updatePost(id, { title, text, category });
    res.json({ success: true, data: post });
  } catch (error) {
    mapError(res, error, 'Failed to update post');
  }
});

router.delete('/:id', async (req, res) => {
  if (!enableWriteRoutes) {
    return res.status(403).json({
      success: false,
      error: 'Read-only mode: DELETE not allowed'
    });
  }

  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    await postService.deletePost(id);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    mapError(res, error, 'Failed to delete post');
  }
});

module.exports = router;
