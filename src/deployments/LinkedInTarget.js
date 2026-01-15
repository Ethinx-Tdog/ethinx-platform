import { DeploymentTarget } from './DeploymentTarget.js';

/**
 * LinkedIn deployment target.
 * Generates output with: Text + CTA + brand tone enforcement
 */
export class LinkedInTarget extends DeploymentTarget {
  /**
   * Brand tone settings for LinkedIn content.
   */
  static BRAND_TONES = {
    PROFESSIONAL: 'professional',
    THOUGHT_LEADERSHIP: 'thought_leadership',
    CORPORATE: 'corporate',
    INSPIRATIONAL: 'inspirational',
  };

  constructor() {
    super('LinkedIn');
  }

  /**
   * Generate LinkedIn-specific output.
   * @param {Object} content - The content to be deployed
   * @param {string} content.text - The text content for the post
   * @param {Object} content.cta - Call-to-action configuration
   * @param {string} content.cta.text - CTA button/link text
   * @param {string} content.cta.url - CTA destination URL
   * @param {string} [content.brandTone] - Brand tone to enforce (defaults to 'professional')
   * @returns {Object} LinkedIn formatted output
   */
  generateOutput(content) {
    const validation = this.validate(content);
    if (!validation.isValid) {
      throw new Error(`Invalid content: ${validation.errors.join(', ')}`);
    }

    const brandTone = content.brandTone || LinkedInTarget.BRAND_TONES.PROFESSIONAL;

    return {
      platform: this.name,
      text: this.applyBrandTone(content.text, brandTone),
      cta: {
        text: content.cta.text,
        url: content.cta.url,
      },
      brandTone: brandTone,
      metadata: {
        generatedAt: new Date().toISOString(),
        brandToneApplied: brandTone,
      },
    };
  }

  /**
   * Apply brand tone adjustments to text content.
   * @param {string} text - Original text content
   * @param {string} tone - Brand tone to apply
   * @returns {string} Text with brand tone applied
   */
  applyBrandTone(text, tone) {
    // In a real implementation, this could use NLP or templates
    // to adjust the text based on brand tone guidelines
    return text;
  }

  /**
   * Validate content for LinkedIn requirements.
   * @param {Object} content - The content to validate
   * @returns {Object} Validation result
   */
  validate(content) {
    const errors = [];

    if (!content.text || typeof content.text !== 'string') {
      errors.push('Text content is required');
    }

    if (!content.cta || typeof content.cta !== 'object') {
      errors.push('CTA configuration is required');
    } else {
      if (!content.cta.text || typeof content.cta.text !== 'string') {
        errors.push('CTA text is required');
      }
      if (!content.cta.url || typeof content.cta.url !== 'string') {
        errors.push('CTA URL is required');
      }
    }

    if (content.brandTone && !Object.values(LinkedInTarget.BRAND_TONES).includes(content.brandTone)) {
      errors.push(`Invalid brand tone. Must be one of: ${Object.values(LinkedInTarget.BRAND_TONES).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
