const fs = require('fs');
const path = require('path');

const DEFAULT_POSTS_FILE_PATH = path.join(__dirname, '../../uploads/posts/posts.json');

function getPostsFilePath() {
  return process.env.POSTS_FILE_PATH || DEFAULT_POSTS_FILE_PATH;
}

async function readData(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Failed to read data: ${error.message}`);
  }
}

async function writeData(filePath, data) {
  try {
    const dataStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, dataStr, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write data: ${error.message}`);
  }
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function readPosts() {
  try {
    const data = await readData(getPostsFilePath());
    return data.posts || {};
  } catch (error) {
    throw new Error(`Failed to read posts: ${error.message}`);
  }
}

async function savePosts(posts) {
  try {
    await writeData(getPostsFilePath(), { posts });
  } catch (error) {
    throw new Error(`Failed to write posts: ${error.message}`);
  }
}

module.exports = {
  readData,
  writeData,
  generateId,
  readPosts,
  savePosts,
  getPostsFilePath
};
