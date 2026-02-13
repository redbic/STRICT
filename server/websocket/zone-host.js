// Zone host selection utilities
// Determines authoritative player for each zone in multiplayer

/**
 * Get the authoritative player (host) for a specific zone
 * Main host is authoritative for their current zone.
 * For other zones, the player with smallest ID (lexicographically) is the zone host.
 *
 * @param {object} room - Room object with players array and hostId
 * @param {string} zone - Zone ID to find host for
 * @returns {object|null} - Player object who is authoritative for this zone, or null
 */
function getZoneHost(room, zone) {
  if (!room || !room.players || room.players.length === 0) {
    return null;
  }

  // Find main host
  const host = room.players.find(p => p.id === room.hostId);

  // If main host is in this zone, they are authoritative
  if (host && host.zone === zone) {
    return host;
  }

  // Otherwise, find zone host (smallest ID in zone)
  const inZone = room.players
    .filter(p => p.zone === zone)
    .sort((a, b) => a.id.localeCompare(b.id));

  return inZone[0] || null;
}

/**
 * Check if a player is the authoritative host for their current zone
 * @param {object} room - Room object with players array and hostId
 * @param {string} playerId - Player ID to check
 * @returns {boolean} - True if player is authoritative for their zone
 */
function isPlayerZoneHost(room, playerId) {
  if (!room || !room.players) return false;

  const player = room.players.find(p => p.id === playerId);
  if (!player) return false;

  const zoneHost = getZoneHost(room, player.zone);
  return zoneHost && zoneHost.id === playerId;
}

/**
 * Get the zone that the main host is currently in
 * @param {object} room - Room object with players array and hostId
 * @returns {string|null} - Zone ID of main host, or null if not found
 */
function getMainHostZone(room) {
  if (!room || !room.players) return null;

  const host = room.players.find(p => p.id === room.hostId);
  return host ? host.zone : null;
}

module.exports = { getZoneHost, isPlayerZoneHost, getMainHostZone };
