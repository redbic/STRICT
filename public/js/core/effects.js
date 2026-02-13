// Visual effects module
// Handles screen flash, vignette, darkness overlay, etc.

class EffectsManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Screen flash effect
    this.screenFlash = {
      active: false,
      timer: 0,
      duration: 0.1,
      color: 'rgba(176, 64, 64, 0.25)'
    };

    // Vignette overlay (pre-rendered)
    this.vignetteCanvas = null;

    // Darkness overlay for "darkness" ruleset zones
    this.darknessCanvas = null;
    this.lastVisibilityRadius = 0;
    this.playerGlowCanvas = null;

    // Create initial vignette
    this.createVignetteCanvas();
  }

  /**
   * Create the vignette overlay canvas
   */
  createVignetteCanvas() {
    this.vignetteCanvas = document.createElement('canvas');
    this.vignetteCanvas.width = this.canvas.width;
    this.vignetteCanvas.height = this.canvas.height;
    const vctx = this.vignetteCanvas.getContext('2d');

    // Liminal vignette - subtle, warm tinted edges
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const outerRadius = Math.max(this.canvas.width, this.canvas.height) * 0.75;

    const gradient = vctx.createRadialGradient(
      centerX, centerY, this.canvas.width * 0.3,
      centerX, centerY, outerRadius
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.6, 'rgba(60, 50, 40, 0.1)');
    gradient.addColorStop(1, 'rgba(60, 50, 40, 0.4)');

    vctx.fillStyle = gradient;
    vctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Create darkness overlay canvas for limited visibility zones
   * @param {number} radius - Visibility radius
   * @returns {HTMLCanvasElement}
   */
  createDarknessCanvas(radius) {
    const canvas = document.createElement('canvas');
    const size = radius * 2 + 100; // Add margin for gradient
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return canvas;
  }

  /**
   * Create player glow canvas for visibility in dark zones
   * @returns {HTMLCanvasElement}
   */
  createPlayerGlowCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    const center = 40;

    // Draw glowing dot
    ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(center, center, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw glow effect
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, 30);
    gradient.addColorStop(0, 'rgba(100, 200, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, 30, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  /**
   * Resize effects canvases to match main canvas
   */
  resize() {
    this.createVignetteCanvas();
    // Darkness canvas will be recreated when needed
    this.darknessCanvas = null;
    this.playerGlowCanvas = null;
  }

  /**
   * Trigger a screen flash effect
   * @param {string} color - CSS color string
   * @param {number} duration - Duration in seconds
   */
  triggerScreenFlash(color = 'rgba(176, 64, 64, 0.25)', duration = 0.1) {
    this.screenFlash.active = true;
    this.screenFlash.timer = duration;
    this.screenFlash.duration = duration;
    this.screenFlash.color = color;
  }

  /**
   * Update effects (call each frame)
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.screenFlash.active) {
      this.screenFlash.timer -= dt;
      if (this.screenFlash.timer <= 0) {
        this.screenFlash.active = false;
      }
    }
  }

  /**
   * Draw screen flash if active
   */
  drawScreenFlash() {
    if (this.screenFlash.active) {
      this.ctx.fillStyle = this.screenFlash.color;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Draw vignette overlay
   */
  drawVignette() {
    if (this.vignetteCanvas) {
      this.ctx.drawImage(this.vignetteCanvas, 0, 0);
    }
  }

  /**
   * Draw darkness overlay for limited visibility zones
   * @param {number} visibilityRadius - How far the player can see
   * @param {number} playerScreenX - Player's screen X position
   * @param {number} playerScreenY - Player's screen Y position
   * @param {Array} otherPlayers - Array of other player objects with x,y,cameraX,cameraY
   * @param {number} cameraX - Camera X offset
   * @param {number} cameraY - Camera Y offset
   */
  drawDarknessOverlay(visibilityRadius, playerScreenX, playerScreenY, otherPlayers = [], cameraX = 0, cameraY = 0) {
    if (!visibilityRadius) return;

    // Create or update darkness canvas if visibility radius changed
    if (!this.darknessCanvas || this.lastVisibilityRadius !== visibilityRadius) {
      this.darknessCanvas = this.createDarknessCanvas(visibilityRadius);
      this.lastVisibilityRadius = visibilityRadius;
    }

    // Create player glow canvas if not exists
    if (!this.playerGlowCanvas) {
      this.playerGlowCanvas = this.createPlayerGlowCanvas();
    }

    // Save context
    this.ctx.save();

    // Draw darkness over everything
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Cut out the visibility circle using pre-rendered canvas
    this.ctx.globalCompositeOperation = 'destination-out';
    const halfSize = this.darknessCanvas.width / 2;
    this.ctx.drawImage(
      this.darknessCanvas,
      playerScreenX - halfSize,
      playerScreenY - halfSize
    );

    // Restore context
    this.ctx.globalCompositeOperation = 'source-over';

    // Draw glowing dots for other players using cached canvas
    otherPlayers.forEach(player => {
      const otherScreenX = player.x - cameraX;
      const otherScreenY = player.y - cameraY;

      // Draw pre-rendered player glow
      this.ctx.drawImage(
        this.playerGlowCanvas,
        otherScreenX - 40,
        otherScreenY - 40
      );
    });

    this.ctx.restore();
  }
}

// Make EffectsManager available globally
if (typeof window !== 'undefined') {
  window.EffectsManager = EffectsManager;
}
