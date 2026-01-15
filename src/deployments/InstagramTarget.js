import { DeploymentTarget } from './DeploymentTarget.js';

/**
 * Instagram deployment target.
 * Generates output with: Image + caption + avatar overlay
 */
export class InstagramTarget extends DeploymentTarget {
  constructor() {
    super('Instagram');
  }

  /**
   * Generate Instagram-specific output.
   * @param {Object} content - The content to be deployed
   * @param {string} content.imageUrl - URL or path to the main image
   * @param {string} content.caption - Caption text for the post
   * @param {string} [content.avatarOverlayUrl] - URL or path to avatar overlay image
   * @returns {Object} Instagram formatted output
   */
  generateOutput(content) {
    const validation = this.validate(content);
    if (!validation.isValid) {
      throw new Error(`Invalid content: ${validation.errors.join(', ')}`);
    }

    return {
      platform: this.name,
      image: content.imageUrl,
      caption: content.caption,
      avatarOverlay: content.avatarOverlayUrl || null,
      metadata: {
        generatedAt: new Date().toISOString(),
        hasAvatarOverlay: Boolean(content.avatarOverlayUrl),
      },
    };
  }

  /**
   * Validate content for Instagram requirements.
   * @param {Object} content - The content to validate
   * @returns {Object} Validation result
   */
  validate(content) {
    const errors = [];

    if (!content.imageUrl || typeof content.imageUrl !== 'string') {
      errors.push('Image URL is required');
    }

    if (!content.caption || typeof content.caption !== 'string') {
      errors.push('Caption is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
