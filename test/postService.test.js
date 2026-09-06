const { createTempPostsFile, cleanupTempPostsFile } = require('./helpers/tempPosts');
const postService = require('../server/src/services/postService');

describe('postService', () => {
  let temp;

  afterEach(() => {
    if (temp) {
      cleanupTempPostsFile(temp.dir);
      temp = null;
    }
  });

  test('createPost requires title', async () => {
    temp = createTempPostsFile({});

    await expect(postService.createPost({ text: 'no title' })).rejects.toMatchObject({
      message: 'Title is required',
      code: 'VALIDATION'
    });
  });

  test('createPost persists and returns id', async () => {
    temp = createTempPostsFile({});

    const { id, post } = await postService.createPost({
      title: 'Cup',
      text: 'Small cup',
      category: 'kommen'
    });

    expect(id).toMatch(/^post_/);
    expect(post.title).toBe('Cup');
    expect(post.category).toBe('kommen');

    const stored = await postService.getPost(id);
    expect(stored).toEqual(post);
  });

  test('filterPostsByCategory returns matching posts', () => {
    const posts = {
      a: { title: 'A', category: 'kommen' },
      b: { title: 'B', category: 'vazen' },
      c: { title: 'C', category: 'kommen' }
    };

    expect(postService.filterPostsByCategory(posts, 'kommen')).toEqual({
      a: posts.a,
      c: posts.c
    });
  });

  test('getRecentPosts sorts by publishDate descending', () => {
    const posts = {
      old: { title: 'Old', publishDate: '2020-01-01T00:00:00.000Z' },
      new: { title: 'New', publishDate: '2024-06-01T00:00:00.000Z' },
      mid: { title: 'Mid', publishDate: '2022-03-01T00:00:00.000Z' }
    };

    const recent = postService.getRecentPosts(posts, 2);
    expect(Object.keys(recent)).toEqual(['new', 'mid']);
  });

  test('updatePost throws NOT_FOUND for missing id', async () => {
    temp = createTempPostsFile({});

    await expect(postService.updatePost('missing', { title: 'X' })).rejects.toMatchObject({
      message: 'Post not found',
      code: 'NOT_FOUND'
    });
  });

  test('updatePost updates fields and persists', async () => {
    temp = createTempPostsFile({
      post_1: {
        title: 'Old',
        text: 't',
        category: 'kommen',
        updatedAt: '2020-01-01T00:00:00.000Z'
      }
    });

    const updated = await postService.updatePost('post_1', { title: 'New', category: 'vazen' });

    expect(updated.title).toBe('New');
    expect(updated.category).toBe('vazen');
    expect(updated.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    expect(await postService.getPost('post_1')).toEqual(updated);
  });

  test('deletePost throws NOT_FOUND for missing id', async () => {
    temp = createTempPostsFile({});

    await expect(postService.deletePost('missing')).rejects.toMatchObject({
      message: 'Post not found',
      code: 'NOT_FOUND'
    });
  });

  test('deletePost removes post from storage', async () => {
    temp = createTempPostsFile({
      post_1: { title: 'Gone' },
      post_2: { title: 'Stay' }
    });

    await postService.deletePost('post_1');

    expect(await postService.getPost('post_1')).toBeNull();
    expect(await postService.getAllPosts()).toEqual({
      post_2: { title: 'Stay' }
    });
  });
});
