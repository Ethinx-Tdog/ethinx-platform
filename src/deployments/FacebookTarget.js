import { DeploymentTarget } from './DeploymentTarget.js';

/**
 * Facebook deployment target.
 * Generates output with: Text + image + voice intro
 */
export class FacebookTarget extends DeploymentTarget {
  constructor() {
    super('Facebook');
  }

  /**
   * Generate Facebook-specific output.
   * @param {Object} content - The content to be deployed
   * @param {string} content.text - The text content for the post
   * @param {string} content.imageUrl - URL or path to the image
   * @param {string} [content.voiceIntroUrl] - URL or path to voice intro audio
   * @returns {Object} Facebook formatted output
   */
  generateOutput(content) {
    const validation = this.validate(content);
    if (!validation.isValid) {
      throw new Error(`Invalid content: ${validation.errors.join(', ')}`);
    }

    return {
      platform: this.name,
      text: content.text,
      image: content.imageUrl,
      voiceIntro: content.voiceIntroUrl || null,
      metadata: {
        generatedAt: new Date().toISOString(),
        hasVoiceIntro: Boolean(content.voiceIntroUrl),
      },
    };
  }

  /**
   * Validate content for Facebook requirements.
   * @param {Object} content - The content to validate
   * @returns {Object} Validation result
   */
  validate(content) {
    const errors = [];

    if (!content.text || typeof content.text !== 'string') {
      errors.push('Text content is required');
    }

    if (!content.imageUrl || typeof content.imageUrl !== 'string') {
      errors.push('Image URL is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
