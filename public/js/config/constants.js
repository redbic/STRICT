// Centralized game constants
// These values are used across multiple game systems

const CONFIG = {
  // ===================
  // Validation (sync with server/validation.js)
  // ===================
  MAX_USERNAME_LENGTH: 32,
  USERNAME_PATTERN: /^[A-Za-z0-9]([A-Za-z0-9 _-]*[A-Za-z0-9])?$/,

  // ===================
  // Player
  // ===================
  PLAYER_MAX_SPEED: 350,           // pixels per second
  PLAYER_ACCELERATION: 2200,       // pixels per second squared
  PLAYER_FRICTION: 8,              // friction factor (higher = more friction)
  PLAYER_DEFAULT_HP: 100,
  PLAYER_SIZE: 30,                 // player collision box size
  PLAYER_STUN_FRICTION: 12,        // higher friction when stunned

  // ===================
  // Gun / Combat
  // ===================
  GUN_FIRE_RATE: 0.75,             // shots per second (slow, tactical)
  GUN_DAMAGE: 25,                  // damage per shot (4 shots kills 100hp enemy)
  GUN_MAGAZINE_SIZE: 5,            // shots before reload
  GUN_RELOAD_TIME: 1.75,           // seconds to reload
  GUN_BARREL_LENGTH: 20,           // visual barrel offset

  // ===================
  // Enemy
  // ===================
  ENEMY_DEFAULT_SPEED: 108,        // pixels per second (was 1.8 * 60)
  ENEMY_DEFAULT_HP: 50,
  ENEMY_DEFAULT_DAMAGE: 8,
  ENEMY_ATTACK_RANGE: 28,
  ENEMY_AGGRO_RANGE: 320,
  ENEMY_ATTACK_COOLDOWN: 0.75,     // seconds (was 45 frames / 60)
  ENEMY_SIZE: 22,
  ENEMY_STUN_DURATION: 0.3,        // seconds

  // ===================
  // Network
  // ===================
  PLAYER_UPDATE_INTERVAL: 100,     // ms between player state updates
  ENEMY_SYNC_INTERVAL: 100,        // ms between enemy sync broadcasts

  // ===================
  // Projectile
  // ===================
  PROJECTILE_SPEED: 850,           // pixels per second
  PROJECTILE_LIFETIME: 2.0,        // seconds before despawn
  PROJECTILE_SIZE: 6,              // collision radius

  // ===================
  // Effects
  // ===================
  DAMAGE_FLASH_DURATION: 0.15,     // seconds
  MUZZLE_FLASH_DURATION: 0.08,     // seconds

  // ===================
  // UI / Health Bars
  // ===================
  HEALTH_BAR_WIDTH: 36,
  HEALTH_BAR_HEIGHT: 5,
};

// Make CONFIG available globally for non-module scripts
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
