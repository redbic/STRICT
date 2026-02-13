// WebSocket broadcast utilities
// Centralizes zone-based and room-based message broadcasting

const WebSocket = require('ws');

/**
 * Broadcast a message to all players in a specific zone
 * @param {object} room - Room object containing players array
 * @param {string} zone - Zone ID to filter by
 * @param {object} message - Message to broadcast (will be JSON stringified)
 * @param {WebSocket} excludeWs - Optional WebSocket to exclude from broadcast
 */
function broadcastToZone(room, zone, message, excludeWs = null) {
  const payload = JSON.stringify(message);
  room.players.forEach(player => {
    if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN && player.zone === zone) {
      player.ws.send(payload);
    }
  });
}

/**
 * Broadcast a message to all players in a room
 * @param {object} room - Room object containing players array
 * @param {object} message - Message to broadcast (will be JSON stringified)
 * @param {WebSocket} excludeWs - Optional WebSocket to exclude from broadcast
 */
function broadcastToRoom(room, message, excludeWs = null) {
  const payload = JSON.stringify(message);
  room.players.forEach(player => {
    if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(payload);
    }
  });
}

/**
 * Safely send data to a WebSocket client with error handling
 * @param {WebSocket} ws - WebSocket connection
 * @param {object} data - Data to send (will be JSON stringified)
 */
function safeSend(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (_) {
      /* ignore send errors - connection may be closing */
    }
  }
}

module.exports = { broadcastToZone, broadcastToRoom, safeSend };
