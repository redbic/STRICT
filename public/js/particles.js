// Object-pooled particle system for all visual effects
// Supports two render layers: 'below' (ground marks, dust) and 'above' (sparks, trails, death bursts)

class ParticleSystem {
  constructor(poolSize = 500) {
    this.pool = [];
    this.activeCount = 0;

    // Pre-allocate particle pool (zero allocation during gameplay)
    for (let i = 0; i < poolSize; i++) {
      this.pool.push({
        active: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        life: 0, maxLife: 0,
        size: 0, startSize: 0, endSize: 0,
        color: '#ffffff',
        alpha: 1, startAlpha: 1, endAlpha: 0,
        gravity: 0,
        friction: 1,
        rotation: 0,
        rotationSpeed: 0,
        layer: 'above'  // 'below' or 'above'
      });
    }
  }

  /**
   * Emit particles from a config object
   * @param {Object} config - Particle emission config
   * @param {number} config.x - Spawn x position
   * @param {number} config.y - Spawn y position
   * @param {number} config.count - Number of particles to spawn
   * @param {number|number[]} config.speed - Speed or [min, max] range
   * @param {number} config.spread - Angle spread in radians (Math.PI * 2 = full circle)
   * @param {number} [config.angle] - Base emission angle (default: random)
   * @param {number|number[]} config.lifetime - Lifetime or [min, max] range in seconds
   * @param {number|number[]} config.size - Start size or [min, max] range
   * @param {number|number[]} [config.endSize] - End size or [min, max] range (default: 0)
   * @param {string|string[]} config.color - Color string or array to pick from
   * @param {number} [config.alpha] - Start alpha (default: 1)
   * @param {number} [config.endAlpha] - End alpha (default: 0)
   * @param {number} [config.gravity] - Gravity (positive = down, negative = up)
   * @param {number} [config.friction] - Velocity multiplier per frame (0.95 = slow down)
   * @param {string} [config.layer] - 'below' or 'above' (default: 'above')
   */
  emit(config) {
    const count = config.count || 1;

    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      if (!p) {
        if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
          console.warn('ParticleSystem: pool exhausted');
        }
        return;
      }

      p.active = true;
      p.x = config.x + (Math.random() - 0.5) * (config.offsetX || 0);
      p.y = config.y + (Math.random() - 0.5) * (config.offsetY || 0);

      // Speed + direction
      const speed = this._rangeVal(config.speed);
      const baseAngle = config.angle !== undefined ? config.angle : Math.random() * Math.PI * 2;
      const spread = config.spread !== undefined ? config.spread : Math.PI * 2;
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;

      // Lifetime
      const life = this._rangeVal(config.lifetime);
      p.life = life;
      p.maxLife = life;

      // Size
      p.startSize = this._rangeVal(config.size);
      p.endSize = config.endSize !== undefined ? this._rangeVal(config.endSize) : 0;
      p.size = p.startSize;

      // Color (pick random from array or use string)
      if (Array.isArray(config.color)) {
        p.color = config.color[Math.floor(Math.random() * config.color.length)];
      } else {
        p.color = config.color || '#ffffff';
      }

      // Alpha
      p.startAlpha = config.alpha !== undefined ? config.alpha : 1;
      p.endAlpha = config.endAlpha !== undefined ? config.endAlpha : 0;
      p.alpha = p.startAlpha;

      // Physics
      p.gravity = config.gravity || 0;
      p.friction = config.friction || 1;

      // Rotation
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 2;

      // Layer
      p.layer = config.layer || 'above';

      this.activeCount++;
    }
  }

  /**
   * Update all active particles
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    this.activeCount = 0;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      this.activeCount++;

      // Physics
      p.vy += p.gravity * dt;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Interpolate size and alpha based on life progress
      const t = 1 - (p.life / p.maxLife); // 0 at birth, 1 at death
      p.size = p.startSize + (p.endSize - p.startSize) * t;
      p.alpha = p.startAlpha + (p.endAlpha - p.startAlpha) * t;

      // Rotation
      p.rotation += p.rotationSpeed * dt;
    }
  }

  /**
   * Draw particles on the 'below' layer (ground marks, dust motes)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} camX - Camera X offset
   * @param {number} camY - Camera Y offset
   */
  drawBelow(ctx, camX, camY) {
    this._drawLayer(ctx, camX, camY, 'below');
  }

  /**
   * Draw particles on the 'above' layer (sparks, trails, death bursts)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} camX - Camera X offset
   * @param {number} camY - Camera Y offset
   */
  drawAbove(ctx, camX, camY) {
    this._drawLayer(ctx, camX, camY, 'above');
  }

  /** Clear all active particles */
  clear() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
    this.activeCount = 0;
  }

  // --- Private helpers ---

  _drawLayer(ctx, camX, camY, layer) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active || p.layer !== layer) continue;
      if (p.alpha <= 0.01 || p.size <= 0.1) continue;

      const sx = p.x - camX;
      const sy = p.y - camY;

      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _getParticle() {
    // Find first inactive particle
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    return null; // Pool exhausted
  }

  _rangeVal(val) {
    if (Array.isArray(val)) {
      return val[0] + Math.random() * (val[1] - val[0]);
    }
    return val || 0;
  }
}

// Make ParticleSystem available globally
if (typeof window !== 'undefined') {
  window.ParticleSystem = ParticleSystem;
}
