/**
 * Ethinx Platform - Modular Content Engine
 * 
 * A modular content engine for platform-specific posts with
 * auto-hashtag generation, engagement tracking, and Stripe-triggered content unlocks.
 */

const hashtags = require('./hashtags');
const engagement = require('./engagement');
const stripe = require('./stripe');

module.exports = {
  // Auto-Hashtag Generator
  hashtags,
  generateHashtags: hashtags.generateHashtags,
  extractKeywords: hashtags.extractKeywords,
  suggestTrendingHashtags: hashtags.suggestTrendingHashtags,

  // Engagement Tracker
  engagement,
  ENGAGEMENT_TYPES: engagement.ENGAGEMENT_TYPES,
  createTracker: engagement.createTracker,
  recordEngagement: engagement.recordEngagement,
  getMetrics: engagement.getMetrics,
  getDetailedStats: engagement.getDetailedStats,

  // Stripe Content Unlocks
  stripe,
  ACCESS_LEVELS: stripe.ACCESS_LEVELS,
  registerContent: stripe.registerContent,
  grantAccess: stripe.grantAccess,
  checkAccess: stripe.checkAccess,
  processStripeWebhook: stripe.processStripeWebhook
};
