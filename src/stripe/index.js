/**
 * Stripe-Triggered Content Unlocks Module
 * Manages content access based on Stripe payment events
 */

/**
 * Access levels for content
 */
const ACCESS_LEVELS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  VIP: 'vip'
};

/**
 * Payment status types
 */
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

/**
 * In-memory storage for content access rules
 */
const contentAccessStore = new Map();

/**
 * In-memory storage for user access grants
 */
const userAccessStore = new Map();

/**
 * In-memory storage for payment records
 */
const paymentStore = new Map();

/**
 * Generates a unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
  return `unlock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Registers content with an access level requirement
 * @param {string} contentId - Content identifier
 * @param {Object} options - Content access options
 * @param {string} [options.accessLevel='premium'] - Required access level
 * @param {number} [options.price] - Price in cents (for one-time purchase)
 * @param {string} [options.priceId] - Stripe Price ID (for subscriptions)
 * @param {string} [options.productId] - Stripe Product ID
 * @param {Object} [options.metadata={}] - Additional metadata
 * @returns {Object} Registered content access rule
 */
function registerContent(contentId, options = {}) {
  if (!contentId || typeof contentId !== 'string') {
    throw new Error('Content ID is required and must be a string');
  }

  const {
    accessLevel = ACCESS_LEVELS.PREMIUM,
    price = null,
    priceId = null,
    productId = null,
    metadata = {}
  } = options;

  if (!Object.values(ACCESS_LEVELS).includes(accessLevel)) {
    throw new Error(`Invalid access level: ${accessLevel}`);
  }

  const contentAccess = {
    id: generateId(),
    contentId,
    accessLevel,
    price,
    priceId,
    productId,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  contentAccessStore.set(contentId, contentAccess);
  return contentAccess;
}

/**
 * Gets content access requirements
 * @param {string} contentId - Content identifier
 * @returns {Object|null} Content access requirements or null
 */
function getContentAccess(contentId) {
  return contentAccessStore.get(contentId) || null;
}

/**
 * Grants access to a user for specific content or access level
 * @param {string} userId - User identifier
 * @param {Object} options - Access grant options
 * @param {string} [options.contentId] - Specific content ID
 * @param {string} [options.accessLevel] - Access level to grant
 * @param {string} [options.paymentId] - Associated payment ID
 * @param {Date} [options.expiresAt] - Expiration date
 * @returns {Object} Access grant record
 */
function grantAccess(userId, options = {}) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required and must be a string');
  }

  const {
    contentId = null,
    accessLevel = null,
    paymentId = null,
    expiresAt = null
  } = options;

  if (!contentId && !accessLevel) {
    throw new Error('Either contentId or accessLevel must be provided');
  }

  const userAccess = userAccessStore.get(userId) || {
    userId,
    accessLevels: [],
    contentAccess: [],
    grants: []
  };

  const grant = {
    id: generateId(),
    contentId,
    accessLevel,
    paymentId,
    grantedAt: new Date().toISOString(),
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    active: true
  };

  userAccess.grants.push(grant);

  if (accessLevel && !userAccess.accessLevels.includes(accessLevel)) {
    userAccess.accessLevels.push(accessLevel);
  }

  if (contentId && !userAccess.contentAccess.includes(contentId)) {
    userAccess.contentAccess.push(contentId);
  }

  userAccessStore.set(userId, userAccess);

  return grant;
}

/**
 * Checks if a user has access to specific content
 * @param {string} userId - User identifier
 * @param {string} contentId - Content identifier
 * @returns {Object} Access check result
 */
