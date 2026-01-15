/**
 * Auto-Hashtag Generator Module
 * Generates relevant hashtags based on content analysis
 */

/**
 * Minimum word length for keyword extraction
 */
const MIN_WORD_LENGTH = 2;

/**
 * Common stop words to exclude from hashtag generation
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'shall', 'can', 'need', 'it', 'its', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
  'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
  'only', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now',
  'here', 'there', 'then', 'with', 'from', 'by', 'about', 'into', 'through'
]);

/**
 * Platform-specific hashtag configurations
 */
const PLATFORM_CONFIG = {
  twitter: { maxHashtags: 5, maxLength: 280 },
  instagram: { maxHashtags: 30, maxLength: 2200 },
  linkedin: { maxHashtags: 5, maxLength: 3000 },
  facebook: { maxHashtags: 10, maxLength: 63206 },
  default: { maxHashtags: 10, maxLength: 500 }
};

/**
 * Extracts keywords from text content
 * @param {string} text - The input text to analyze
 * @returns {string[]} Array of extracted keywords
 */
function extractKeywords(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize text and split into words
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > MIN_WORD_LENGTH && !STOP_WORDS.has(word));

  // Count word frequency
  const wordFrequency = {};
  for (const word of words) {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  }

  // Sort by frequency and return top keywords
  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

/**
 * Formats a word into a valid hashtag
 * @param {string} word - The word to convert
 * @returns {string} Formatted hashtag
 */
function formatHashtag(word) {
  if (!word || typeof word !== 'string') {
    return '';
  }
  
  // Remove special characters and convert to camelCase if needed
  const cleaned = word
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
  
  return cleaned ? `#${cleaned}` : '';
}

/**
 * Generates hashtags from content
 * @param {string} content - The content to analyze
 * @param {Object} options - Configuration options
 * @param {string} [options.platform='default'] - Target platform
 * @param {number} [options.maxHashtags] - Maximum number of hashtags
 * @param {string[]} [options.additionalTags=[]] - Additional tags to include
 * @param {string[]} [options.excludeTags=[]] - Tags to exclude
 * @returns {Object} Generated hashtags result
 */
function generateHashtags(content, options = {}) {
  const {
    platform = 'default',
    maxHashtags,
    additionalTags = [],
    excludeTags = []
  } = options;

  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.default;
  const limit = maxHashtags || config.maxHashtags;
  const excludeSet = new Set(excludeTags.map(tag => tag.toLowerCase().replace('#', '')));

  // Extract keywords from content
  const keywords = extractKeywords(content);

  // Generate hashtags from keywords
  const hashtags = [];
  const seen = new Set();

  // Add additional tags first
  for (const tag of additionalTags) {
    const formatted = formatHashtag(tag);
    const tagLower = tag.toLowerCase().replace('#', '');
    if (formatted && !seen.has(tagLower) && !excludeSet.has(tagLower)) {
      hashtags.push(formatted);
      seen.add(tagLower);
    }
  }

  // Add keyword-based hashtags
  for (const keyword of keywords) {
    if (hashtags.length >= limit) break;
    
    const formatted = formatHashtag(keyword);
    const keywordLower = keyword.toLowerCase();
    if (formatted && !seen.has(keywordLower) && !excludeSet.has(keywordLower)) {
      hashtags.push(formatted);
      seen.add(keywordLower);
    }
  }

  return {
    hashtags,
    hashtagString: hashtags.join(' '),
    count: hashtags.length,
    platform,
    maxAllowed: config.maxHashtags
  };
}

/**
 * Analyzes content and suggests trending-style hashtags
 * @param {string} content - The content to analyze
 * @param {string} category - Content category (e.g., 'tech', 'lifestyle', 'business')
 * @returns {string[]} Suggested trending hashtags
 */
function suggestTrendingHashtags(content, category = '') {
  const categoryHashtags = {
    tech: ['#tech', '#innovation', '#digital', '#coding', '#startup'],
    lifestyle: ['#lifestyle', '#wellness', '#motivation', '#inspiration', '#life'],
    business: ['#business', '#entrepreneur', '#marketing', '#growth', '#success'],
    finance: ['#finance', '#investing', '#money', '#crypto', '#fintech'],
    health: ['#health', '#fitness', '#wellness', '#nutrition', '#mindfulness'],
    travel: ['#travel', '#adventure', '#wanderlust', '#explore', '#vacation'],
    food: ['#food', '#foodie', '#recipe', '#cooking', '#delicious'],
    fashion: ['#fashion', '#style', '#ootd', '#beauty', '#trends']
  };

  const baseTags = categoryHashtags[category.toLowerCase()] || [];
  const contentTags = generateHashtags(content, { maxHashtags: 5 }).hashtags;
  
  return [...new Set([...baseTags, ...contentTags])];
}

module.exports = {
  generateHashtags,
  extractKeywords,
  formatHashtag,
  suggestTrendingHashtags,
  PLATFORM_CONFIG,
  STOP_WORDS
};
