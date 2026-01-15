/**
 * Generate social media posts based on platform templates
 */

const fs = require('fs');
const path = require('path');

/**
 * Load a platform template
 * @param {string} platform - The platform name (facebook, instagram, linkedin)
 * @returns {Object} The platform template configuration
 */
function loadTemplate(platform) {
  const templatePath = path.join(__dirname, '..', 'templates', `${platform}.json`);
  const templateData = fs.readFileSync(templatePath, 'utf8');
  return JSON.parse(templateData);
}

/**
 * Generate a post for a specific platform
 * @param {string} platform - The target platform
 * @param {Object} content - The content to post
 * @returns {Object} The generated post object
 */
function generatePost(platform, content) {
  const template = loadTemplate(platform);
  
  const post = {
    platform: template.platform,
    content: content.text || '',
    media: content.media || null,
    hashtags: content.hashtags || [],
    createdAt: new Date().toISOString()
  };

  // Validate character limit
  if (post.content.length > template.maxCharacters) {
    throw new Error(`Content exceeds ${template.platform} character limit of ${template.maxCharacters}`);
  }

  return post;
}

module.exports = {
  loadTemplate,
  generatePost
};
