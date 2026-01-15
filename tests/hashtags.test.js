const {
  generateHashtags,
  extractKeywords,
  formatHashtag,
  suggestTrendingHashtags,
  PLATFORM_CONFIG,
  STOP_WORDS
} = require('../src/hashtags');

describe('Auto-Hashtag Generator', () => {
  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const text = 'JavaScript is amazing for building web applications';
      const keywords = extractKeywords(text);
      
      expect(keywords).toContain('javascript');
      expect(keywords).toContain('amazing');
      expect(keywords).toContain('building');
      expect(keywords).toContain('web');
      expect(keywords).toContain('applications');
    });

    it('should exclude stop words', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const keywords = extractKeywords(text);
      
      expect(keywords).not.toContain('the');
      expect(keywords).toContain('quick');
      expect(keywords).toContain('brown');
      expect(keywords).toContain('fox');
    });

    it('should return empty array for invalid input', () => {
      expect(extractKeywords('')).toEqual([]);
      expect(extractKeywords(null)).toEqual([]);
      expect(extractKeywords(undefined)).toEqual([]);
    });

    it('should sort keywords by frequency', () => {
      const text = 'coding coding coding javascript javascript web';
      const keywords = extractKeywords(text);
      
      expect(keywords[0]).toBe('coding');
      expect(keywords[1]).toBe('javascript');
    });
  });

  describe('formatHashtag', () => {
    it('should format word as hashtag', () => {
      expect(formatHashtag('javascript')).toBe('#javascript');
      expect(formatHashtag('WebDev')).toBe('#webdev');
    });

    it('should remove special characters', () => {
      expect(formatHashtag('c++')).toBe('#c');
      expect(formatHashtag('node.js')).toBe('#nodejs');
    });

    it('should return empty string for invalid input', () => {
      expect(formatHashtag('')).toBe('');
      expect(formatHashtag(null)).toBe('');
    });
  });

  describe('generateHashtags', () => {
    it('should generate hashtags from content', () => {
      const content = 'Building amazing web applications with React and TypeScript';
      const result = generateHashtags(content);
      
      expect(result.hashtags).toBeInstanceOf(Array);
      expect(result.hashtags.length).toBeGreaterThan(0);
      expect(result.hashtags[0]).toMatch(/^#/);
      expect(result.count).toBe(result.hashtags.length);
    });

    it('should respect platform limits', () => {
      const content = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12';
      
      const twitterResult = generateHashtags(content, { platform: 'twitter' });
      expect(twitterResult.hashtags.length).toBeLessThanOrEqual(5);
      expect(twitterResult.platform).toBe('twitter');
      
      const instagramResult = generateHashtags(content, { platform: 'instagram' });
      expect(instagramResult.hashtags.length).toBeLessThanOrEqual(30);
    });

    it('should include additional tags', () => {
      const content = 'Building web applications';
      const result = generateHashtags(content, {
        additionalTags: ['coding', 'developer']
      });
      
      expect(result.hashtags).toContain('#coding');
      expect(result.hashtags).toContain('#developer');
    });

    it('should exclude specified tags', () => {
      const content = 'JavaScript coding programming';
      const result = generateHashtags(content, {
        excludeTags: ['javascript']
      });
      
      expect(result.hashtags).not.toContain('#javascript');
    });

    it('should respect custom maxHashtags limit', () => {
      const content = 'word1 word2 word3 word4 word5 word6 word7';
      const result = generateHashtags(content, { maxHashtags: 3 });
      
      expect(result.hashtags.length).toBeLessThanOrEqual(3);
    });

    it('should return hashtagString', () => {
      const content = 'Building web applications';
      const result = generateHashtags(content);
      
      expect(result.hashtagString).toBe(result.hashtags.join(' '));
    });
  });

  describe('suggestTrendingHashtags', () => {
    it('should suggest hashtags for tech category', () => {
      const content = 'Building a new startup';
      const suggestions = suggestTrendingHashtags(content, 'tech');
      
      expect(suggestions).toContain('#tech');
      expect(suggestions).toContain('#innovation');
    });

    it('should suggest hashtags for lifestyle category', () => {
      const suggestions = suggestTrendingHashtags('Morning routine', 'lifestyle');
      
      expect(suggestions).toContain('#lifestyle');
      expect(suggestions).toContain('#motivation');
    });

    it('should work without category', () => {
      const content = 'Some random content here';
      const suggestions = suggestTrendingHashtags(content);
      
      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('PLATFORM_CONFIG', () => {
    it('should have configs for major platforms', () => {
      expect(PLATFORM_CONFIG).toHaveProperty('twitter');
      expect(PLATFORM_CONFIG).toHaveProperty('instagram');
      expect(PLATFORM_CONFIG).toHaveProperty('linkedin');
      expect(PLATFORM_CONFIG).toHaveProperty('facebook');
      expect(PLATFORM_CONFIG).toHaveProperty('default');
    });

    it('should have maxHashtags for each platform', () => {
      Object.values(PLATFORM_CONFIG).forEach(config => {
        expect(config).toHaveProperty('maxHashtags');
        expect(typeof config.maxHashtags).toBe('number');
      });
    });
  });
});
