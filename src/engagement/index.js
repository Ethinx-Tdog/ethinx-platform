/**
 * Engagement Tracker Module
 * Tracks likes, shares, comments, and other engagement metrics
 */

/**
 * Engagement types supported by the tracker
 */
const ENGAGEMENT_TYPES = {
  LIKE: 'like',
  SHARE: 'share',
  COMMENT: 'comment',
  VIEW: 'view',
  CLICK: 'click',
  SAVE: 'save',
  REPOST: 'repost'
};

/**
 * In-memory storage for engagement data
 * In production, this would be replaced with a database
 */
const engagementStore = new Map();

/**
 * Generates a unique ID for content
 * @returns {string} Unique identifier
 */
function generateId() {
  return `eng_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a new engagement tracker for content
 * @param {string} contentId - Unique identifier for the content
 * @param {Object} metadata - Optional metadata about the content
 * @returns {Object} Engagement tracker instance
 */
function createTracker(contentId, metadata = {}) {
  if (!contentId || typeof contentId !== 'string') {
    throw new Error('Content ID is required and must be a string');
  }

  const tracker = {
    id: generateId(),
    contentId,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metrics: {
      likes: 0,
      shares: 0,
      comments: 0,
      views: 0,
      clicks: 0,
      saves: 0,
      reposts: 0
    },
    history: [],
    commentsList: []
  };

  engagementStore.set(contentId, tracker);
  return tracker;
}

/**
 * Gets an existing tracker or creates a new one
 * @param {string} contentId - Content identifier
 * @returns {Object} Engagement tracker
 */
function getOrCreateTracker(contentId) {
  if (engagementStore.has(contentId)) {
    return engagementStore.get(contentId);
  }
  return createTracker(contentId);
}

/**
 * Records an engagement event
 * @param {string} contentId - Content identifier
 * @param {string} type - Type of engagement (like, share, comment, etc.)
 * @param {Object} data - Additional event data
 * @returns {Object} Updated engagement metrics
 */
function recordEngagement(contentId, type, data = {}) {
  if (!contentId) {
    throw new Error('Content ID is required');
  }

  if (!Object.values(ENGAGEMENT_TYPES).includes(type)) {
    throw new Error(`Invalid engagement type: ${type}. Valid types: ${Object.values(ENGAGEMENT_TYPES).join(', ')}`);
  }

  const tracker = getOrCreateTracker(contentId);
  const metricKey = `${type}s`;

  // Increment the metric
  if (tracker.metrics[metricKey] !== undefined) {
    tracker.metrics[metricKey]++;
  }

  // Record in history
  const event = {
    type,
    timestamp: new Date().toISOString(),
    data
  };
  tracker.history.push(event);

  // If it's a comment, store the comment data
  if (type === ENGAGEMENT_TYPES.COMMENT && data.text) {
    tracker.commentsList.push({
      id: generateId(),
      text: data.text,
      author: data.author || 'anonymous',
      timestamp: event.timestamp
    });
  }

  tracker.updatedAt = new Date().toISOString();

  return {
    contentId,
    type,
    metrics: { ...tracker.metrics },
    event
  };
}

/**
 * Gets engagement metrics for content
 * @param {string} contentId - Content identifier
 * @returns {Object|null} Engagement metrics or null if not found
 */
function getMetrics(contentId) {
  const tracker = engagementStore.get(contentId);
  if (!tracker) {
    return null;
  }

  return {
    contentId,
    metrics: { ...tracker.metrics },
    totalEngagement: Object.values(tracker.metrics).reduce((sum, val) => sum + val, 0),
    createdAt: tracker.createdAt,
    updatedAt: tracker.updatedAt
  };
}

/**
 * Gets detailed engagement statistics
 * @param {string} contentId - Content identifier
 * @returns {Object|null} Detailed statistics or null
 */
function getDetailedStats(contentId) {
  const tracker = engagementStore.get(contentId);
  if (!tracker) {
    return null;
  }

  const { metrics, history, commentsList } = tracker;
  const totalEngagement = Object.values(metrics).reduce((sum, val) => sum + val, 0);

  // Calculate engagement rate (engagements per view)
  const engagementRate = metrics.views > 0
    ? ((totalEngagement - metrics.views) / metrics.views * 100).toFixed(2)
    : 0;

  // Group events by type
  const eventsByType = history.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});

  return {
    contentId,
    metrics: { ...metrics },
    totalEngagement,
    engagementRate: `${engagementRate}%`,
    eventsByType,
    recentComments: commentsList.slice(-10),
    commentCount: commentsList.length,
    lastActivity: tracker.updatedAt,
    metadata: tracker.metadata
  };
}

/**
 * Gets engagement history for content
 * @param {string} contentId - Content identifier
 * @param {Object} options - Query options
 * @param {number} [options.limit=50] - Maximum number of events to return
 * @param {string} [options.type] - Filter by engagement type
 * @returns {Object|null} Engagement history or null
 */
function getHistory(contentId, options = {}) {
  const tracker = engagementStore.get(contentId);
  if (!tracker) {
    return null;
  }

  let { history } = tracker;
  const { limit = 50, type } = options;

  // Filter by type if specified
  if (type) {
    history = history.filter(event => event.type === type);
  }

  return {
    contentId,
    events: history.slice(-limit),
    totalEvents: history.length
  };
}

/**
 * Removes engagement tracker for content
 * @param {string} contentId - Content identifier
 * @returns {boolean} True if removed, false if not found
 */
function removeTracker(contentId) {
  return engagementStore.delete(contentId);
}

/**
 * Gets all tracked content IDs
 * @returns {string[]} Array of content IDs
 */
function getAllContentIds() {
  return Array.from(engagementStore.keys());
}

/**
 * Resets all engagement data (useful for testing)
 */
function resetAll() {
  engagementStore.clear();
}

/**
 * Calculates aggregate metrics across all tracked content
 * @returns {Object} Aggregate metrics
 */
function getAggregateMetrics() {
  const aggregate = {
    totalContent: engagementStore.size,
    totalLikes: 0,
    totalShares: 0,
    totalComments: 0,
    totalViews: 0,
    totalClicks: 0,
    totalSaves: 0,
    totalReposts: 0
  };

  for (const tracker of engagementStore.values()) {
    aggregate.totalLikes += tracker.metrics.likes;
    aggregate.totalShares += tracker.metrics.shares;
    aggregate.totalComments += tracker.metrics.comments;
    aggregate.totalViews += tracker.metrics.views;
    aggregate.totalClicks += tracker.metrics.clicks;
    aggregate.totalSaves += tracker.metrics.saves;
    aggregate.totalReposts += tracker.metrics.reposts;
  }

  aggregate.totalEngagement = aggregate.totalLikes + aggregate.totalShares +
    aggregate.totalComments + aggregate.totalClicks + aggregate.totalSaves +
    aggregate.totalReposts;

  return aggregate;
}

module.exports = {
  ENGAGEMENT_TYPES,
  createTracker,
  getOrCreateTracker,
  recordEngagement,
  getMetrics,
  getDetailedStats,
  getHistory,
  removeTracker,
  getAllContentIds,
  resetAll,
  getAggregateMetrics
};
