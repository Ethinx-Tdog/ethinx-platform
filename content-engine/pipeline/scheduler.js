/**
 * Schedule posts for future publishing
 */

const { publish } = require('./publish');

/**
 * Schedule a post for future publishing
 * @param {string} platform - The target platform
 * @param {Object} post - The post object
 * @param {Date} scheduledTime - When to publish
 * @returns {Object} Scheduled job information
 */
function schedulePost(platform, post, scheduledTime) {
  const now = new Date();
  
  if (scheduledTime <= now) {
    throw new Error('Scheduled time must be in the future');
  }

  const job = {
    id: `job_${Date.now()}`,
    platform: platform,
    post: post,
    scheduledTime: scheduledTime.toISOString(),
    status: 'scheduled',
    createdAt: now.toISOString()
  };

  return job;
}

/**
 * Execute a scheduled job
 * @param {Object} job - The job to execute
 * @returns {Promise<Object>} The execution result
 */
async function executeJob(job) {
  try {
    const result = await publish(job.platform, job.post);
    return {
      ...job,
      status: 'completed',
      result: result,
      executedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      ...job,
      status: 'failed',
      error: error.message,
      executedAt: new Date().toISOString()
    };
  }
}

module.exports = {
  schedulePost,
  executeJob
};
