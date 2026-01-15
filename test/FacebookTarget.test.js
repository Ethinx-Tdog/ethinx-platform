import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FacebookTarget } from '../src/deployments/FacebookTarget.js';

describe('FacebookTarget', () => {
  describe('generateOutput', () => {
    it('should generate output with text, image, and voice intro', () => {
      const target = new FacebookTarget();
      const content = {
        text: 'Check out our new product!',
        imageUrl: 'https://example.com/image.jpg',
        voiceIntroUrl: 'https://example.com/intro.mp3',
      };

      const output = target.generateOutput(content);

      assert.strictEqual(output.platform, 'Facebook');
      assert.strictEqual(output.text, content.text);
      assert.strictEqual(output.image, content.imageUrl);
      assert.strictEqual(output.voiceIntro, content.voiceIntroUrl);
      assert.strictEqual(output.metadata.hasVoiceIntro, true);
    });

    it('should generate output without voice intro when not provided', () => {
      const target = new FacebookTarget();
      const content = {
        text: 'Simple post',
        imageUrl: 'https://example.com/image.jpg',
      };

      const output = target.generateOutput(content);

      assert.strictEqual(output.voiceIntro, null);
      assert.strictEqual(output.metadata.hasVoiceIntro, false);
    });

    it('should throw error when text is missing', () => {
      const target = new FacebookTarget();
      const content = {
        imageUrl: 'https://example.com/image.jpg',
      };

      assert.throws(() => target.generateOutput(content), /Text content is required/);
    });

    it('should throw error when image is missing', () => {
      const target = new FacebookTarget();
      const content = {
        text: 'Post without image',
      };

      assert.throws(() => target.generateOutput(content), /Image URL is required/);
    });
  });

  describe('validate', () => {
    it('should return valid for complete content', () => {
      const target = new FacebookTarget();
      const content = {
        text: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
      };

      const result = target.validate(content);

      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it('should return errors for invalid content', () => {
      const target = new FacebookTarget();
      const content = {};

      const result = target.validate(content);

      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.length, 2);
    });

    it('should return error for null content', () => {
      const target = new FacebookTarget();

      const result = target.validate(null);

      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.includes('Content must be a non-null object'));
    });

    it('should return error for undefined content', () => {
      const target = new FacebookTarget();

      const result = target.validate(undefined);

      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.includes('Content must be a non-null object'));
    });
  });
});
