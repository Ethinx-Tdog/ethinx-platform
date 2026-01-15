# Ethinx Platform

A modular content engine for platform-specific posts.

## Features

- **Auto-Hashtag Generator** - Automatically generate relevant hashtags from content
- **Engagement Tracker** - Track likes, shares, comments, and other engagement metrics
- **Stripe Content Unlocks** - Unlock premium content based on Stripe payments

## Installation

```bash
npm install
```

## Usage

### Auto-Hashtag Generator

Generate relevant hashtags from your content:

```javascript
const { generateHashtags, suggestTrendingHashtags } = require('ethinx-platform');

// Generate hashtags from content
const result = generateHashtags('Building amazing web applications with React', {
  platform: 'twitter',  // twitter, instagram, linkedin, facebook
  maxHashtags: 5,
  additionalTags: ['webdev', 'coding'],
  excludeTags: ['spam']
});

console.log(result.hashtags);
// ['#webdev', '#coding', '#building', '#amazing', '#web']

console.log(result.hashtagString);
// '#webdev #coding #building #amazing #web'

// Get category-based trending suggestions
const trending = suggestTrendingHashtags('Starting a new project', 'tech');
// ['#tech', '#innovation', '#digital', '#coding', '#startup', '#starting', '#project']
```

### Engagement Tracker

Track engagement metrics for your content:

```javascript
const {
  createTracker,
  recordEngagement,
  getMetrics,
  getDetailedStats,
  ENGAGEMENT_TYPES
} = require('ethinx-platform');

// Create a tracker for content
const tracker = createTracker('post-123', { title: 'My Post' });

// Record engagements
recordEngagement('post-123', ENGAGEMENT_TYPES.LIKE);
recordEngagement('post-123', ENGAGEMENT_TYPES.SHARE);
recordEngagement('post-123', ENGAGEMENT_TYPES.COMMENT, {
  text: 'Great post!',
  author: 'user456'
});
recordEngagement('post-123', ENGAGEMENT_TYPES.VIEW);

// Get metrics
const metrics = getMetrics('post-123');
// { contentId: 'post-123', metrics: { likes: 1, shares: 1, comments: 1, views: 1, ... }, totalEngagement: 4 }

// Get detailed statistics
const stats = getDetailedStats('post-123');
// { engagementRate: '75.00%', eventsByType: {...}, recentComments: [...], ... }
```

### Stripe Content Unlocks

Manage premium content access with Stripe payments:

```javascript
const {
  registerContent,
  grantAccess,
  checkAccess,
  processStripeWebhook,
  ACCESS_LEVELS
} = require('ethinx-platform');

// Register content with access requirements
registerContent('premium-article', {
  accessLevel: ACCESS_LEVELS.PREMIUM,
  price: 999,  // $9.99 in cents
  priceId: 'price_xxxxx'  // Stripe Price ID
});

// Check if user has access
const result = checkAccess('user-123', 'premium-article');
if (!result.hasAccess) {
  console.log(`Access denied: ${result.reason}`);
  console.log(`Required: ${result.requiredLevel}`);
}

// Grant access manually
grantAccess('user-123', {
  accessLevel: ACCESS_LEVELS.PREMIUM,
  expiresAt: new Date('2025-12-31')
});

// Or process Stripe webhooks to grant access automatically
app.post('/webhook', (req, res) => {
  const event = req.body;
  const result = processStripeWebhook(event);
  
  if (result.processed) {
    console.log('Grants created:', result.grants);
  }
  
  res.json({ received: true });
});
```

## API Reference

### Hashtag Generator

| Function | Description |
|----------|-------------|
| `generateHashtags(content, options)` | Generate hashtags from content |
| `extractKeywords(text)` | Extract keywords from text |
| `formatHashtag(word)` | Format a word as a hashtag |
| `suggestTrendingHashtags(content, category)` | Get trending hashtag suggestions |

### Engagement Tracker

| Function | Description |
|----------|-------------|
| `createTracker(contentId, metadata)` | Create a new engagement tracker |
| `recordEngagement(contentId, type, data)` | Record an engagement event |
| `getMetrics(contentId)` | Get engagement metrics |
| `getDetailedStats(contentId)` | Get detailed statistics |
| `getHistory(contentId, options)` | Get engagement history |
| `getAggregateMetrics()` | Get aggregate metrics across all content |

### Stripe Content Unlocks

| Function | Description |
|----------|-------------|
| `registerContent(contentId, options)` | Register content with access requirements |
| `grantAccess(userId, options)` | Grant access to a user |
| `checkAccess(userId, contentId)` | Check if user has access |
| `processStripeWebhook(event)` | Process Stripe webhook events |
| `getUserAccess(userId)` | Get user's access summary |

## Testing

```bash
npm test
```

## License

ISC