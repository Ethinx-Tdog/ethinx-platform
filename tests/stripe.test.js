const {
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
} = require('../src/stripe');

describe('Stripe Content Unlocks', () => {
  beforeEach(() => {
    resetAll();
  });

  describe('registerContent', () => {
    it('should register content with access level', () => {
      const result = registerContent('premium-content', {
        accessLevel: ACCESS_LEVELS.PREMIUM,
        price: 999
      });
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('contentId', 'premium-content');
      expect(result).toHaveProperty('accessLevel', ACCESS_LEVELS.PREMIUM);
      expect(result).toHaveProperty('price', 999);
    });

    it('should throw error for invalid content ID', () => {
      expect(() => registerContent('')).toThrow('Content ID is required');
      expect(() => registerContent(null)).toThrow('Content ID is required');
    });

    it('should throw error for invalid access level', () => {
      expect(() => registerContent('test', { accessLevel: 'invalid' })).toThrow('Invalid access level');
    });

    it('should default to premium access level', () => {
      const result = registerContent('default-content');
      expect(result.accessLevel).toBe(ACCESS_LEVELS.PREMIUM);
    });
  });

  describe('getContentAccess', () => {
    it('should return content access requirements', () => {
      registerContent('content-1', { accessLevel: ACCESS_LEVELS.BASIC });
      
      const access = getContentAccess('content-1');
      
      expect(access).toHaveProperty('accessLevel', ACCESS_LEVELS.BASIC);
    });

    it('should return null for non-registered content', () => {
      const access = getContentAccess('non-existent');
      expect(access).toBeNull();
    });
  });

  describe('grantAccess', () => {
    it('should grant content-specific access', () => {
      const grant = grantAccess('user-123', { contentId: 'exclusive-content' });
      
      expect(grant).toHaveProperty('id');
      expect(grant).toHaveProperty('contentId', 'exclusive-content');
      expect(grant).toHaveProperty('active', true);
    });

    it('should grant access level', () => {
      const grant = grantAccess('user-123', { accessLevel: ACCESS_LEVELS.VIP });
      
      expect(grant).toHaveProperty('accessLevel', ACCESS_LEVELS.VIP);
    });

    it('should throw error for missing user ID', () => {
      expect(() => grantAccess('', { contentId: 'test' })).toThrow('User ID is required');
    });

    it('should throw error if neither contentId nor accessLevel provided', () => {
      expect(() => grantAccess('user-123', {})).toThrow('Either contentId or accessLevel must be provided');
    });

    it('should set expiration date when provided', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const grant = grantAccess('user-123', {
        accessLevel: ACCESS_LEVELS.PREMIUM,
        expiresAt: futureDate
      });
      
      expect(grant.expiresAt).not.toBeNull();
    });
  });

  describe('checkAccess', () => {
    it('should allow access to unregistered content', () => {
      const result = checkAccess('user-123', 'unregistered-content');
      
      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe('Content has no access restrictions');
    });

    it('should allow access to free content', () => {
      registerContent('free-content', { accessLevel: ACCESS_LEVELS.FREE });
      
      const result = checkAccess('user-123', 'free-content');
      
      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe('Content is free');
    });

    it('should deny access when user has no grants', () => {
      registerContent('paid-content', { accessLevel: ACCESS_LEVELS.PREMIUM });
      
      const result = checkAccess('user-456', 'paid-content');
      
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('User has no access grants');
    });

    it('should allow access when user has direct content access', () => {
      registerContent('exclusive', { accessLevel: ACCESS_LEVELS.VIP });
      grantAccess('user-789', { contentId: 'exclusive' });
      
      const result = checkAccess('user-789', 'exclusive');
      
      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe('User has direct content access');
    });

    it('should allow access when user has sufficient access level', () => {
      registerContent('premium-article', { accessLevel: ACCESS_LEVELS.BASIC });
      grantAccess('user-vip', { accessLevel: ACCESS_LEVELS.PREMIUM });
      
      const result = checkAccess('user-vip', 'premium-article');
      
      expect(result.hasAccess).toBe(true);
      expect(result.reason).toBe('User has sufficient access level');
    });

    it('should deny access when user has lower access level', () => {
      registerContent('vip-content', { accessLevel: ACCESS_LEVELS.VIP });
      grantAccess('user-basic', { accessLevel: ACCESS_LEVELS.BASIC });
      
      const result = checkAccess('user-basic', 'vip-content');
      
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toBe('Insufficient access level');
    });
  });

  describe('processStripeWebhook', () => {
    it('should throw error for invalid event', () => {
      expect(() => processStripeWebhook(null)).toThrow('Invalid Stripe webhook event');
      expect(() => processStripeWebhook({})).toThrow('Invalid Stripe webhook event');
    });

    it('should handle checkout.session.completed', () => {
      const event = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            client_reference_id: 'user-checkout',
            metadata: {
              contentId: 'purchased-content'
            }
          }
        }
      };
      
      const result = processStripeWebhook(event);
      
      expect(result.processed).toBe(true);
      expect(result.grants.length).toBeGreaterThan(0);
    });

    it('should handle payment_intent.succeeded', () => {
      const event = {
        id: 'evt_456',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            metadata: {
              userId: 'user-payment',
              accessLevel: ACCESS_LEVELS.PREMIUM
            }
          }
        }
      };
      
      const result = processStripeWebhook(event);
      
      expect(result.processed).toBe(true);
    });

    it('should handle customer.subscription.created', () => {
      const event = {
        id: 'evt_789',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            customer: 'cus_123',
            metadata: {
              userId: 'user-subscription',
              accessLevel: ACCESS_LEVELS.PREMIUM
            },
            current_period_end: Math.floor(Date.now() / 1000) + 86400
          }
        }
      };
      
      const result = processStripeWebhook(event);
      
      expect(result.processed).toBe(true);
      expect(result.grants.length).toBeGreaterThan(0);
    });

    it('should handle unrecognized event types gracefully', () => {
      const event = {
        id: 'evt_unknown',
        type: 'unknown.event.type',
        data: {}
      };
      
      const result = processStripeWebhook(event);
      
      expect(result.processed).toBe(false);
      expect(result.message).toContain('Unhandled event type');
    });
  });

  describe('handleCheckoutComplete', () => {
    it('should grant content access from checkout', () => {
      const session = {
        id: 'cs_test',
        client_reference_id: 'user-test',
        metadata: {
          contentId: 'test-content'
        }
      };
      
      const result = handleCheckoutComplete(session);
      
      expect(result.success).toBe(true);
      expect(result.grants.length).toBeGreaterThan(0);
    });

    it('should grant access level from checkout', () => {
      const session = {
        id: 'cs_level',
        customer: 'cus_level',
        metadata: {
          accessLevel: ACCESS_LEVELS.VIP
        }
      };
      
      const result = handleCheckoutComplete(session);
      
      expect(result.success).toBe(true);
      
      const userAccess = getUserAccess('cus_level');
      expect(userAccess.accessLevels).toContain(ACCESS_LEVELS.VIP);
    });

    it('should fail when no user identifier', () => {
      const session = {
        id: 'cs_no_user',
        metadata: {}
      };
      
      const result = handleCheckoutComplete(session);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No user identifier');
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should grant access from payment intent', () => {
      const paymentIntent = {
        id: 'pi_test',
        metadata: {
          userId: 'user-pi',
          contentId: 'pi-content'
        }
      };
      
      const result = handlePaymentSuccess(paymentIntent);
      
      expect(result.success).toBe(true);
    });
  });

  describe('handleSubscription', () => {
    it('should grant access for active subscription', () => {
      const subscription = {
        id: 'sub_active',
        status: 'active',
        metadata: {
          userId: 'user-sub',
          accessLevel: ACCESS_LEVELS.PREMIUM
        }
      };
      
      const result = handleSubscription(subscription);
      
      expect(result.success).toBe(true);
    });

    it('should not grant access for inactive subscription', () => {
      const subscription = {
        id: 'sub_inactive',
        status: 'canceled',
        metadata: {
          userId: 'user-canceled',
          accessLevel: ACCESS_LEVELS.PREMIUM
        }
      };
      
      const result = handleSubscription(subscription);
      
      expect(result.success).toBe(false);
    });
  });

  describe('getUserAccess', () => {
    it('should return user access summary', () => {
      grantAccess('summary-user', { accessLevel: ACCESS_LEVELS.BASIC });
      grantAccess('summary-user', { contentId: 'special-content' });
      
      const access = getUserAccess('summary-user');
      
      expect(access.userId).toBe('summary-user');
      expect(access.accessLevels).toContain(ACCESS_LEVELS.BASIC);
      expect(access.contentAccess).toContain('special-content');
    });

    it('should return null for unknown user', () => {
      const access = getUserAccess('unknown-user');
      expect(access).toBeNull();
    });
  });

  describe('revokeAllAccess', () => {
    it('should remove all access for user', () => {
      grantAccess('revoke-user', { accessLevel: ACCESS_LEVELS.VIP });
      
      const result = revokeAllAccess('revoke-user');
      
      expect(result).toBe(true);
      expect(getUserAccess('revoke-user')).toBeNull();
    });
  });

  describe('ACCESS_LEVELS', () => {
    it('should have all expected access levels', () => {
      expect(ACCESS_LEVELS).toHaveProperty('FREE', 'free');
      expect(ACCESS_LEVELS).toHaveProperty('BASIC', 'basic');
      expect(ACCESS_LEVELS).toHaveProperty('PREMIUM', 'premium');
      expect(ACCESS_LEVELS).toHaveProperty('VIP', 'vip');
    });
  });

  describe('PAYMENT_STATUS', () => {
    it('should have all expected payment statuses', () => {
      expect(PAYMENT_STATUS).toHaveProperty('PENDING', 'pending');
      expect(PAYMENT_STATUS).toHaveProperty('COMPLETED', 'completed');
      expect(PAYMENT_STATUS).toHaveProperty('FAILED', 'failed');
      expect(PAYMENT_STATUS).toHaveProperty('REFUNDED', 'refunded');
      expect(PAYMENT_STATUS).toHaveProperty('CANCELLED', 'cancelled');
    });
  });
});
