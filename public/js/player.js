// Player class for adventure character

// Constants (time-based, units per second)
const PLAYER_MAX_SPEED = 132;           // pixels per second (was 2.2 per frame * 60)
const PLAYER_ACCELERATION = 800;        // pixels per second squared
const PLAYER_FRICTION = 8;              // friction factor (higher = more friction)
const PLAYER_DEFAULT_HP = 100;
const PLAYER_ATTACK_DAMAGE = 20;
const PLAYER_ATTACK_RANGE = 76;
const PLAYER_ATTACK_ARC = Math.PI * 0.9;
const PLAYER_ATTACK_COOLDOWN = 0.417;   // seconds (was 25 frames / 60)
const PLAYER_ATTACK_ANIM_DURATION = 0.2; // seconds (was 12 frames / 60)
const PLAYER_SIZE = 20;
const PLAYER_STUN_FRICTION = 12;        // higher friction when stunned

class Player {
    /**
     * Create a new player
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position  
     * @param {string} color - Hex color code for player
     * @param {string} id - Unique player identifier
     * @param {string} username - Display name for player
     */
    constructor(x, y, color, id, username) {
        this.x = x;
        this.y = y;
        this.width = PLAYER_SIZE;
        this.height = PLAYER_SIZE;
        this.color = color || '#3498db';
        this.id = id;
        this.username = username || 'Player';
        this.avatarUrl = '';
        this.avatarImg = null;
        
        // Physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = PLAYER_MAX_SPEED;
        this.acceleration = PLAYER_ACCELERATION;
        this.friction = PLAYER_FRICTION;
        
        // Game stats
        this.zoneLevel = 1;
        this.nodesVisited = [];

        // Combat
        this.maxHp = PLAYER_DEFAULT_HP;
        this.hp = PLAYER_DEFAULT_HP;
        this.attackDamage = PLAYER_ATTACK_DAMAGE;
        this.attackRange = PLAYER_ATTACK_RANGE;
        this.attackArc = PLAYER_ATTACK_ARC;
        this.attackCooldown = 0;
        this.attackCooldownDuration = PLAYER_ATTACK_COOLDOWN;  // seconds
        this.attackAnimTimer = 0;
        this.attackAnimDuration = PLAYER_ATTACK_ANIM_DURATION; // seconds
        this.attackAngle = 0;

        // Simple weapon model: handle + blade rendered from hand pivot.
        this.weapon = {
            gripOffset: 7,
            bladeLength: 40,
            bladeWidth: 5
        };
        
        // Status
        this.stunned = false;
        this.stunnedTime = 0;

        // Interpolation targets (used by remote players)
        this.targetX = undefined;
        this.targetY = undefined;
    }
    
