// Input handling module
// Manages keyboard and mouse input for the game

class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.mouseDown = false;

    // Callbacks
    this.onKeyAction = null;  // (key, action) => void where action is 'press'|'release'

    // Bind methods
    this._normalizeKey = this._normalizeKey.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  /**
   * Normalize key names for consistent handling
   * @param {KeyboardEvent} event
   * @returns {string}
   */
  _normalizeKey(event) {
    if (event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar') {
      return ' ';
    }
    if (event.key.length === 1) {
      return event.key.toLowerCase();
    }
    return event.key;
  }

  handleKeyDown(e) {
    const key = this._normalizeKey(e);
    const wasPressed = this.keys[key];
    this.keys[key] = true;

    // Notify callback for key press (only on first press, not repeat)
    if (!wasPressed && this.onKeyAction) {
      this.onKeyAction(key, 'press', e);
    }

    // Prevent default for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'i', 'r'].includes(key)) {
      e.preventDefault();
    }
  }

  handleKeyUp(e) {
    const key = this._normalizeKey(e);
    this.keys[key] = false;

    if (this.onKeyAction) {
      this.onKeyAction(key, 'release', e);
    }
  }

  handleBlur() {
    this.keys = {};
    this.mouseDown = false;
  }

  handleFocus() {
    this.keys = {};
    this.mouseDown = false;
  }

  handleVisibilityChange() {
    this.keys = {};
    this.mouseDown = false;
  }

  handleMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  }

  handleMouseDown(e) {
    if (e.button === 0) {
      this.mouseDown = true;
    }
  }

  handleMouseUp(e) {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  }

  /**
   * Attach all event listeners
   */
  attach() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('focus', this.handleFocus);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * Detach all event listeners
   */
  detach() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('focus', this.handleFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * Check if a key is currently pressed
   * @param {string} key
   * @returns {boolean}
   */
  isKeyDown(key) {
    return !!this.keys[key.toLowerCase()];
  }

  /**
   * Get current movement direction from WASD/Arrow keys
   * @returns {{x: number, y: number}}
   */
  getMovementDirection() {
    let x = 0;
    let y = 0;

    if (this.keys['ArrowUp'] || this.keys['w']) y = -1;
    if (this.keys['ArrowDown'] || this.keys['s']) y = 1;
    if (this.keys['ArrowLeft'] || this.keys['a']) x = -1;
    if (this.keys['ArrowRight'] || this.keys['d']) x = 1;

    // Normalize diagonal
    if (x !== 0 && y !== 0) {
      x *= 0.707;
      y *= 0.707;
    }

    return { x, y };
  }

  /**
   * Clear all pressed keys
   */
  clear() {
    this.keys = {};
    this.mouseDown = false;
  }
}

// Make InputManager available globally
if (typeof window !== 'undefined') {
  window.InputManager = InputManager;
}
