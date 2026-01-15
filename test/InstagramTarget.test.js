import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InstagramTarget } from '../src/deployments/InstagramTarget.js';

describe('InstagramTarget', () => {
  describe('generateOutput', () => {
    it('should generate output with image, caption, and avatar overlay', () => {
      const target = new InstagramTarget();
      const content = {
        imageUrl: 'https://example.com/photo.jpg',
        caption: 'Amazing sunset view! #photography',
        avatarOverlayUrl: 'https://example.com/avatar.png',
      };

      const output = target.generateOutput(content);

      assert.strictEqual(output.platform, 'Instagram');
      assert.strictEqual(output.image, content.imageUrl);
      assert.strictEqual(output.caption, content.caption);
      assert.strictEqual(output.avatarOverlay, content.avatarOverlayUrl);
      assert.strictEqual(output.metadata.hasAvatarOverlay, true);
    });

    it('should generate output without avatar overlay when not provided', () => {
      const target = new InstagramTarget();
      const content = {
        imageUrl: 'https://example.com/photo.jpg',
        caption: 'Simple caption',
      };

      const output = target.generateOutput(content);

      assert.strictEqual(output.avatarOverlay, null);
      assert.strictEqual(output.metadata.hasAvatarOverlay, false);
    });

    it('should throw error when image is missing', () => {
      const target = new InstagramTarget();
      const content = {
        caption: 'Caption without image',
      };

      assert.throws(() => target.generateOutput(content), /Image URL is required/);
    });

    it('should throw error when caption is missing', () => {
      const target = new InstagramTarget();
      const content = {
        imageUrl: 'https://example.com/photo.jpg',
      };

      assert.throws(() => target.generateOutput(content), /Caption is required/);
    });
  });

  describe('validate', () => {
    it('should return valid for complete content', () => {
      const target = new InstagramTarget();
      const content = {
        imageUrl: 'https://example.com/photo.jpg',
        caption: 'Test caption',
      };

      const result = target.validate(content);

      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it('should return errors for invalid content', () => {
      const target = new InstagramTarget();
      const content = {};

      const result = target.validate(content);

      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.length, 2);
    });

    it('should return error for null content', () => {
      const target = new InstagramTarget();

      const result = target.validate(null);

      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.includes('Content must be a non-null object'));
    });

    it('should return error for undefined content', () => {
      const target = new InstagramTarget();

      const result = target.validate(undefined);

      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.includes('Content must be a non-null object'));
    });
  });
});