    /**
     * Update player physics and state
     * @param {Object} keys - Current keyboard state
     * @param {Zone} zone - Current zone for collision detection
     * @param {number} dt - Delta time in seconds
     */
    update(keys, zone, dt = 1/60) {
        // Handle stun effect
        if (this.stunned) {
            this.stunnedTime -= dt;
            if (this.stunnedTime <= 0) {
                this.stunned = false;
            }
            // Apply heavy friction when stunned (frame-rate independent)
            const stunFriction = Math.exp(-PLAYER_STUN_FRICTION * dt);
            this.velocityX *= stunFriction;
            this.velocityY *= stunFriction;
        } else {
            // Handle movement (4-directional top-down)
            let moveX = 0;
            let moveY = 0;

            if (keys['ArrowUp'] || keys['w']) {
                moveY = -1;
            }
            if (keys['ArrowDown'] || keys['s']) {
                moveY = 1;
            }
            if (keys['ArrowLeft'] || keys['a']) {
                moveX = -1;
            }
            if (keys['ArrowRight'] || keys['d']) {
                moveX = 1;
            }

            // Normalize diagonal movement
            if (moveX !== 0 && moveY !== 0) {
                moveX *= 0.707;
                moveY *= 0.707;
            }

            // Update facing angle and apply physics
            if (moveX !== 0 || moveY !== 0) {
                this.angle = Math.atan2(moveY, moveX);
                // Apply acceleration (time-based)
                this.velocityX += moveX * this.acceleration * dt;
                this.velocityY += moveY * this.acceleration * dt;
            }

            // Apply friction (frame-rate independent exponential decay)
            const frictionFactor = Math.exp(-this.friction * dt);
            this.velocityX *= frictionFactor;
            this.velocityY *= frictionFactor;

            // Cap velocity at maxSpeed
            const currentSpeed = Math.hypot(this.velocityX, this.velocityY);
            if (currentSpeed > this.maxSpeed) {
                this.velocityX = (this.velocityX / currentSpeed) * this.maxSpeed;
                this.velocityY = (this.velocityY / currentSpeed) * this.maxSpeed;
            }
        }

        // Update cooldowns (time-based)
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        if (this.attackAnimTimer > 0) {
            this.attackAnimTimer -= dt;
        }

        // Update speed for network sync (normalized to ~0-3 range for compatibility)
        this.speed = Math.hypot(this.velocityX, this.velocityY) / 60;

        // Store old position
        const oldX = this.x;
        const oldY = this.y;

        // Update position (time-based)
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;

        // Clamp to zone bounds
        if (zone) {
            const halfW = this.width / 2;
            const halfH = this.height / 2;
            this.x = Math.max(halfW, Math.min(zone.width - halfW, this.x));
            this.y = Math.max(halfH, Math.min(zone.height - halfH, this.y));
        }

        // Check area collision
        if (zone && zone.checkCollision(this)) {
            this.x = oldX;
            this.y = oldY;
        }

        // Check area nodes
        if (zone) {
            zone.checkPlayerNode(this);
        }
    }
    
