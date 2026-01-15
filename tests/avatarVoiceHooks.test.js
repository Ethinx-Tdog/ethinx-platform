/**
 * Tests for Avatar/Voice Hooks Module
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const {
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
} = require('../src/hooks/avatarVoiceHooks');

describe('Avatar/Voice Hooks', () => {
  test('getAvailableVoiceHooks returns expected hooks', () => {
    const hooks = getAvailableVoiceHooks();
    assert.ok(Array.isArray(hooks));
    assert.ok(hooks.includes('intro'));
    assert.ok(hooks.includes('outro'));
    assert.ok(hooks.includes('transition'));
  });

  test('getAvailableAvatarHooks returns expected hooks', () => {
    const hooks = getAvailableAvatarHooks();
    assert.ok(Array.isArray(hooks));
    assert.ok(hooks.includes('overlay'));
    assert.ok(hooks.includes('profile'));
    assert.ok(hooks.includes('thumbnail'));
  });

  test('getVoiceAssetPath returns correct path for intro', () => {
    const assetPath = getVoiceAssetPath('intro');
    assert.ok(assetPath);
    assert.ok(assetPath.endsWith('voice_intro.mp3'));
    assert.ok(assetPath.includes(AUDIO_DIR));
  });

  test('getVoiceAssetPath returns null for unknown hook', () => {
    const assetPath = getVoiceAssetPath('unknown_hook');
    assert.strictEqual(assetPath, null);
  });

  test('getAvatarAssetPath returns correct path for overlay', () => {
    const assetPath = getAvatarAssetPath('overlay');
    assert.ok(assetPath);
    assert.ok(assetPath.endsWith('avatar_overlay.png'));
    assert.ok(assetPath.includes(IMAGES_DIR));
  });

  test('getAvatarAssetPath returns null for unknown hook', () => {
    const assetPath = getAvatarAssetPath('unknown_hook');
    assert.strictEqual(assetPath, null);
  });

  test('getVoiceHookConfig returns config for intro', () => {
    const config = getVoiceHookConfig('intro');
    assert.ok(config);
    assert.strictEqual(config.filename, 'voice_intro.mp3');
    assert.strictEqual(config.maxDuration, 10);
    assert.strictEqual(config.format, 'mp3');
  });

  test('getVoiceHookConfig returns null for unknown hook', () => {
    const config = getVoiceHookConfig('unknown');
    assert.strictEqual(config, null);
  });

  test('getAvatarHookConfig returns config for overlay', () => {
    const config = getAvatarHookConfig('overlay');
    assert.ok(config);
    assert.strictEqual(config.filename, 'avatar_overlay.png');
    assert.ok(config.dimensions);
    assert.strictEqual(config.dimensions.width, 200);
    assert.strictEqual(config.dimensions.height, 200);
  });

  test('getAvatarHookConfig returns null for unknown hook', () => {
    const config = getAvatarHookConfig('unknown');
    assert.strictEqual(config, null);
  });

  test('voiceAssetExists returns boolean', () => {
    const exists = voiceAssetExists('intro');
    assert.strictEqual(typeof exists, 'boolean');
  });

  test('voiceAssetExists returns false for unknown hook', () => {
    const exists = voiceAssetExists('unknown');
    assert.strictEqual(exists, false);
  });

  test('avatarAssetExists returns boolean', () => {
    const exists = avatarAssetExists('overlay');
    assert.strictEqual(typeof exists, 'boolean');
  });

  test('avatarAssetExists returns false for unknown hook', () => {
    const exists = avatarAssetExists('unknown');
    assert.strictEqual(exists, false);
  });

  test('registerVoiceHook adds new hook', () => {
    const result = registerVoiceHook('custom_voice', {
      filename: 'custom_voice.mp3',
      description: 'Custom voice hook',
      maxDuration: 15
    });
    
    assert.strictEqual(result, true);
    assert.ok(getAvailableVoiceHooks().includes('custom_voice'));
    
    const config = getVoiceHookConfig('custom_voice');
    assert.strictEqual(config.filename, 'custom_voice.mp3');
    assert.strictEqual(config.maxDuration, 15);
  });

  test('registerVoiceHook returns false for invalid input', () => {
    assert.strictEqual(registerVoiceHook(null, {}), false);
    assert.strictEqual(registerVoiceHook('test', null), false);
    assert.strictEqual(registerVoiceHook('test', {}), false);
  });

  test('registerAvatarHook adds new hook', () => {
    const result = registerAvatarHook('custom_avatar', {
      filename: 'custom_avatar.png',
      description: 'Custom avatar hook',
      dimensions: { width: 300, height: 300 }
    });
    
    assert.strictEqual(result, true);
    assert.ok(getAvailableAvatarHooks().includes('custom_avatar'));
    
    const config = getAvatarHookConfig('custom_avatar');
    assert.strictEqual(config.filename, 'custom_avatar.png');
    assert.deepStrictEqual(config.dimensions, { width: 300, height: 300 });
  });

  test('registerAvatarHook returns false for invalid input', () => {
    assert.strictEqual(registerAvatarHook(null, {}), false);
    assert.strictEqual(registerAvatarHook('test', null), false);
    assert.strictEqual(registerAvatarHook('test', {}), false);
  });

  test('getAssetManifest returns complete manifest', () => {
    const manifest = getAssetManifest();
    
    assert.ok(manifest);
    assert.ok(manifest.voice);
    assert.ok(manifest.avatar);
    assert.ok(manifest.summary);
    
    assert.ok(manifest.voice.intro);
    assert.ok(manifest.avatar.overlay);
    
    assert.strictEqual(typeof manifest.summary.totalVoiceHooks, 'number');
    assert.strictEqual(typeof manifest.summary.availableVoiceAssets, 'number');
    assert.strictEqual(typeof manifest.summary.totalAvatarHooks, 'number');
    assert.strictEqual(typeof manifest.summary.availableAvatarAssets, 'number');
  });
});