function checkAccess(userId, contentId) {
  const contentAccess = contentAccessStore.get(contentId);
  
  // If content has no access rules, it's free
  if (!contentAccess) {
    return {
      hasAccess: true,
      reason: 'Content has no access restrictions',
      contentId,
      userId
    };
  }

  // If content is free, everyone has access
  if (contentAccess.accessLevel === ACCESS_LEVELS.FREE) {
    return {
      hasAccess: true,
      reason: 'Content is free',
      contentId,
      userId
    };
  }

  const userAccess = userAccessStore.get(userId);
  
  // If user has no access records
  if (!userAccess) {
    return {
      hasAccess: false,
      reason: 'User has no access grants',
      requiredLevel: contentAccess.accessLevel,
      price: contentAccess.price,
      priceId: contentAccess.priceId,
      contentId,
      userId
    };
  }

  // Check for direct content access
  if (userAccess.contentAccess.includes(contentId)) {
    // Verify the grant is still active
    const activeGrant = userAccess.grants.find(
      g => g.contentId === contentId && g.active && (!g.expiresAt || new Date(g.expiresAt) > new Date())
    );
    
    if (activeGrant) {
      return {
        hasAccess: true,
        reason: 'User has direct content access',
        grant: activeGrant,
        contentId,
        userId
      };
    }
  }

  // Check for access level
  const levelHierarchy = [ACCESS_LEVELS.FREE, ACCESS_LEVELS.BASIC, ACCESS_LEVELS.PREMIUM, ACCESS_LEVELS.VIP];
  const requiredLevelIndex = levelHierarchy.indexOf(contentAccess.accessLevel);
  
  const userHighestLevel = userAccess.accessLevels.reduce((highest, level) => {
    const levelIndex = levelHierarchy.indexOf(level);
    return levelIndex > highest ? levelIndex : highest;
  }, -1);

  if (userHighestLevel >= requiredLevelIndex) {
    return {
      hasAccess: true,
      reason: 'User has sufficient access level',
      userLevel: levelHierarchy[userHighestLevel],
      requiredLevel: contentAccess.accessLevel,
      contentId,
      userId
    };
  }

  return {
    hasAccess: false,
    reason: 'Insufficient access level',
    requiredLevel: contentAccess.accessLevel,
    userLevel: userHighestLevel >= 0 ? levelHierarchy[userHighestLevel] : 'none',
    price: contentAccess.price,
    priceId: contentAccess.priceId,
    contentId,
    userId
  };
}

/**
 * Processes a Stripe webhook event to unlock content
 * @param {Object} event - Stripe webhook event object
 * @returns {Object} Processing result
 */
