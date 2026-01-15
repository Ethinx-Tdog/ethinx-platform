/**
 * Base class for deployment targets.
 * Each deployment target represents a social media platform
 * with specific content output requirements.
 */
export class DeploymentTarget {
  constructor(name) {
    this.name = name;
  }

  /**
   * Generate platform-specific output from content.
   * @param {Object} content - The content to be deployed
   * @returns {Object} Platform-specific formatted output
   */
  generateOutput(content) {
    throw new Error('generateOutput must be implemented by subclass');
  }

  /**
   * Validate that content meets platform requirements.
   * @param {Object} content - The content to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validate(content) {
    throw new Error('validate must be implemented by subclass');
  }
}
