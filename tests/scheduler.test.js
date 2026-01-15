/**
 * Tests for Scheduler Module
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  PostStatus,
  initializeQueue,
  loadQueue,
  addToQueue,
  getPost,
  updatePost,
  removeFromQueue,
  getPostsByStatus,
  getPostsByPlatform,
  getDuePosts,
  publishNow,
  processQueue,
  getQueueStats,
  clearQueue
} = require('../src/scheduling/scheduler');

// Use a test queue file to avoid modifying the real one
const TEST_QUEUE_PATH = path.join(__dirname, 'test_queue.json');

describe('Scheduler', () => {
  beforeEach(() => {
    // Clean up test queue before each test
    if (fs.existsSync(TEST_QUEUE_PATH)) {
      fs.unlinkSync(TEST_QUEUE_PATH);
    }
  });

  afterEach(() => {
    // Clean up test queue after each test
    if (fs.existsSync(TEST_QUEUE_PATH)) {
      fs.unlinkSync(TEST_QUEUE_PATH);
    }
  });

  test('PostStatus has expected values', () => {
    assert.strictEqual(PostStatus.PENDING, 'pending');
    assert.strictEqual(PostStatus.SCHEDULED, 'scheduled');
    assert.strictEqual(PostStatus.PUBLISHED, 'published');
    assert.strictEqual(PostStatus.FAILED, 'failed');
    assert.strictEqual(PostStatus.CANCELLED, 'cancelled');
  });

  test('initializeQueue creates queue file', () => {
    assert.strictEqual(fs.existsSync(TEST_QUEUE_PATH), false);
    initializeQueue(TEST_QUEUE_PATH);
    assert.strictEqual(fs.existsSync(TEST_QUEUE_PATH), true);
    
    const queue = loadQueue(TEST_QUEUE_PATH);
    assert.ok(queue.version);
    assert.ok(queue.lastUpdated);
    assert.ok(Array.isArray(queue.posts));
    assert.strictEqual(queue.posts.length, 0);
  });

  test('addToQueue creates post with pending status', () => {
    const post = addToQueue({
      content: 'Test post content',
      platform: 'twitter'
    }, TEST_QUEUE_PATH);

    assert.ok(post);
    assert.ok(post.id);
    assert.ok(post.id.startsWith('post_'));
    assert.strictEqual(post.content, 'Test post content');
    assert.strictEqual(post.platform, 'twitter');
    assert.strictEqual(post.status, PostStatus.PENDING);
    assert.strictEqual(post.scheduledTime, null);
    assert.ok(post.createdAt);
  });

  test('addToQueue creates scheduled post when time provided', () => {
    const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now
    
    const post = addToQueue({
      content: 'Scheduled post',
      platform: 'linkedin',
      scheduledTime
    }, TEST_QUEUE_PATH);

    assert.strictEqual(post.status, PostStatus.SCHEDULED);
    assert.ok(post.scheduledTime);
  });

  test('addToQueue throws error for invalid post', () => {
    assert.throws(() => addToQueue({}, TEST_QUEUE_PATH), /must have content and platform/);
    assert.throws(() => addToQueue({ content: 'test' }, TEST_QUEUE_PATH), /must have content and platform/);
    assert.throws(() => addToQueue({ platform: 'twitter' }, TEST_QUEUE_PATH), /must have content and platform/);
  });

  test('addToQueue normalizes platform name', () => {
    const post = addToQueue({
      content: 'Test',
      platform: 'TWITTER'
    }, TEST_QUEUE_PATH);

    assert.strictEqual(post.platform, 'twitter');
  });

  test('getPost returns post by ID', () => {
    const created = addToQueue({
      content: 'Test',
      platform: 'twitter'
    }, TEST_QUEUE_PATH);

    const retrieved = getPost(created.id, TEST_QUEUE_PATH);
    assert.deepStrictEqual(retrieved, created);
  });

  test('getPost returns null for unknown ID', () => {
    initializeQueue(TEST_QUEUE_PATH);
    const post = getPost('unknown_id', TEST_QUEUE_PATH);
    assert.strictEqual(post, null);
  });

  test('updatePost updates post fields', () => {
    const post = addToQueue({
      content: 'Original content',
      platform: 'twitter'
    }, TEST_QUEUE_PATH);

    const updated = updatePost(post.id, {
      content: 'Updated content',
      status: PostStatus.SCHEDULED
    }, TEST_QUEUE_PATH);

    assert.strictEqual(updated.content, 'Updated content');
    assert.strictEqual(updated.status, PostStatus.SCHEDULED);
    assert.strictEqual(updated.id, post.id); // ID should not change
  });

  test('updatePost returns null for unknown ID', () => {
    initializeQueue(TEST_QUEUE_PATH);
    const result = updatePost('unknown_id', { content: 'test' }, TEST_QUEUE_PATH);
    assert.strictEqual(result, null);
  });

  test('removeFromQueue removes post', () => {
    const post = addToQueue({
      content: 'To be removed',
      platform: 'twitter'
    }, TEST_QUEUE_PATH);

    const removed = removeFromQueue(post.id, TEST_QUEUE_PATH);
    assert.strictEqual(removed, true);
    
    const retrieved = getPost(post.id, TEST_QUEUE_PATH);
    assert.strictEqual(retrieved, null);
  });

  test('removeFromQueue returns false for unknown ID', () => {
    initializeQueue(TEST_QUEUE_PATH);
    const removed = removeFromQueue('unknown_id', TEST_QUEUE_PATH);
    assert.strictEqual(removed, false);
  });

  test('getPostsByStatus filters correctly', () => {
    addToQueue({ content: 'Post 1', platform: 'twitter' }, TEST_QUEUE_PATH);
    addToQueue({ content: 'Post 2', platform: 'twitter', scheduledTime: new Date(Date.now() + 3600000) }, TEST_QUEUE_PATH);
    addToQueue({ content: 'Post 3', platform: 'twitter' }, TEST_QUEUE_PATH);

    const pending = getPostsByStatus(PostStatus.PENDING, TEST_QUEUE_PATH);
    const scheduled = getPostsByStatus(PostStatus.SCHEDULED, TEST_QUEUE_PATH);

    assert.strictEqual(pending.length, 2);
    assert.strictEqual(scheduled.length, 1);
  });

  test('getPostsByPlatform filters correctly', () => {
    addToQueue({ content: 'Twitter 1', platform: 'twitter' }, TEST_QUEUE_PATH);
    addToQueue({ content: 'LinkedIn 1', platform: 'linkedin' }, TEST_QUEUE_PATH);
    addToQueue({ content: 'Twitter 2', platform: 'twitter' }, TEST_QUEUE_PATH);

    const twitterPosts = getPostsByPlatform('twitter', TEST_QUEUE_PATH);
    const linkedinPosts = getPostsByPlatform('linkedin', TEST_QUEUE_PATH);

    assert.strictEqual(twitterPosts.length, 2);
    assert.strictEqual(linkedinPosts.length, 1);
  });

  test('getDuePosts returns posts due for publishing', () => {
    // Past time - should be due
    const pastTime = new Date(Date.now() - 3600000);
    addToQueue({
      content: 'Past post',
      platform: 'twitter',
      scheduledTime: pastTime
    }, TEST_QUEUE_PATH);

    // Future time - should not be due
    const futureTime = new Date(Date.now() + 3600000);
    addToQueue({
      content: 'Future post',
      platform: 'twitter',
      scheduledTime: futureTime
    }, TEST_QUEUE_PATH);

    const duePosts = getDuePosts(TEST_QUEUE_PATH);
    assert.strictEqual(duePosts.length, 1);
    assert.strictEqual(duePosts[0].content, 'Past post');
  });

  test('publishNow publishes post successfully', async () => {
    const post = addToQueue({
      content: 'To publish',
      platform: 'twitter'
    }, TEST_QUEUE_PATH);

    const result = await publishNow(post.id, null, TEST_QUEUE_PATH);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.postId, post.id);
    assert.ok(result.publishedAt);
    
    const updated = getPost(post.id, TEST_QUEUE_PATH);
    assert.strictEqual(updated.status, PostStatus.PUBLISHED);
  });

  test('publishNow calls callback function', async () => {
    const post = addToQueue({
      content: 'With callback',
      platform: 'twitter'
    }, TEST_QUEUE_PATH);

    let callbackCalled = false;
    const callback = async (p) => {
      callbackCalled = true;
      assert.strictEqual(p.id, post.id);
    };

    await publishNow(post.id, callback, TEST_QUEUE_PATH);
    assert.strictEqual(callbackCalled, true);
  });

  test('publishNow handles callback error', async () => {
    const post = addToQueue({
      content: 'Will fail',
      platform: 'twitter'
    }, TEST_QUEUE_PATH);

    const callback = async () => {
      throw new Error('Publishing failed');
    };

    const result = await publishNow(post.id, callback, TEST_QUEUE_PATH);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Publishing failed');
    
    const updated = getPost(post.id, TEST_QUEUE_PATH);
    assert.strictEqual(updated.status, PostStatus.FAILED);
  });

  test('publishNow returns error for unknown post', async () => {
    initializeQueue(TEST_QUEUE_PATH);
    const result = await publishNow('unknown_id', null, TEST_QUEUE_PATH);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Post not found');
  });

  test('publishNow returns error for already published post', async () => {
    const post = addToQueue({
      content: 'Already published',
      platform: 'twitter'
    }, TEST_QUEUE_PATH);

    await publishNow(post.id, null, TEST_QUEUE_PATH);
    const result = await publishNow(post.id, null, TEST_QUEUE_PATH);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Post already published');
  });

  test('processQueue publishes all due posts', async () => {
    const pastTime = new Date(Date.now() - 3600000);
    addToQueue({
      content: 'Due post 1',
      platform: 'twitter',
      scheduledTime: pastTime
    }, TEST_QUEUE_PATH);
    addToQueue({
      content: 'Due post 2',
      platform: 'twitter',
      scheduledTime: pastTime
    }, TEST_QUEUE_PATH);

    const results = await processQueue(null, TEST_QUEUE_PATH);

    assert.strictEqual(results.length, 2);
    assert.ok(results.every(r => r.success === true));
  });

  test('getQueueStats returns correct statistics', () => {
    addToQueue({ content: 'Post 1', platform: 'twitter' }, TEST_QUEUE_PATH);
    addToQueue({ content: 'Post 2', platform: 'linkedin' }, TEST_QUEUE_PATH);
    addToQueue({ content: 'Post 3', platform: 'twitter', scheduledTime: new Date(Date.now() + 3600000) }, TEST_QUEUE_PATH);

    const stats = getQueueStats(TEST_QUEUE_PATH);

    assert.strictEqual(stats.total, 3);
    assert.strictEqual(stats.byStatus.pending, 2);
    assert.strictEqual(stats.byStatus.scheduled, 1);
    assert.strictEqual(stats.byPlatform.twitter, 2);
    assert.strictEqual(stats.byPlatform.linkedin, 1);
  });

  test('clearQueue removes all posts', () => {
    addToQueue({ content: 'Post 1', platform: 'twitter' }, TEST_QUEUE_PATH);
    addToQueue({ content: 'Post 2', platform: 'linkedin' }, TEST_QUEUE_PATH);

    const count = clearQueue(TEST_QUEUE_PATH);
    assert.strictEqual(count, 2);

    const stats = getQueueStats(TEST_QUEUE_PATH);
    assert.strictEqual(stats.total, 0);
  });
});
