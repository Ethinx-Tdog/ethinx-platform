/**
 * Scheduling Logic for Post Queue Management
 * Handles post scheduling, queue management, and publishing
 */

const fs = require('fs');
const path = require('path');

// Default queue file path
const DEFAULT_QUEUE_PATH = path.join(__dirname, 'postQueue.json');

/**
 * Post status enum
 */
const PostStatus = {
  PENDING: 'pending',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Initialize the post queue file if it doesn't exist
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {boolean} True if initialized or already exists
 */
function initializeQueue(queuePath = DEFAULT_QUEUE_PATH) {
  if (!fs.existsSync(queuePath)) {
    const initialQueue = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      posts: []
    };
    fs.writeFileSync(queuePath, JSON.stringify(initialQueue, null, 2));
  }
  return true;
}

/**
 * Load the post queue from file
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {Object} Queue data
 */
function loadQueue(queuePath = DEFAULT_QUEUE_PATH) {
  initializeQueue(queuePath);
  const data = fs.readFileSync(queuePath, 'utf8');
  return JSON.parse(data);
}

/**
 * Save the post queue to file
 * @param {Object} queue - Queue data to save
 * @param {string} [queuePath] - Custom path for queue file
 * @throws {Error} If file write fails
 */
function saveQueue(queue, queuePath = DEFAULT_QUEUE_PATH) {
  queue.lastUpdated = new Date().toISOString();
  try {
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
  } catch (error) {
    throw new Error(`Failed to save queue to ${queuePath}: ${error.message}`);
  }
}

/**
 * Generate a unique post ID using crypto for better uniqueness
 * @returns {string} Unique post ID
 */
