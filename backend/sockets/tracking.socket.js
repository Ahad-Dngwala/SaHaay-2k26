const GpsLog = require("../models/GpsLog");
const Driver = require("../models/Driver");
const geo = require("../services/geo.service");
const wsService = require("../services/websocket.service");
const messageLogger = require("../utils/messageLogger");

/**
 * Initialize WebSocket tracking handlers
 * @param {Object} io - Socket.IO server instance
 */
module.exports = (io) => {
  // Initialize WebSocket service
  wsService.initialize(io);

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Driver joins their driver room (improved room management)
    socket.on("driver:join", async (data) => {
      const { driverId } = data;
      if (driverId) {
        // Join driver-specific room
        socket.join(`driver:${driverId}`);
        // Join general drivers room for broadcasts
        socket.join("drivers");
        
        // Store driverId in socket data for later use
        socket.data.driverId = driverId;
        
        console.log(`👤 Driver ${driverId} joined room (socket: ${socket.id})`);
      }
    });

    // User joins emergency tracking room (emergency-specific room)
    socket.on("emergency:join", async (data) => {
      const { emergencyId } = data;
      if (emergencyId) {
        // Join emergency-specific room (prevents data leakage to other emergencies)
        socket.join(`emergency:${emergencyId}`);
        
        // Store emergencyId in socket data
        socket.data.emergencyId = emergencyId;
        
        console.log(`🚑 User joined emergency room: ${emergencyId} (socket: ${socket.id})`);
      }
    });

    // Handle driver location updates
    socket.on("location", async (data) => {
      try {
        const { driverId, lat, lng, emergencyId, speed, heading, accuracy } = data;

        if (!driverId || !lat || !lng) {
          return socket.emit("error", { message: "Missing required fields: driverId, lat, lng" });
        }

        // Update driver location in database
        await geo.updateDriverLocation(driverId, lat, lng);

        // Log GPS location
        const gpsLog = await GpsLog.create({
          driverId,
          emergencyId,
          lat,
          lng,
          speed: speed || 0,
          heading: heading || 0,
          accuracy: accuracy || 0,
        });

        // Emit location to emergency-specific room (improved room management)
        if (emergencyId) {
          io.to(`emergency:${emergencyId}`).emit(`track:${emergencyId}`, {
            driverId,
            lat,
            lng,
            speed,
            heading,
            timestamp: gpsLog.createdAt,
          });

          // Log WebSocket message for communication history
          await messageLogger.logMessage({
            emergencyId,
            driverId,
            from: "driver",
            to: "user",
            channel: "socket",
            message: `GPS location update: ${lat}, ${lng}`,
            status: "sent",
            metadata: { speed, heading, accuracy },
          });
        }

        // Emit to driver's own room for real-time tracking (driver-specific room)
        io.to(`driver:${driverId}`).emit("location:updated", {
          lat,
          lng,
          timestamp: gpsLog.createdAt,
        });

        socket.emit("location:ack", { success: true, logId: gpsLog._id });
      } catch (error) {
        console.error("❌ Location update error:", error);
        socket.emit("error", { message: "Failed to update location", error: error.message });
      }
    });

    // Handle driver status updates
    socket.on("driver:status", async (data) => {
      try {
        const { driverId, status } = data;

        if (!driverId || !status) {
          return socket.emit("error", { message: "Missing required fields: driverId, status" });
        }

        await Driver.findByIdAndUpdate(driverId, { status });

        io.to(`driver:${driverId}`).emit("status:updated", { status });
        console.log(`📊 Driver ${driverId} status updated to: ${status}`);
      } catch (error) {
        console.error("❌ Status update error:", error);
        socket.emit("error", { message: "Failed to update status" });
      }
    });

    // Handle emergency status updates
    socket.on("emergency:status", async (data) => {
      const { emergencyId, status } = data;
      if (emergencyId && status) {
        // Emit to emergency-specific room only
        io.to(`emergency:${emergencyId}`).emit(`emergency:${emergencyId}:status`, {
          status,
          timestamp: new Date().toISOString(),
        });

        // Log WebSocket message
        await messageLogger.logMessage({
          emergencyId,
          from: "system",
          to: "user",
          channel: "socket",
          message: `Emergency status updated to ${status}`,
          status: "sent",
        });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });

    // Error handling
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  console.log("✅ WebSocket tracking initialized");
};
