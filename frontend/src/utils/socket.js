import { io } from "socket.io-client";

let socket = null;

// Must match the Express backend origin — same as the axios baseURL
const BACKEND_URL = "http://localhost:5050";

/**
 * Returns the shared Socket.io client, creating it on first call.
 */
export function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function joinUserRoom(userId) {
  if (!userId) return;
  const s = getSocket();
  s.emit("join_user", { userId });
}

export function leaveUserRoom(userId) {
  if (!userId) return;
  const s = getSocket();
  s.emit("leave_user", { userId });
}

export function joinScanRoom(scanJobId) {
  if (!scanJobId || scanJobId === "pending") return;
  const s = getSocket();
  s.emit("join_scan", { scanJobId });
}

export function leaveScanRoom(scanJobId) {
  if (!scanJobId || scanJobId === "pending") return;
  const s = getSocket();
  s.emit("leave_scan", { scanJobId });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