function generatePostId() {
  const crypto = require('crypto');
  return `post_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Add a post to the queue
 * @param {Object} post - Post data
 * @param {string} post.content - Post content
 * @param {string} post.platform - Target platform
 * @param {Date|string} [post.scheduledTime] - Scheduled publish time
 * @param {Object} [post.metadata] - Additional metadata
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {Object} Added post with ID and status
 */
function addToQueue(post, queuePath = DEFAULT_QUEUE_PATH) {
  if (!post || !post.content || !post.platform) {
    throw new Error('Post must have content and platform');
  }

  const queue = loadQueue(queuePath);
  
  const newPost = {
    id: generatePostId(),
    content: post.content,
    platform: post.platform.toLowerCase(),
    status: post.scheduledTime ? PostStatus.SCHEDULED : PostStatus.PENDING,
    scheduledTime: post.scheduledTime ? new Date(post.scheduledTime).toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: post.metadata || {}
  };

  queue.posts.push(newPost);
  saveQueue(queue, queuePath);

  return newPost;
}

/**
 * Get a post by ID
 * @param {string} postId - Post ID
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {Object|null} Post data or null if not found
 */
function getPost(postId, queuePath = DEFAULT_QUEUE_PATH) {
  const queue = loadQueue(queuePath);
  return queue.posts.find(p => p.id === postId) || null;
}

/**
 * Update a post in the queue
 * @param {string} postId - Post ID to update
 * @param {Object} updates - Fields to update
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {Object|null} Updated post or null if not found
 */
function updatePost(postId, updates, queuePath = DEFAULT_QUEUE_PATH) {
  const queue = loadQueue(queuePath);
  const postIndex = queue.posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return null;
  }

  queue.posts[postIndex] = {
    ...queue.posts[postIndex],
    ...updates,
    id: queue.posts[postIndex].id, // Prevent ID change
    updatedAt: new Date().toISOString()
  };

  saveQueue(queue, queuePath);
  return queue.posts[postIndex];
}

/**
 * Remove a post from the queue
 * @param {string} postId - Post ID to remove
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {boolean} True if removed, false if not found
 */
function removeFromQueue(postId, queuePath = DEFAULT_QUEUE_PATH) {
  const queue = loadQueue(queuePath);
  const initialLength = queue.posts.length;
  queue.posts = queue.posts.filter(p => p.id !== postId);
  
  if (queue.posts.length === initialLength) {
    return false;
  }

  saveQueue(queue, queuePath);
  return true;
}

/**
 * Get all posts with a specific status
 * @param {string} status - Status to filter by
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {Object[]} Array of posts with the specified status
 */
function getPostsByStatus(status, queuePath = DEFAULT_QUEUE_PATH) {
  const queue = loadQueue(queuePath);
  return queue.posts.filter(p => p.status === status);
}

/**
 * Get all posts scheduled for a specific platform
 * @param {string} platform - Platform name
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {Object[]} Array of posts for the platform
 */
function getPostsByPlatform(platform, queuePath = DEFAULT_QUEUE_PATH) {
  const queue = loadQueue(queuePath);
  return queue.posts.filter(p => p.platform === platform.toLowerCase());
}

/**
 * Get posts that are due to be published
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {Object[]} Array of posts ready for publishing
 */
function getDuePosts(queuePath = DEFAULT_QUEUE_PATH) {
  const queue = loadQueue(queuePath);
  const now = new Date();
  
  return queue.posts.filter(p => 
    p.status === PostStatus.SCHEDULED && 
    p.scheduledTime && 
    new Date(p.scheduledTime) <= now
  );
}

/**
 * Publish a post immediately
 * @param {string} postId - Post ID to publish
 * @param {Function} [publishCallback] - Optional callback for actual publishing
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {Object} Publish result
 */
async function publishNow(postId, publishCallback, queuePath = DEFAULT_QUEUE_PATH) {
  const post = getPost(postId, queuePath);
  
  if (!post) {
    return {
      success: false,
      error: 'Post not found',
      postId
    };
  }

  if (post.status === PostStatus.PUBLISHED) {
    return {
      success: false,
      error: 'Post already published',
      postId,
      post
    };
  }

  if (post.status === PostStatus.CANCELLED) {
    return {
      success: false,
      error: 'Cannot publish cancelled post',
      postId,
      post
    };
  }

  try {
    // If a publish callback is provided, call it
    if (typeof publishCallback === 'function') {
      await publishCallback(post);
    }

    // Update post status to published
    const updatedPost = updatePost(postId, {
      status: PostStatus.PUBLISHED,
      publishedAt: new Date().toISOString()
    }, queuePath);

    return {
      success: true,
      postId,
      post: updatedPost,
      publishedAt: updatedPost.publishedAt
    };
  } catch (error) {
    // Update post status to failed
    updatePost(postId, {
      status: PostStatus.FAILED,
      error: error.message
    }, queuePath);

    return {
      success: false,
      error: error.message,
      postId,
      post: getPost(postId, queuePath)
    };
  }
}

/**
 * Process all due posts
 * @param {Function} [publishCallback] - Optional callback for actual publishing
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {Object[]} Array of publish results
 */
async function processQueue(publishCallback, queuePath = DEFAULT_QUEUE_PATH) {
  const duePosts = getDuePosts(queuePath);
  const results = [];

  for (const post of duePosts) {
    const result = await publishNow(post.id, publishCallback, queuePath);
    results.push(result);
  }

  return results;
}

/**
 * Get queue statistics
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {Object} Queue statistics
 */
function getQueueStats(queuePath = DEFAULT_QUEUE_PATH) {
  const queue = loadQueue(queuePath);
  
  const stats = {
    total: queue.posts.length,
    byStatus: {},
    byPlatform: {},
    lastUpdated: queue.lastUpdated
  };

  for (const status of Object.values(PostStatus)) {
    stats.byStatus[status] = queue.posts.filter(p => p.status === status).length;
  }

  const platforms = [...new Set(queue.posts.map(p => p.platform))];
  for (const platform of platforms) {
    stats.byPlatform[platform] = queue.posts.filter(p => p.platform === platform).length;
  }

  return stats;
}

/**
 * Clear all posts from the queue (use with caution)
 * @param {string} [queuePath] - Custom path for queue file
 * @returns {number} Number of posts cleared
 */
function clearQueue(queuePath = DEFAULT_QUEUE_PATH) {
  const queue = loadQueue(queuePath);
  const count = queue.posts.length;
  queue.posts = [];
  saveQueue(queue, queuePath);
  return count;
}

module.exports = {
  PostStatus,
  initializeQueue,
  loadQueue,
  saveQueue,
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
  clearQueue,
  DEFAULT_QUEUE_PATH
};
