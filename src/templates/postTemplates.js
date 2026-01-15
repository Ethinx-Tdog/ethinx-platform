/**
 * Post Templates for each social media platform
 * Contains CTA (Call-to-Action), tone, and format configurations
 */

const postTemplates = {
  twitter: {
    name: 'Twitter/X',
    maxLength: 280,
    format: {
      type: 'short-form',
      hashtagLimit: 3,
      mentionSupport: true,
      mediaTypes: ['image', 'video', 'gif']
    },
    tone: {
      style: 'casual',
      voice: 'conversational',
      emoji: true,
      guidelines: [
        'Be concise and punchy',
        'Use hashtags sparingly',
        'Ask questions to drive engagement'
      ]
    },
    cta: {
      primary: ['Read more', 'Learn more', 'Click the link'],
      secondary: ['RT if you agree', 'Drop a comment', 'Share your thoughts'],
      linkPlacement: 'end'
    },
    template: '{{content}}\n\n{{cta}}\n{{hashtags}}'
  },

  linkedin: {
    name: 'LinkedIn',
    maxLength: 3000,
    format: {
      type: 'long-form',
      hashtagLimit: 5,
      mentionSupport: true,
      mediaTypes: ['image', 'video', 'document', 'carousel']
    },
    tone: {
      style: 'professional',
      voice: 'authoritative',
      emoji: false,
      guidelines: [
        'Lead with a hook in the first line',
        'Use line breaks for readability',
        'Share insights and learnings',
        'Be authentic but professional'
      ]
    },
    cta: {
      primary: ['Connect with me', 'Follow for more insights', 'Visit our website'],
      secondary: ['What are your thoughts?', 'Share your experience', 'Tag someone who needs this'],
      linkPlacement: 'end'
    },
    template: '{{hook}}\n\n{{content}}\n\n{{cta}}\n\n{{hashtags}}'
  },

  instagram: {
    name: 'Instagram',
    maxLength: 2200,
    format: {
      type: 'visual-first',
      hashtagLimit: 30,
      mentionSupport: true,
      mediaTypes: ['image', 'video', 'carousel', 'reel', 'story']
    },
    tone: {
      style: 'inspirational',
      voice: 'friendly',
      emoji: true,
      guidelines: [
        'Start with an attention-grabbing line',
        'Tell a story',
        'Use emojis to break up text',
        'Put hashtags at the end or in first comment'
      ]
    },
    cta: {
      primary: ['Link in bio', 'Save this post', 'Share to your story'],
      secondary: ['Double tap if you agree', 'Tag a friend', 'Comment below'],
      linkPlacement: 'bio'
    },
    template: '{{content}}\n\n{{cta}}\n.\n.\n.\n{{hashtags}}'
  },

  facebook: {
    name: 'Facebook',
    maxLength: 63206,
    format: {
      type: 'mixed-media',
      hashtagLimit: 2,
      mentionSupport: true,
      mediaTypes: ['image', 'video', 'link', 'event', 'poll']
    },
    tone: {
      style: 'community-focused',
      voice: 'warm',
      emoji: true,
      guidelines: [
        'Encourage discussion',
        'Use questions to boost engagement',
        'Keep hashtags minimal',
        'Share relatable content'
      ]
    },
    cta: {
      primary: ['Learn more', 'Sign up', 'Shop now'],
      secondary: ['Share with friends', 'Leave a comment', 'React if this resonates'],
      linkPlacement: 'inline'
    },
    template: '{{content}}\n\n{{cta}}\n{{hashtags}}'
  },

  tiktok: {
    name: 'TikTok',
    maxLength: 2200,
    format: {
      type: 'video-first',
      hashtagLimit: 5,
      mentionSupport: true,
      mediaTypes: ['video', 'duet', 'stitch']
    },
    tone: {
      style: 'trendy',
      voice: 'energetic',
      emoji: true,
      guidelines: [
        'Hook viewers in the first 3 seconds',
        'Keep captions short and catchy',
        'Use trending sounds and hashtags',
        'Be authentic and entertaining'
      ]
    },
    cta: {
      primary: ['Follow for more', 'Link in bio', 'Part 2 coming soon'],
      secondary: ['Duet this', 'Share with someone who needs this', 'Comment for part 2'],
      linkPlacement: 'bio'
    },
    template: '{{content}} {{cta}} {{hashtags}}'
  }
};

/**
 * Get template for a specific platform
 * @param {string} platform - Platform name (twitter, linkedin, instagram, facebook, tiktok)
 * @returns {Object|null} Platform template or null if not found
 */
function getTemplate(platform) {
  const normalizedPlatform = platform.toLowerCase().trim();
  return postTemplates[normalizedPlatform] || null;
}

/**
 * Get all available platforms
 * @returns {string[]} Array of platform names
 */
function getAvailablePlatforms() {
  return Object.keys(postTemplates);
}

/**
 * Generate post content from template
 * @param {string} platform - Platform name
 * @param {Object} params - Content parameters
 * @param {string} params.content - Main content
 * @param {string} [params.hook] - Hook line (for LinkedIn)
 * @param {string} [params.cta] - Call-to-action text
 * @param {string[]} [params.hashtags] - Array of hashtags
 * @returns {string|null} Formatted post content or null if platform not found
 */
function generatePost(platform, params) {
  const template = getTemplate(platform);
  if (!template) {
    return null;
  }

  const { content = '', hook = '', cta = '', hashtags = [] } = params;
  
  let formattedHashtags = hashtags
    .slice(0, template.format.hashtagLimit)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    .join(' ');

  let post = template.template
    .replace('{{content}}', content)
    .replace('{{hook}}', hook)
    .replace('{{cta}}', cta)
    .replace('{{hashtags}}', formattedHashtags);

  // Trim and remove extra newlines
  post = post.replace(/\n{3,}/g, '\n\n').trim();

  // Enforce max length
  if (post.length > template.maxLength) {
    post = post.substring(0, template.maxLength - 3) + '...';
  }

  return post;
}

/**
 * Get CTA suggestions for a platform
 * @param {string} platform - Platform name
 * @param {string} [type='primary'] - CTA type ('primary' or 'secondary')
 * @returns {string[]|null} Array of CTA suggestions or null if platform not found
 */
function getCTASuggestions(platform, type = 'primary') {
  const template = getTemplate(platform);
  if (!template) {
    return null;
  }
  return template.cta[type] || template.cta.primary;
}

/**
 * Get tone guidelines for a platform
 * @param {string} platform - Platform name
 * @returns {Object|null} Tone configuration or null if platform not found
 */
function getToneGuidelines(platform) {
  const template = getTemplate(platform);
  if (!template) {
    return null;
  }
  return template.tone;
}

module.exports = {
  postTemplates,
  getTemplate,
  getAvailablePlatforms,
  generatePost,
  getCTASuggestions,
  getToneGuidelines
};
