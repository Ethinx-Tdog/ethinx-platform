# Ethinx Platform

A modular content engine for platform-specific posts.

## Features

- **Post Templates**: Platform-specific templates with CTA, tone, and format configurations for Twitter/X, LinkedIn, Instagram, Facebook, and TikTok
- **Avatar/Voice Hooks**: Configurable hooks for voice intros, outros, transitions, and avatar overlays
- **Scheduling Logic**: Queue management with scheduling, publishing, and status tracking

## Installation

```bash
npm install
```

## Usage

```javascript
const platform = require('./src/index');

// Generate a platform-specific post
const post = platform.generatePost('twitter', {
  content: 'Check out our new feature!',
  cta: 'Learn more',
  hashtags: ['tech', 'startup']
});

// Get CTA suggestions for a platform
const ctas = platform.getCTASuggestions('linkedin');

// Add a post to the queue
const queuedPost = platform.addToQueue({
  content: 'My scheduled post',
  platform: 'twitter',
  scheduledTime: new Date(Date.now() + 3600000) // 1 hour from now
});

// Publish a post immediately
await platform.publishNow(queuedPost.id);

// Process all due posts
await platform.processQueue();

// Get queue statistics
const stats = platform.getQueueStats();
```

## API Reference

### Post Templates

- `getAvailablePlatforms()` - Get list of supported platforms
- `getTemplate(platform)` - Get full template config for a platform
- `generatePost(platform, params)` - Generate formatted post content
- `getCTASuggestions(platform, type)` - Get CTA suggestions
- `getToneGuidelines(platform)` - Get tone/voice guidelines

### Avatar/Voice Hooks

- `getAvailableVoiceHooks()` - List available voice hooks
- `getAvailableAvatarHooks()` - List available avatar hooks
- `getVoiceAssetPath(hookName)` - Get file path for voice asset
- `getAvatarAssetPath(hookName)` - Get file path for avatar asset
- `registerVoiceHook(name, config)` - Register custom voice hook
- `registerAvatarHook(name, config)` - Register custom avatar hook
- `getAssetManifest()` - Get full asset availability status

### Scheduling

- `addToQueue(post)` - Add post to queue
- `getPost(postId)` - Get post by ID
- `updatePost(postId, updates)` - Update post
- `removeFromQueue(postId)` - Remove post from queue
- `publishNow(postId, callback)` - Publish post immediately
- `processQueue(callback)` - Process all due posts
- `getQueueStats()` - Get queue statistics
- `clearQueue()` - Clear all posts from queue

## Testing

```bash
npm test
```

## License

MIT