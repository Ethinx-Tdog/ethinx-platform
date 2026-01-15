/**
 * Ethinx Platform - Main Entry Point
 * A modular content engine for platform-specific posts
 */

const postTemplates = require('./templates/postTemplates');
const avatarVoiceHooks = require('./hooks/avatarVoiceHooks');
const scheduler = require('./scheduling/scheduler');

module.exports = {
  // Post Templates
  postTemplates: postTemplates.postTemplates,
  getTemplate: postTemplates.getTemplate,
  getAvailablePlatforms: postTemplates.getAvailablePlatforms,
  generatePost: postTemplates.generatePost,
  getCTASuggestions: postTemplates.getCTASuggestions,
  getToneGuidelines: postTemplates.getToneGuidelines,

  // Avatar/Voice Hooks
  hookConfig: avatarVoiceHooks.hookConfig,
  getVoiceAssetPath: avatarVoiceHooks.getVoiceAssetPath,
  getAvatarAssetPath: avatarVoiceHooks.getAvatarAssetPath,
  voiceAssetExists: avatarVoiceHooks.voiceAssetExists,
  avatarAssetExists: avatarVoiceHooks.avatarAssetExists,
  getVoiceHookConfig: avatarVoiceHooks.getVoiceHookConfig,
  getAvatarHookConfig: avatarVoiceHooks.getAvatarHookConfig,
  getAvailableVoiceHooks: avatarVoiceHooks.getAvailableVoiceHooks,
  getAvailableAvatarHooks: avatarVoiceHooks.getAvailableAvatarHooks,
  registerVoiceHook: avatarVoiceHooks.registerVoiceHook,
  registerAvatarHook: avatarVoiceHooks.registerAvatarHook,
  getAssetManifest: avatarVoiceHooks.getAssetManifest,

  // Scheduling
  PostStatus: scheduler.PostStatus,
  initializeQueue: scheduler.initializeQueue,
  loadQueue: scheduler.loadQueue,
  addToQueue: scheduler.addToQueue,
  getPost: scheduler.getPost,
  updatePost: scheduler.updatePost,
  removeFromQueue: scheduler.removeFromQueue,
  getPostsByStatus: scheduler.getPostsByStatus,
  getPostsByPlatform: scheduler.getPostsByPlatform,
  getDuePosts: scheduler.getDuePosts,
  publishNow: scheduler.publishNow,
  processQueue: scheduler.processQueue,
  getQueueStats: scheduler.getQueueStats,
  clearQueue: scheduler.clearQueue
};