function processStripeWebhook(event) {
  if (!event || !event.type) {
    throw new Error('Invalid Stripe webhook event');
  }

  const result = {
    eventId: event.id,
    eventType: event.type,
    processed: false,
    grants: []
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data?.object;
      if (session) {
        const paymentResult = handleCheckoutComplete(session);
        result.processed = true;
        result.grants = paymentResult.grants || [];
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data?.object;
      if (paymentIntent) {
        const paymentResult = handlePaymentSuccess(paymentIntent);
        result.processed = true;
        result.grants = paymentResult.grants || [];
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data?.object;
      if (subscription) {
        const subscriptionResult = handleSubscription(subscription);
        result.processed = true;
        result.grants = subscriptionResult.grants || [];
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data?.object;
      if (subscription) {
        revokeSubscriptionAccess(subscription);
        result.processed = true;
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data?.object;
      if (charge) {
        revokePaymentAccess(charge);
        result.processed = true;
      }
      break;
    }

    default:
      result.message = `Unhandled event type: ${event.type}`;
  }

  return result;
}

/**
 * Handles successful checkout session
 * @param {Object} session - Stripe checkout session
 * @returns {Object} Processing result
 */
function handleCheckoutComplete(session) {
  const {
    id: sessionId,
    customer: customerId,
    metadata = {},
    client_reference_id: userId
  } = session;

  const grants = [];
  const effectiveUserId = userId || customerId || metadata.userId;

  if (!effectiveUserId) {
    return { success: false, error: 'No user identifier found', grants };
  }

  // Record payment
  const payment = {
    id: generateId(),
    stripeSessionId: sessionId,
    userId: effectiveUserId,
    status: PAYMENT_STATUS.COMPLETED,
    metadata,
    createdAt: new Date().toISOString()
  };
  paymentStore.set(sessionId, payment);

  // Grant access based on metadata
  if (metadata.contentId) {
    const grant = grantAccess(effectiveUserId, {
      contentId: metadata.contentId,
      paymentId: payment.id
    });
    grants.push(grant);
  }

  if (metadata.accessLevel) {
    const grant = grantAccess(effectiveUserId, {
      accessLevel: metadata.accessLevel,
      paymentId: payment.id
    });
    grants.push(grant);
  }

  return { success: true, payment, grants };
}

/**
 * Handles successful payment intent
 * @param {Object} paymentIntent - Stripe payment intent
 * @returns {Object} Processing result
 */
function handlePaymentSuccess(paymentIntent) {
  const {
    id: paymentIntentId,
    customer: customerId,
    metadata = {}
  } = paymentIntent;

  const grants = [];
  const userId = metadata.userId || customerId;

  if (!userId) {
    return { success: false, error: 'No user identifier found', grants };
  }

  // Record payment
  const payment = {
    id: generateId(),
    stripePaymentIntentId: paymentIntentId,
    userId,
    status: PAYMENT_STATUS.COMPLETED,
    metadata,
    createdAt: new Date().toISOString()
  };
  paymentStore.set(paymentIntentId, payment);

  // Grant access based on metadata
  if (metadata.contentId) {
    const grant = grantAccess(userId, {
      contentId: metadata.contentId,
      paymentId: payment.id
    });
    grants.push(grant);
  }

  if (metadata.accessLevel) {
    const grant = grantAccess(userId, {
      accessLevel: metadata.accessLevel,
      paymentId: payment.id
    });
    grants.push(grant);
  }

  return { success: true, payment, grants };
}

/**
 * Handles subscription creation or update
 * @param {Object} subscription - Stripe subscription
 * @returns {Object} Processing result
 */
function handleSubscription(subscription) {
  const {
    id: subscriptionId,
    customer: customerId,
    status,
    metadata = {},
    items
  } = subscription;

  const grants = [];
  const userId = metadata.userId || customerId;

  if (!userId) {
    return { success: false, error: 'No user identifier found', grants };
  }

  // Only grant access for active subscriptions
  if (status !== 'active' && status !== 'trialing') {
    return { success: false, error: `Subscription status is ${status}`, grants };
  }

  // Determine access level based on subscription
  let accessLevel = metadata.accessLevel;
  if (!accessLevel && items?.data?.length > 0) {
    const priceId = items.data[0].price?.id;
    // Map price IDs to access levels (would be configured in production)
    accessLevel = ACCESS_LEVELS.PREMIUM; // Default for subscriptions
  }

  if (accessLevel) {
    // Calculate expiration based on subscription end
    const expiresAt = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    const grant = grantAccess(userId, {
      accessLevel,
      paymentId: subscriptionId,
      expiresAt
    });
    grants.push(grant);
  }

  return { success: true, subscriptionId, grants };
}

/**
 * Revokes access from a cancelled subscription
 * @param {Object} subscription - Stripe subscription
 */
function revokeSubscriptionAccess(subscription) {
  const userId = subscription.metadata?.userId || subscription.customer;
  if (!userId) return;

  const userAccess = userAccessStore.get(userId);
  if (!userAccess) return;

  // Mark grants from this subscription as inactive
  userAccess.grants = userAccess.grants.map(grant => {
    if (grant.paymentId === subscription.id) {
      return { ...grant, active: false, revokedAt: new Date().toISOString() };
    }
    return grant;
  });

  userAccessStore.set(userId, userAccess);
}

/**
 * Revokes access from a refunded payment
 * @param {Object} charge - Stripe charge
 */
function revokePaymentAccess(charge) {
  const userId = charge.metadata?.userId || charge.customer;
  if (!userId) return;

  const userAccess = userAccessStore.get(userId);
  if (!userAccess) return;

  // Find and revoke associated grants
  const paymentRecord = Array.from(paymentStore.values()).find(
    p => p.stripePaymentIntentId === charge.payment_intent
  );

  if (paymentRecord) {
    paymentRecord.status = PAYMENT_STATUS.REFUNDED;
    
    userAccess.grants = userAccess.grants.map(grant => {
      if (grant.paymentId === paymentRecord.id) {
        return { ...grant, active: false, revokedAt: new Date().toISOString() };
      }
      return grant;
    });

    userAccessStore.set(userId, userAccess);
  }
}

/**
 * Gets user's access summary
 * @param {string} userId - User identifier
 * @returns {Object|null} User access summary
 */
function getUserAccess(userId) {
  const userAccess = userAccessStore.get(userId);
  if (!userAccess) {
    return null;
  }

  // Filter for active grants
  const activeGrants = userAccess.grants.filter(
    g => g.active && (!g.expiresAt || new Date(g.expiresAt) > new Date())
  );

  return {
    userId,
    accessLevels: userAccess.accessLevels,
    contentAccess: userAccess.contentAccess,
    activeGrants,
    totalGrants: userAccess.grants.length
  };
}

/**
 * Removes all access for a user
 * @param {string} userId - User identifier
 * @returns {boolean} True if removed
 */
function revokeAllAccess(userId) {
  return userAccessStore.delete(userId);
}

/**
 * Resets all stores (useful for testing)
 */
function resetAll() {
  contentAccessStore.clear();
  userAccessStore.clear();
  paymentStore.clear();
}

module.exports = {
  ACCESS_LEVELS,
  PAYMENT_STATUS,
  registerContent,
  getContentAccess,
  grantAccess,
  checkAccess,
  processStripeWebhook,
  handleCheckoutComplete,
  handlePaymentSuccess,
  handleSubscription,
  getUserAccess,
  revokeAllAccess,
  resetAll
};
