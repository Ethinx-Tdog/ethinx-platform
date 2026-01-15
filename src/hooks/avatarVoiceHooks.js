/**
 * Avatar/Voice Upgrade Hooks
 * Provides hooks for managing avatar and voice assets for content personalization
 */

const path = require('path');
const fs = require('fs');

// Default asset paths
const ASSETS_DIR = path.join(__dirname, '../../assets');
const AUDIO_DIR = path.join(ASSETS_DIR, 'audio');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');

/**
 * Hook configuration for avatar and voice upgrades
 */
const hookConfig = {
  voice: {
    intro: {
      filename: 'voice_intro.mp3',
      description: 'Introduction audio clip',
      maxDuration: 10, // seconds
      format: 'mp3'
    },
    outro: {
      filename: 'voice_outro.mp3',
      description: 'Closing audio clip',
      maxDuration: 5,
      format: 'mp3'
    },
    transition: {
      filename: 'voice_transition.mp3',
      description: 'Transition sound effect',
      maxDuration: 3,
      format: 'mp3'
    }
  },
  avatar: {
    overlay: {
      filename: 'avatar_overlay.png',
      description: 'Avatar overlay image for videos',
      dimensions: { width: 200, height: 200 },
      format: 'png'
    },
    profile: {
      filename: 'avatar_profile.png',
      description: 'Profile avatar image',
      dimensions: { width: 400, height: 400 },
      format: 'png'
    },
    thumbnail: {
      filename: 'avatar_thumbnail.png',
      description: 'Small thumbnail avatar',
      dimensions: { width: 50, height: 50 },
      format: 'png'
    }
  }
};

/**
 * Get the full path for a voice asset
 * @param {string} hookName - Name of the voice hook (intro, outro, transition)
 * @returns {string|null} Full file path or null if hook not found
 */
function getVoiceAssetPath(hookName) {
  const hook = hookConfig.voice[hookName];
  if (!hook) {
    return null;
  }
  return path.join(AUDIO_DIR, hook.filename);
}

/**
 * Get the full path for an avatar asset
 * @param {string} hookName - Name of the avatar hook (overlay, profile, thumbnail)
 * @returns {string|null} Full file path or null if hook not found
 */
function getAvatarAssetPath(hookName) {
  const hook = hookConfig.avatar[hookName];
  if (!hook) {
    return null;
  }
  return path.join(IMAGES_DIR, hook.filename);
}

/**
 * Check if a voice asset exists
 * @param {string} hookName - Name of the voice hook
 * @returns {boolean} True if asset exists
 */
function voiceAssetExists(hookName) {
  const assetPath = getVoiceAssetPath(hookName);
  if (!assetPath) {
    return false;
  }
  return fs.existsSync(assetPath);
}

/**
 * Check if an avatar asset exists
 * @param {string} hookName - Name of the avatar hook
 * @returns {boolean} True if asset exists
 */
function avatarAssetExists(hookName) {
  const assetPath = getAvatarAssetPath(hookName);
  if (!assetPath) {
    return false;
  }
  return fs.existsSync(assetPath);
}

/**
 * Get voice hook configuration
 * @param {string} hookName - Name of the voice hook
 * @returns {Object|null} Hook configuration or null if not found
 */
function getVoiceHookConfig(hookName) {
  return hookConfig.voice[hookName] || null;
}

/**
 * Get avatar hook configuration
 * @param {string} hookName - Name of the avatar hook
 * @returns {Object|null} Hook configuration or null if not found
 */
function getAvatarHookConfig(hookName) {
  return hookConfig.avatar[hookName] || null;
}

/**
 * Get all available voice hooks
 * @returns {string[]} Array of voice hook names
 */
function getAvailableVoiceHooks() {
  return Object.keys(hookConfig.voice);
}

/**
 * Get all available avatar hooks
 * @returns {string[]} Array of avatar hook names
 */
function getAvailableAvatarHooks() {
  return Object.keys(hookConfig.avatar);
}

/**
 * Register a custom voice hook
 * @param {string} hookName - Name for the new hook
 * @param {Object} config - Hook configuration
 * @param {string} config.filename - Filename for the asset
 * @param {string} config.description - Description of the hook
 * @param {number} config.maxDuration - Maximum duration in seconds
 * @param {string} [config.format='mp3'] - Audio format
 * @returns {boolean} True if registered successfully
 */
function registerVoiceHook(hookName, config) {
  if (!hookName || !config || !config.filename) {
    return false;
  }
  
  hookConfig.voice[hookName] = {
    filename: config.filename,
    description: config.description || '',
    maxDuration: config.maxDuration || 10,
    format: config.format || 'mp3'
  };
  
  return true;
}

/**
 * Register a custom avatar hook
 * @param {string} hookName - Name for the new hook
 * @param {Object} config - Hook configuration
 * @param {string} config.filename - Filename for the asset
 * @param {string} config.description - Description of the hook
 * @param {Object} config.dimensions - Width and height
 * @param {string} [config.format='png'] - Image format
 * @returns {boolean} True if registered successfully
 */
function registerAvatarHook(hookName, config) {
  if (!hookName || !config || !config.filename) {
    return false;
  }
  
  hookConfig.avatar[hookName] = {
    filename: config.filename,
    description: config.description || '',
    dimensions: config.dimensions || { width: 200, height: 200 },
    format: config.format || 'png'
  };
  
  return true;
}

/**
 * Create asset upgrade manifest
 * Returns information about which assets are available and which need to be uploaded
 * @returns {Object} Asset manifest with status information
 */
function getAssetManifest() {
  const manifest = {
    voice: {},
    avatar: {},
    summary: {
      totalVoiceHooks: 0,
      availableVoiceAssets: 0,
      totalAvatarHooks: 0,
      availableAvatarAssets: 0
    }
  };

  for (const [name, config] of Object.entries(hookConfig.voice)) {
    const exists = voiceAssetExists(name);
    manifest.voice[name] = {
      ...config,
      path: getVoiceAssetPath(name),
      exists
    };
    manifest.summary.totalVoiceHooks++;
    if (exists) manifest.summary.availableVoiceAssets++;
  }

  for (const [name, config] of Object.entries(hookConfig.avatar)) {
    const exists = avatarAssetExists(name);
    manifest.avatar[name] = {
      ...config,
      path: getAvatarAssetPath(name),
      exists
    };
    manifest.summary.totalAvatarHooks++;
    if (exists) manifest.summary.availableAvatarAssets++;
  }

  return manifest;
}

module.exports = {
  hookConfig,
  getVoiceAssetPath,
  getAvatarAssetPath,
  voiceAssetExists,
  avatarAssetExists,
  getVoiceHookConfig,
  getAvatarHookConfig,
  getAvailableVoiceHooks,
  getAvailableAvatarHooks,
  registerVoiceHook,
  registerAvatarHook,
  getAssetManifest,
  AUDIO_DIR,
  IMAGES_DIR
};
