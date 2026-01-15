# Ethinx Platform

A modular content engine for platform-specific posts.

## Phase 3: Deployment Targets

This module provides deployment targets for generating platform-specific outputs for social media platforms.

### Supported Platforms

#### Facebook
- **Text**: Main post content
- **Image**: Visual content for the post
- **Voice Intro**: Optional audio introduction

#### Instagram
- **Image**: Main visual content
- **Caption**: Text caption for the post
- **Avatar Overlay**: Optional avatar image overlay

#### LinkedIn
- **Text**: Professional post content
- **CTA**: Call-to-action with text and URL
- **Brand Tone Enforcement**: Applies brand tone (professional, thought_leadership, corporate, inspirational)

## Usage

```javascript
import { FacebookTarget, InstagramTarget, LinkedInTarget } from 'ethinx-platform';

// Facebook
const facebook = new FacebookTarget();
const fbOutput = facebook.generateOutput({
  text: 'Check out our new product!',
  imageUrl: 'https://example.com/image.jpg',
  voiceIntroUrl: 'https://example.com/intro.mp3', // optional
});

// Instagram
const instagram = new InstagramTarget();
const igOutput = instagram.generateOutput({
  imageUrl: 'https://example.com/photo.jpg',
  caption: 'Amazing view! #photography',
  avatarOverlayUrl: 'https://example.com/avatar.png', // optional
});

// LinkedIn
const linkedin = new LinkedInTarget();
const liOutput = linkedin.generateOutput({
  text: 'Exciting company news!',
  cta: {
    text: 'Learn More',
    url: 'https://example.com/landing',
  },
  brandTone: 'professional', // optional, defaults to 'professional'
});
```

## Testing

```bash
npm test
```