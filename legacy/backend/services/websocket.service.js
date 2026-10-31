/**
 * WebSocket service for real-time communication
 * Handles connection management and message broadcasting
 */

let ioInstance = null;

/**
 * Initialize WebSocket service with Socket.IO instance
 * @param {Object} io - Socket.IO server instance
 */
exports.initialize = (io) => {
  ioInstance = io;
  console.log("✅ WebSocket service initialized");
};

/**
 * Emit event to specific room
 * @param {string} room - Room/channel name
 * @param {string} event - Event name
 * @param {Object} data - Data to emit
 */
exports.emitToRoom = (room, event, data) => {
  if (ioInstance) {
    ioInstance.to(room).emit(event, data);
  }
};

/**
 * Emit event to specific socket
 * @param {string} socketId - Socket ID
 * @param {string} event - Event name
 * @param {Object} data - Data to emit
 */
exports.emitToSocket = (socketId, event, data) => {
  if (ioInstance) {
    ioInstance.to(socketId).emit(event, data);
  }
};

/**
 * Broadcast event to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Data to emit
 */
exports.broadcast = (event, data) => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
};

/**
 * Join socket to a room
 * @param {string} socketId - Socket ID
 * @param {string} room - Room name
 */
exports.joinRoom = (socketId, room) => {
  if (ioInstance) {
    const socket = ioInstance.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(room);
    }
  }
};

/**
 * Leave socket from a room
 * @param {string} socketId - Socket ID
 * @param {string} room - Room name
 */
exports.leaveRoom = (socketId, room) => {
  if (ioInstance) {
    const socket = ioInstance.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(room);
    }
  }
};

module.exports = exports;
