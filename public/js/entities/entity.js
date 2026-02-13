// Base Entity class for game objects
// Provides common properties and methods for Player, Enemy, NPC, etc.

class Entity {
  /**
   * Create a new entity
   * @param {number} x - Initial x position (center)
   * @param {number} y - Initial y position (center)
   * @param {number} width - Entity width
   * @param {number} height - Entity height
   * @param {string} id - Unique identifier
   */
  constructor(x, y, width, height, id) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.id = id;
  }

  /**
   * Get screen position relative to camera
   * @param {number} cameraX - Camera x offset
   * @param {number} cameraY - Camera y offset
   * @returns {{x: number, y: number}} Screen coordinates
   */
  getScreenPos(cameraX, cameraY) {
    return {
      x: this.x - cameraX,
      y: this.y - cameraY
    };
  }

  /**
   * Get bounding box for collision detection
   * @returns {{left: number, right: number, top: number, bottom: number}}
   */
  getBounds() {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return {
      left: this.x - halfW,
      right: this.x + halfW,
      top: this.y - halfH,
      bottom: this.y + halfH
    };
  }

  /**
   * Check if this entity intersects with another
   * @param {Entity|{x: number, y: number, width: number, height: number}} other
   * @returns {boolean}
   */
  intersects(other) {
    const a = this.getBounds();
    const otherHalfW = (other.width || 0) / 2;
    const otherHalfH = (other.height || 0) / 2;
    const b = {
      left: other.x - otherHalfW,
      right: other.x + otherHalfW,
      top: other.y - otherHalfH,
      bottom: other.y + otherHalfH
    };

    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  /**
   * Get distance to another entity or point
   * @param {{x: number, y: number}} other
   * @returns {number}
   */
  distanceTo(other) {
    return Math.hypot(other.x - this.x, other.y - this.y);
  }

  /**
   * Get angle to another entity or point
   * @param {{x: number, y: number}} other
   * @returns {number} Angle in radians
   */
  angleTo(other) {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }

  /**
   * Update entity state - override in subclasses
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Override in subclasses
  }

  /**
   * Draw entity - override in subclasses
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} cameraX - Camera x offset
   * @param {number} cameraY - Camera y offset
   */
  draw(ctx, cameraX, cameraY) {
    // Override in subclasses
  }
}

// Make Entity available globally
if (typeof window !== 'undefined') {
  window.Entity = Entity;
}
