const redisClient = require("../config/redis");

/**
 * Rate limiter for driver location updates
 * Prevents spam: 1 update per 3-5 seconds per driver
 * @param {number} windowSeconds - Time window in seconds (default: 3)
 */
exports.locationUpdateLimiter = async (req, res, next) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return next(); // Let validation handle this
    }

    const key = `location:update:${driverId}`;
    const window = 3; // 3 seconds minimum between updates

    try {
      // Check if driver updated recently
      const lastUpdate = await redisClient.get(key);
      const now = Date.now();

      if (lastUpdate) {
        const timeSinceLastUpdate = (now - parseInt(lastUpdate)) / 1000; // seconds

        if (timeSinceLastUpdate < window) {
          const waitTime = (window - timeSinceLastUpdate).toFixed(1);
          return res.status(429).json({
            success: false,
            message: `Location update rate limited. Please wait ${waitTime} seconds.`,
            retryAfter: Math.ceil(window - timeSinceLastUpdate),
          });
        }
      }

      // Update timestamp
      await redisClient.setEx(key, window, now.toString());

      next();
    } catch (redisError) {
      // If Redis fails, allow the request (graceful degradation)
      console.warn("⚠️  Redis rate limiter unavailable, allowing request");
      next();
    }
  } catch (error) {
    console.error("❌ Rate limiter error:", error);
    next(); // Allow request on error
  }
};

/**
 * General API rate limiter
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowSeconds - Time window in seconds
 */
exports.apiRateLimiter = (maxRequests = 100, windowSeconds = 60) => {
  return async (req, res, next) => {
    try {
      // Use IP address or driverId/userId for key
      const identifier = req.user?.id || req.body?.driverId || req.ip || "anonymous";
      const key = `rate:limit:${identifier}`;

      try {
        const current = await redisClient.incr(key);

        if (current === 1) {
          // First request in window, set expiration
          await redisClient.expire(key, windowSeconds);
        }

        if (current > maxRequests) {
          return res.status(429).json({
            success: false,
            message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowSeconds} seconds.`,
            retryAfter: windowSeconds,
          });
        }

        // Add rate limit headers
        res.set({
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": Math.max(0, maxRequests - current).toString(),
          "X-RateLimit-Reset": new Date(Date.now() + windowSeconds * 1000).toISOString(),
        });

        next();
      } catch (redisError) {
        // If Redis fails, allow the request
        console.warn("⚠️  Redis rate limiter unavailable, allowing request");
        next();
      }
    } catch (error) {
      console.error("❌ API rate limiter error:", error);
      next(); // Allow request on error
    }
  };
};
