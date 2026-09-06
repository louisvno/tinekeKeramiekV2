const fs = require('fs');
const { createTempPostsFile, cleanupTempPostsFile } = require('./helpers/tempPosts');
const datalayerService = require('../server/src/services/datalayerService');

describe('datalayerService', () => {
  let temp;

  afterEach(() => {
    if (temp) {
      cleanupTempPostsFile(temp.dir);
      temp = null;
    }
  });

  test('readPosts returns posts map from fixture', async () => {
    temp = createTempPostsFile({
      post_1: { title: 'Bowl', category: 'kommen' }
    });

    const posts = await datalayerService.readPosts();

    expect(posts).toEqual({
      post_1: { title: 'Bowl', category: 'kommen' }
    });
  });

  test('savePosts writes full posts map and round-trips', async () => {
    temp = createTempPostsFile({});
    const nextPosts = {
      post_a: { title: 'Vase', category: 'vazen' }
    };

    await datalayerService.savePosts(nextPosts);

    const onDisk = JSON.parse(fs.readFileSync(temp.filePath, 'utf8'));
    expect(onDisk).toEqual({ posts: nextPosts });
    expect(await datalayerService.readPosts()).toEqual(nextPosts);
  });
});
