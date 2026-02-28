import { Server } from "socket.io";

let io = null;

export function initSocketIO(httpServer, frontEndOrigin) {
  io = new Server(httpServer, {
    cors: {
      origin: frontEndOrigin,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on("join_user", ({ userId }) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
    });

    socket.on("leave_user", ({ userId }) => {
      if (!userId) return;
      socket.leave(`user:${userId}`);
    });

    socket.on("join_scan", ({ scanJobId }) => {
      if (!scanJobId) return;
      const room = `scan:${scanJobId}`;
      socket.join(room);
      console.log(`[Socket.io] Socket ${socket.id} joined room: ${room}`);
    });

    socket.on("leave_scan", ({ scanJobId }) => {
      if (!scanJobId) return;
      socket.leave(`scan:${scanJobId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[Socket.io] Server initialized");
  return io;
}

export function broadcastToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitScanEvent(scanJobId, event, payload) {
  if (!io) return;
  io.to(`scan:${scanJobId}`).emit(event, { ...payload, scanJobId });
}
