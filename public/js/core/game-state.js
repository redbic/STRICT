// Centralized game state management
// Consolidates global variables from main.js

class GameState {
  constructor() {
    // Game instance
    this.game = null;

    // Network
    this.networkManager = null;
    this.browseManager = null;  // Separate connection for room browsing

    // User info
    this.currentUsername = '';
    this.currentProfile = null;

    // Room state
    this.currentRoomPlayers = [];
    this.currentHostId = null;

    // Intervals
    this.playerUpdateInterval = null;
    this.enemySyncInterval = null;
    this.inventorySaveTimeout = null;
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    // Clear intervals
    if (this.playerUpdateInterval) {
      clearInterval(this.playerUpdateInterval);
      this.playerUpdateInterval = null;
    }
    if (this.enemySyncInterval) {
      clearInterval(this.enemySyncInterval);
      this.enemySyncInterval = null;
    }
    if (this.inventorySaveTimeout) {
      clearTimeout(this.inventorySaveTimeout);
      this.inventorySaveTimeout = null;
    }

    // Disconnect network
    if (this.networkManager) {
      this.networkManager.leaveRoom();
      this.networkManager.disconnect();
      this.networkManager = null;
    }
    if (this.browseManager) {
      this.browseManager.disconnect();
      this.browseManager = null;
    }

    // Destroy game
    if (this.game) {
      this.game.destroy();
      this.game = null;
    }

    // Reset state
    this.currentRoomPlayers = [];
    this.currentHostId = null;
  }

  /**
   * Update the host ID and notify game
   * @param {string} hostId
   */
  setHostId(hostId) {
    this.currentHostId = hostId;
    if (this.game && this.networkManager) {
      const wasHost = this.game.isHost;
      this.game.isHost = (this.networkManager.playerId === hostId);

      // Notify callbacks for host change
      if (this.onHostChange) {
        this.onHostChange(this.game.isHost, wasHost);
      }
    }
  }

  /**
   * Update zone host status based on current players
   */
  updateZoneHostStatus() {
    if (!this.game || !this.networkManager) return;

    // If we're the main host, we're authoritative for our zone
    if (this.game.isHost) {
      this.game.isZoneHost = false;
      return;
    }

    const localZone = this.game.zoneId || 'hub';
    const hostPlayer = this.currentRoomPlayers.find(p => p.id === this.currentHostId);
    const hostZone = hostPlayer ? hostPlayer.zone : 'hub';

    const wasZoneHost = this.game.isZoneHost;

    if (hostZone === localZone) {
      this.game.isZoneHost = false;
    } else {
      // Select ONE zone host deterministically (smallest ID)
      const playersInMyZone = this.currentRoomPlayers
        .filter(p => p.zone === localZone && p.id !== this.currentHostId)
        .sort((a, b) => a.id.localeCompare(b.id));

      const zoneHostId = playersInMyZone.length > 0 ? playersInMyZone[0].id : null;
      this.game.isZoneHost = (zoneHostId === this.networkManager.playerId);
    }

    // Notify callbacks for zone host change
    if (this.onZoneHostChange && this.game.isZoneHost !== wasZoneHost) {
      this.onZoneHostChange(this.game.isZoneHost, wasZoneHost);
    }
  }

  /**
   * Check if local player is authoritative (host or zone host)
   * @returns {boolean}
   */
  isAuthoritative() {
    return this.game && (this.game.isHost || this.game.isZoneHost);
  }

  /**
   * Get players in the same zone as local player
   * @returns {Array}
   */
  getZonePlayers() {
    if (!this.game) return [];
    const localZone = this.game.zoneId || 'hub';
    return this.currentRoomPlayers.filter(p => p.zone === localZone);
  }
}

// Make GameState available globally
if (typeof window !== 'undefined') {
  window.GameState = GameState;
}
