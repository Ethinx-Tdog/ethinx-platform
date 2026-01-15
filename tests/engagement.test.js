const {
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
} = require('../src/engagement');

describe('Engagement Tracker', () => {
  beforeEach(() => {
    resetAll();
  });

  describe('createTracker', () => {
    it('should create a new tracker for content', () => {
      const tracker = createTracker('content-123');
      
      expect(tracker).toHaveProperty('id');
      expect(tracker).toHaveProperty('contentId', 'content-123');
      expect(tracker).toHaveProperty('metrics');
      expect(tracker.metrics.likes).toBe(0);
      expect(tracker.metrics.shares).toBe(0);
      expect(tracker.metrics.comments).toBe(0);
    });

    it('should throw error for invalid content ID', () => {
      expect(() => createTracker('')).toThrow('Content ID is required');
      expect(() => createTracker(null)).toThrow('Content ID is required');
    });

    it('should include metadata when provided', () => {
      const tracker = createTracker('content-123', { title: 'Test Post' });
      
      expect(tracker.metadata).toEqual({ title: 'Test Post' });
    });
  });

  describe('getOrCreateTracker', () => {
    it('should return existing tracker', () => {
      const original = createTracker('content-456');
      const retrieved = getOrCreateTracker('content-456');
      
      expect(retrieved.id).toBe(original.id);
    });

    it('should create new tracker if not exists', () => {
      const tracker = getOrCreateTracker('new-content');
      
      expect(tracker).toHaveProperty('contentId', 'new-content');
    });
  });

  describe('recordEngagement', () => {
    it('should record a like', () => {
      createTracker('content-789');
      const result = recordEngagement('content-789', ENGAGEMENT_TYPES.LIKE);
      
      expect(result.metrics.likes).toBe(1);
      expect(result.type).toBe('like');
    });

    it('should record a share', () => {
      createTracker('content-789');
      const result = recordEngagement('content-789', ENGAGEMENT_TYPES.SHARE);
      
      expect(result.metrics.shares).toBe(1);
    });

    it('should record a comment with text', () => {
      createTracker('content-789');
      const result = recordEngagement('content-789', ENGAGEMENT_TYPES.COMMENT, {
        text: 'Great post!',
        author: 'user123'
      });
      
      expect(result.metrics.comments).toBe(1);
    });

    it('should throw error for invalid engagement type', () => {
      createTracker('content-789');
      expect(() => recordEngagement('content-789', 'invalid-type')).toThrow('Invalid engagement type');
    });

    it('should throw error for missing content ID', () => {
      expect(() => recordEngagement('', ENGAGEMENT_TYPES.LIKE)).toThrow('Content ID is required');
    });

    it('should accumulate multiple engagements', () => {
      createTracker('content-multi');
      
      recordEngagement('content-multi', ENGAGEMENT_TYPES.LIKE);
      recordEngagement('content-multi', ENGAGEMENT_TYPES.LIKE);
      recordEngagement('content-multi', ENGAGEMENT_TYPES.SHARE);
      
      const metrics = getMetrics('content-multi');
      expect(metrics.metrics.likes).toBe(2);
      expect(metrics.metrics.shares).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for existing content', () => {
      createTracker('content-metrics');
      recordEngagement('content-metrics', ENGAGEMENT_TYPES.VIEW);
      recordEngagement('content-metrics', ENGAGEMENT_TYPES.LIKE);
      
      const metrics = getMetrics('content-metrics');
      
      expect(metrics).toHaveProperty('contentId', 'content-metrics');
      expect(metrics).toHaveProperty('totalEngagement');
      expect(metrics.metrics.views).toBe(1);
      expect(metrics.metrics.likes).toBe(1);
    });

    it('should return null for non-existent content', () => {
      const metrics = getMetrics('non-existent');
      expect(metrics).toBeNull();
    });
  });

  describe('getDetailedStats', () => {
    it('should return detailed statistics', () => {
      createTracker('detailed-content');
      recordEngagement('detailed-content', ENGAGEMENT_TYPES.VIEW);
      recordEngagement('detailed-content', ENGAGEMENT_TYPES.VIEW);
      recordEngagement('detailed-content', ENGAGEMENT_TYPES.LIKE);
      recordEngagement('detailed-content', ENGAGEMENT_TYPES.COMMENT, {
        text: 'Nice!',
        author: 'user1'
      });
      
      const stats = getDetailedStats('detailed-content');
      
      expect(stats).toHaveProperty('engagementRate');
      expect(stats).toHaveProperty('eventsByType');
      expect(stats).toHaveProperty('recentComments');
      expect(stats.eventsByType.view).toBe(2);
      expect(stats.eventsByType.like).toBe(1);
    });

    it('should return null for non-existent content', () => {
      const stats = getDetailedStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('getHistory', () => {
    it('should return engagement history', () => {
      createTracker('history-content');
      recordEngagement('history-content', ENGAGEMENT_TYPES.LIKE);
      recordEngagement('history-content', ENGAGEMENT_TYPES.SHARE);
      
      const history = getHistory('history-content');
      
      expect(history.events).toHaveLength(2);
      expect(history.totalEvents).toBe(2);
    });

    it('should filter by type', () => {
      createTracker('filter-content');
      recordEngagement('filter-content', ENGAGEMENT_TYPES.LIKE);
      recordEngagement('filter-content', ENGAGEMENT_TYPES.LIKE);
      recordEngagement('filter-content', ENGAGEMENT_TYPES.SHARE);
      
      const history = getHistory('filter-content', { type: ENGAGEMENT_TYPES.LIKE });
      
      expect(history.events).toHaveLength(2);
    });

    it('should respect limit', () => {
      createTracker('limit-content');
      for (let i = 0; i < 10; i++) {
        recordEngagement('limit-content', ENGAGEMENT_TYPES.VIEW);
      }
      
      const history = getHistory('limit-content', { limit: 5 });
      
      expect(history.events).toHaveLength(5);
      expect(history.totalEvents).toBe(10);
    });
  });

  describe('removeTracker', () => {
    it('should remove existing tracker', () => {
      createTracker('to-remove');
      const removed = removeTracker('to-remove');
      
      expect(removed).toBe(true);
      expect(getMetrics('to-remove')).toBeNull();
    });

    it('should return false for non-existent tracker', () => {
      const removed = removeTracker('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('getAllContentIds', () => {
    it('should return all tracked content IDs', () => {
      createTracker('content-1');
      createTracker('content-2');
      createTracker('content-3');
      
      const ids = getAllContentIds();
      
      expect(ids).toContain('content-1');
      expect(ids).toContain('content-2');
      expect(ids).toContain('content-3');
    });
  });

  describe('getAggregateMetrics', () => {
    it('should return aggregate metrics across all content', () => {
      createTracker('agg-1');
      createTracker('agg-2');
      
      recordEngagement('agg-1', ENGAGEMENT_TYPES.LIKE);
      recordEngagement('agg-1', ENGAGEMENT_TYPES.LIKE);
      recordEngagement('agg-2', ENGAGEMENT_TYPES.SHARE);
      recordEngagement('agg-2', ENGAGEMENT_TYPES.VIEW);
      
      const aggregate = getAggregateMetrics();
      
      expect(aggregate.totalContent).toBe(2);
      expect(aggregate.totalLikes).toBe(2);
      expect(aggregate.totalShares).toBe(1);
      expect(aggregate.totalViews).toBe(1);
    });
  });

  describe('ENGAGEMENT_TYPES', () => {
    it('should have all expected engagement types', () => {
      expect(ENGAGEMENT_TYPES).toHaveProperty('LIKE', 'like');
      expect(ENGAGEMENT_TYPES).toHaveProperty('SHARE', 'share');
      expect(ENGAGEMENT_TYPES).toHaveProperty('COMMENT', 'comment');
      expect(ENGAGEMENT_TYPES).toHaveProperty('VIEW', 'view');
      expect(ENGAGEMENT_TYPES).toHaveProperty('CLICK', 'click');
      expect(ENGAGEMENT_TYPES).toHaveProperty('SAVE', 'save');
      expect(ENGAGEMENT_TYPES).toHaveProperty('REPOST', 'repost');
    });
  });
});
