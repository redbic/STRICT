// Gun class - extracted weapon system
// Handles fire rate, ammo, reloading, and muzzle flash

class Gun {
  /**
   * Create a new gun
   * @param {Object} config - Gun configuration
   * @param {number} [config.fireRate] - Shots per second
   * @param {number} [config.damage] - Damage per shot
   * @param {number} [config.magazineSize] - Shots before reload
   * @param {number} [config.reloadTime] - Seconds to reload
   * @param {number} [config.barrelLength] - Visual barrel offset
   */
  constructor(config = {}) {
    const C = typeof CONFIG !== 'undefined' ? CONFIG : {};

    this.fireRate = config.fireRate || C.GUN_FIRE_RATE || 0.75;
    this.damage = config.damage || C.GUN_DAMAGE || 25;
    this.magazineSize = config.magazineSize || C.GUN_MAGAZINE_SIZE || 5;
    this.reloadTime = config.reloadTime || C.GUN_RELOAD_TIME || 1.75;
    this.barrelLength = config.barrelLength || C.GUN_BARREL_LENGTH || 20;

    this.ammo = this.magazineSize;
    this.fireCooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;

    // Muzzle flash effect
    this.muzzleFlash = {
      active: false,
      timer: 0,
      duration: (typeof CONFIG !== 'undefined' ? CONFIG.MUZZLE_FLASH_DURATION : 0.08)
    };
  }

  /**
   * Update gun cooldowns and reload state
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.ammo = this.magazineSize;
        this.reloading = false;
      }
    }

    // Update muzzle flash
    if (this.muzzleFlash.active) {
      this.muzzleFlash.timer -= dt;
      if (this.muzzleFlash.timer <= 0) {
        this.muzzleFlash.active = false;
      }
    }
  }

  /**
   * Check if gun can fire
   * @returns {boolean}
   */
  canFire() {
    return this.fireCooldown <= 0 && !this.reloading && this.ammo > 0;
  }

  /**
   * Attempt to fire the gun
   * @returns {boolean} True if fired, false if couldn't fire
   */
  fire() {
    if (!this.canFire()) {
      if (this.ammo <= 0 && !this.reloading) {
        this.reload();
      }
      return false;
    }

    this.ammo--;
    this.fireCooldown = 1 / this.fireRate;

    // Trigger muzzle flash
    this.muzzleFlash.active = true;
    this.muzzleFlash.timer = this.muzzleFlash.duration;

    return true;
  }

  /**
   * Start reloading the gun
   * @returns {boolean} True if started reloading, false if already reloading or full
   */
  reload() {
    if (this.reloading || this.ammo === this.magazineSize) {
      return false;
    }

    this.reloading = true;
    this.reloadTimer = this.reloadTime;
    return true;
  }

  /**
   * Get reload progress (0-1)
   * @returns {number}
   */
  getReloadProgress() {
    if (!this.reloading) return 1;
    return 1 - (this.reloadTimer / this.reloadTime);
  }

  /**
   * Check if ammo is low (for UI indicators)
   * @param {number} threshold - Ammo count to consider "low"
   * @returns {boolean}
   */
  isAmmoLow(threshold = 2) {
    return this.ammo <= threshold && !this.reloading;
  }

  /**
   * Reset gun to full state
   */
  reset() {
    this.ammo = this.magazineSize;
    this.fireCooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.muzzleFlash.active = false;
    this.muzzleFlash.timer = 0;
  }
}

// Make Gun available globally
if (typeof window !== 'undefined') {
  window.Gun = Gun;
}
