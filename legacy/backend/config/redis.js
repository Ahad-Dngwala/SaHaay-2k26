const redis = require("redis");
const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = require("./env");

// Create Redis client configuration
const redisConfig = {
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("❌ Redis: Max retry attempts reached");
        return new Error("Redis connection failed: Max retries exceeded");
      }
      return Math.min(retries * 100, 3000);
    },
  },
};

// Add password if provided
if (REDIS_PASSWORD) {
  redisConfig.password = REDIS_PASSWORD;
}

// Create Redis client
const redisClient = redis.createClient(redisConfig);

// Event handlers
redisClient.on("connect", () => {
  console.log("🔄 Redis: Connecting...");
});

redisClient.on("ready", () => {
  console.log("✅ Redis connected and ready");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
  console.warn("💡 Tip: Redis is optional. If you want caching, ensure Redis is installed and running.");
  // Don't exit process - Redis is optional for this system
});

redisClient.on("reconnecting", () => {
  console.log("🔄 Redis: Reconnecting...");
});

redisClient.on("end", () => {
  console.log("⚠️  Redis: Connection closed");
});

// Connect to Redis (non-blocking - errors handled by event listeners)
// If Redis is not available, the app will still work (graceful degradation)
// Make Redis truly optional - don't block app startup
setTimeout(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    // Redis is optional - app continues without it
    console.warn("⚠️  Redis: Optional service unavailable. App continues without Redis caching.");
  }
}, 1000); // Delay connection to not block app startup

module.exports = redisClient;