    /**
     * Draw player on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} cameraX - Camera x offset
     * @param {number} cameraY - Camera y offset
     */
    draw(ctx, cameraX, cameraY) {
        ctx.save();
        
        const screenX = this.x - cameraX;
        const screenY = this.y - cameraY;
        
        const now = performance.now() / 1000;
        const moveIntensity = Math.min(1, this.speed / this.maxSpeed);
        const bob = Math.sin(now * 10) * moveIntensity * 1.4;
        const bodyY = screenY + bob;

        // Body shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.beginPath();
        ctx.ellipse(screenX, screenY + 11, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Torso
        ctx.fillStyle = this.stunned ? '#666' : this.color;
        ctx.beginPath();
        ctx.ellipse(screenX, bodyY + 1, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Head
        ctx.fillStyle = this.stunned ? '#888' : '#f8d6c3';
        ctx.beginPath();
        ctx.arc(screenX, bodyY - 8, 5, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#1f2d3d';
        ctx.beginPath();
        ctx.arc(screenX - 2, bodyY - 8, 0.8, 0, Math.PI * 2);
        ctx.arc(screenX + 2, bodyY - 8, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Facing indicator/nose
        const dirX = screenX + Math.cos(this.angle) * 6;
        const dirY = bodyY - 8 + Math.sin(this.angle) * 3;
        ctx.fillStyle = '#f0bca0';
        ctx.beginPath();
        ctx.arc(dirX, dirY, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Feet (simple walk cycle)
        const stride = Math.sin(now * 16) * moveIntensity * 2.4;
        ctx.strokeStyle = '#f5f5f5';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(screenX - 3, bodyY + 6);
        ctx.lineTo(screenX - 3 + stride, bodyY + 10);
        ctx.moveTo(screenX + 3, bodyY + 6);
        ctx.lineTo(screenX + 3 - stride, bodyY + 10);
        ctx.stroke();

        const activeAngle = this.getCurrentAttackAngle();
        const handX = screenX + Math.cos(activeAngle) * this.weapon.gripOffset;
        const handY = bodyY + Math.sin(activeAngle) * this.weapon.gripOffset;

        // Back hand for readability
        const offHandAngle = activeAngle + Math.PI * 0.65;
        ctx.fillStyle = '#ffd9c3';
        ctx.beginPath();
        ctx.arc(screenX + Math.cos(offHandAngle) * 5, bodyY + Math.sin(offHandAngle) * 4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Weapon handle
        const pommelX = handX - Math.cos(activeAngle) * 4;
        const pommelY = handY - Math.sin(activeAngle) * 4;
        const bladeTipX = handX + Math.cos(activeAngle) * this.weapon.bladeLength;
        const bladeTipY = handY + Math.sin(activeAngle) * this.weapon.bladeLength;

        ctx.strokeStyle = '#6e4a2e';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pommelX, pommelY);
        ctx.lineTo(handX + Math.cos(activeAngle) * 7, handY + Math.sin(activeAngle) * 7);
        ctx.stroke();

        // Weapon blade
        ctx.strokeStyle = this.attackAnimTimer > 0 ? '#dff5ff' : '#b8c7d4';
        ctx.lineWidth = this.weapon.bladeWidth;
        ctx.beginPath();
        ctx.moveTo(handX + Math.cos(activeAngle) * 7, handY + Math.sin(activeAngle) * 7);
        ctx.lineTo(bladeTipX, bladeTipY);
        ctx.stroke();

        // Hand on top of grip
        ctx.fillStyle = '#ffe3d2';
        ctx.beginPath();
        ctx.arc(handX, handY, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        
        // Draw avatar + username above character
        const labelY = screenY - 26;
        if (this.avatarImg && this.avatarImg.complete) {
            const size = 20;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this.avatarImg, screenX - size / 2, labelY - size, size, size);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('👽', screenX, labelY - 6);
        }

        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.username, screenX, labelY + 12);
        
    }
    /**
     * Set player avatar image
     * @param {string} url - Avatar image URL
     */
    setAvatar(url) {
        if (!url || this.avatarUrl === url) return;
        this.avatarUrl = url;
        this.avatarImg = new Image();
        this.avatarImg.src = url;
    }
    /**
     * Attempt to attack enemies in range
     * @param {Array<Enemy>} enemies - Array of enemies to check
     * @returns {boolean} True if an enemy was hit
     */
    tryAttack(enemies, attackAngle = this.angle) {
        if (this.attackCooldown > 0) return false;

        this.attackAngle = attackAngle;
        this.angle = attackAngle;
        this.attackCooldown = this.attackCooldownDuration;
        this.attackAnimTimer = this.attackAnimDuration;

        let hit = false;
        enemies.forEach(enemy => {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.hypot(dx, dy);
            const enemyRadius = (enemy.width || 20) / 2;
            if (dist > this.attackRange + enemyRadius) {
                return;
            }

            const targetAngle = Math.atan2(dy, dx);
            const angleDelta = Math.abs(this.normalizeAngle(targetAngle - attackAngle));
            if (angleDelta <= this.attackArc / 2) {
                enemy.takeDamage(this.attackDamage);
                hit = true;
            }
        });
        return hit;
    }

    getCurrentAttackAngle() {
        if (this.attackAnimTimer <= 0) {
            return this.angle;
        }

        const progress = 1 - (this.attackAnimTimer / this.attackAnimDuration);
        const startAngle = this.attackAngle - (this.attackArc * 0.55);
        return startAngle + (this.attackArc * progress);
    }

    normalizeAngle(angle) {
        let normalized = angle;
        while (normalized > Math.PI) normalized -= Math.PI * 2;
        while (normalized < -Math.PI) normalized += Math.PI * 2;
        return normalized;
    }
    /**
     * Apply damage to player
     * @param {number} amount - Damage amount
     */
    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
    }
    
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            angle: this.angle,
            speed: this.speed,
            zoneLevel: this.zoneLevel,
            username: this.username,
            stunned: this.stunned
        };
    }
    
    setState(state) {
        // Store target state for interpolation
        this.targetX = state.x;
        this.targetY = state.y;
        this.angle = state.angle;
        this.speed = state.speed;
        this.zoneLevel = state.zoneLevel;
        this.stunned = state.stunned;
    }

    interpolateRemote(dt) {
        if (this.targetX === undefined) return;
        // Frame-rate independent interpolation: ~87% per 100ms at 60fps
        const lerpFactor = 1 - Math.pow(0.001, dt);
        this.x += (this.targetX - this.x) * lerpFactor;
        this.y += (this.targetY - this.y) * lerpFactor;
    }
}
