import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LinkedInTarget } from '../src/deployments/LinkedInTarget.js';

describe('LinkedInTarget', () => {
  describe('generateOutput', () => {
    it('should generate output with text, CTA, and brand tone', () => {
      const target = new LinkedInTarget();
      const content = {
        text: 'Exciting news from our company!',
        cta: {
          text: 'Learn More',
          url: 'https://example.com/landing',
        },
        brandTone: 'professional',
      };

      const output = target.generateOutput(content);

      assert.strictEqual(output.platform, 'LinkedIn');
      assert.strictEqual(output.text, content.text);
      assert.deepStrictEqual(output.cta, content.cta);
      assert.strictEqual(output.brandTone, 'professional');
      assert.strictEqual(output.metadata.brandToneApplied, 'professional');
    });

    it('should default to professional brand tone when not specified', () => {
      const target = new LinkedInTarget();
      const content = {
        text: 'Business update',
        cta: {
          text: 'View Details',
          url: 'https://example.com/details',
        },
      };

      const output = target.generateOutput(content);

      assert.strictEqual(output.brandTone, 'professional');
    });

    it('should accept all valid brand tones', () => {
      const target = new LinkedInTarget();
      const validTones = ['professional', 'thought_leadership', 'corporate', 'inspirational'];

      for (const tone of validTones) {
        const content = {
          text: 'Test post',
          cta: { text: 'Click', url: 'https://example.com' },
          brandTone: tone,
        };

        const output = target.generateOutput(content);
        assert.strictEqual(output.brandTone, tone);
      }
    });

    it('should throw error when text is missing', () => {
      const target = new LinkedInTarget();
      const content = {
        cta: {
          text: 'Click',
          url: 'https://example.com',
        },
      };

      assert.throws(() => target.generateOutput(content), /Text content is required/);
    });

    it('should throw error when CTA is missing', () => {
      const target = new LinkedInTarget();
      const content = {
        text: 'Post without CTA',
      };

      assert.throws(() => target.generateOutput(content), /CTA configuration is required/);
    });

    it('should throw error when CTA text is missing', () => {
      const target = new LinkedInTarget();
      const content = {
        text: 'Post',
        cta: {
          url: 'https://example.com',
        },
      };

      assert.throws(() => target.generateOutput(content), /CTA text is required/);
    });

    it('should throw error when CTA URL is missing', () => {
      const target = new LinkedInTarget();
      const content = {
        text: 'Post',
        cta: {
          text: 'Click',
        },
      };

      assert.throws(() => target.generateOutput(content), /CTA URL is required/);
    });

    it('should throw error for invalid brand tone', () => {
      const target = new LinkedInTarget();
      const content = {
        text: 'Post',
        cta: { text: 'Click', url: 'https://example.com' },
        brandTone: 'invalid_tone',
      };

      assert.throws(() => target.generateOutput(content), /Invalid brand tone/);
    });
  });

  describe('validate', () => {
    it('should return valid for complete content', () => {
      const target = new LinkedInTarget();
      const content = {
        text: 'Test post',
        cta: {
          text: 'Click',
          url: 'https://example.com',
        },
      };

      const result = target.validate(content);

      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it('should return multiple errors for invalid content', () => {
      const target = new LinkedInTarget();
      const content = {};

      const result = target.validate(content);

      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.length >= 2);
    });
  });

  describe('BRAND_TONES', () => {
    it('should expose all brand tones as static property', () => {
      assert.strictEqual(LinkedInTarget.BRAND_TONES.PROFESSIONAL, 'professional');
      assert.strictEqual(LinkedInTarget.BRAND_TONES.THOUGHT_LEADERSHIP, 'thought_leadership');
      assert.strictEqual(LinkedInTarget.BRAND_TONES.CORPORATE, 'corporate');
      assert.strictEqual(LinkedInTarget.BRAND_TONES.INSPIRATIONAL, 'inspirational');
    });
  });
});
