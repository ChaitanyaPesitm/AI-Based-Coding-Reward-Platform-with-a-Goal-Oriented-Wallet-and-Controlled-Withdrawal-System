const { Server } = require('socket.io');

let io = null;
const userSockets = new Map(); // userId -> Set(socketIds)

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Socket.io: ${socket.id}`);

    // Register user to their room
    socket.on('register_user', (userId) => {
      if (!userId) return;
      socket.join(`user_${userId}`);
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      console.log(`👤 User ${userId} joined room user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      for (const [userId, sockets] of userSockets.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) userSockets.delete(userId);
        }
      }
    });
  });

  return io;
}

/**
 * Emit a real-time notification to a specific user
 */
function sendUserNotification(userId, event, data) {
  if (io) {
    io.to(`user_${userId.toString()}`).emit(event, data);
  }
}

/**
 * Broadcast a real-time notification to all connected clients
 */
function broadcastNotification(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

module.exports = {
  initSocket,
  sendUserNotification,
  broadcastNotification
};
