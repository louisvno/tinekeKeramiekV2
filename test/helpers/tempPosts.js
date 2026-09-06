const fs = require('fs');
const os = require('os');
const path = require('path');

function createTempPostsFile(initialPosts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'posts-test-'));
  const filePath = path.join(dir, 'posts.json');
  fs.writeFileSync(filePath, JSON.stringify({ posts: initialPosts }, null, 2), 'utf8');
  process.env.POSTS_FILE_PATH = filePath;
  return { dir, filePath };
}

function cleanupTempPostsFile(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.POSTS_FILE_PATH;
}

module.exports = {
  createTempPostsFile,
  cleanupTempPostsFile
};
