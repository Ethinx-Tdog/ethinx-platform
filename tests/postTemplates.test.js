/**
 * Tests for Post Templates Module
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  getTemplate,
  getAvailablePlatforms,
  generatePost,
  getCTASuggestions,
  getToneGuidelines
} = require('../src/templates/postTemplates');

describe('Post Templates', () => {
  test('getAvailablePlatforms returns all platforms', () => {
    const platforms = getAvailablePlatforms();
    assert.ok(Array.isArray(platforms));
    assert.ok(platforms.includes('twitter'));
    assert.ok(platforms.includes('linkedin'));
    assert.ok(platforms.includes('instagram'));
    assert.ok(platforms.includes('facebook'));
    assert.ok(platforms.includes('tiktok'));
  });

  test('getTemplate returns correct template for twitter', () => {
    const template = getTemplate('twitter');
    assert.ok(template);
    assert.strictEqual(template.name, 'Twitter/X');
    assert.strictEqual(template.maxLength, 280);
    assert.ok(template.format);
    assert.ok(template.tone);
    assert.ok(template.cta);
  });

  test('getTemplate returns null for unknown platform', () => {
    const template = getTemplate('unknown_platform');
    assert.strictEqual(template, null);
  });

  test('getTemplate is case insensitive', () => {
    const template1 = getTemplate('TWITTER');
    const template2 = getTemplate('Twitter');
    const template3 = getTemplate('twitter');
    
    assert.deepStrictEqual(template1, template3);
    assert.deepStrictEqual(template2, template3);
  });

  test('generatePost creates formatted content', () => {
    const post = generatePost('twitter', {
      content: 'Hello world!',
      cta: 'Learn more',
      hashtags: ['tech', 'coding']
    });
    
    assert.ok(post);
    assert.ok(post.includes('Hello world!'));
    assert.ok(post.includes('Learn more'));
    assert.ok(post.includes('#tech'));
    assert.ok(post.includes('#coding'));
  });

  test('generatePost respects hashtag limit', () => {
    const post = generatePost('twitter', {
      content: 'Test',
      hashtags: ['a', 'b', 'c', 'd', 'e', 'f'] // More than Twitter's limit of 3
    });
    
    const hashtagCount = (post.match(/#/g) || []).length;
    assert.ok(hashtagCount <= 3);
  });

  test('generatePost returns null for unknown platform', () => {
    const post = generatePost('unknown', { content: 'Test' });
    assert.strictEqual(post, null);
  });

  test('getCTASuggestions returns primary CTAs by default', () => {
    const ctas = getCTASuggestions('linkedin');
    assert.ok(Array.isArray(ctas));
    assert.ok(ctas.length > 0);
    assert.ok(ctas.includes('Connect with me'));
  });

  test('getCTASuggestions returns secondary CTAs when specified', () => {
    const ctas = getCTASuggestions('linkedin', 'secondary');
    assert.ok(Array.isArray(ctas));
    assert.ok(ctas.includes('What are your thoughts?'));
  });

  test('getCTASuggestions returns null for unknown platform', () => {
    const ctas = getCTASuggestions('unknown');
    assert.strictEqual(ctas, null);
  });

  test('getToneGuidelines returns tone info', () => {
    const tone = getToneGuidelines('instagram');
    assert.ok(tone);
    assert.strictEqual(tone.style, 'inspirational');
    assert.strictEqual(tone.voice, 'friendly');
    assert.ok(Array.isArray(tone.guidelines));
  });

  test('getToneGuidelines returns null for unknown platform', () => {
    const tone = getToneGuidelines('unknown');
    assert.strictEqual(tone, null);
  });

  test('each platform has required fields', () => {
    const platforms = getAvailablePlatforms();
    
    for (const platform of platforms) {
      const template = getTemplate(platform);
      
      assert.ok(template.name, `${platform} should have name`);
      assert.ok(typeof template.maxLength === 'number', `${platform} should have maxLength`);
      assert.ok(template.format, `${platform} should have format`);
      assert.ok(template.tone, `${platform} should have tone`);
      assert.ok(template.cta, `${platform} should have cta`);
      assert.ok(template.template, `${platform} should have template string`);
    }
  });
});
