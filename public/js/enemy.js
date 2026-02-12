// Enemy class for adventure combat
class Enemy {
    constructor(x, y, id, options = {}) {
        this.x = x;
        this.y = y;
        this.width = 22;
        this.height = 22;
        this.id = id;

        this.speed = options.speed !== undefined ? options.speed : 2.2;
        this.hp = options.hp !== undefined ? options.hp : 50;
        this.maxHp = options.maxHp !== undefined ? options.maxHp : 50;
        this.damage = options.damage !== undefined ? options.damage : 8;
        this.attackRange = 28;
        this.aggroRange = 320;
        this.attackCooldown = 0;
        this.stunned = false;
        this.stunnedTime = 0;
        this.invincible = false;
        
        // Training dummy options
        this.stationary = options.stationary || false;
        this.passive = options.passive || false;
    }

    update(zone, target) {
        if (!target) return;
        
        // Stationary enemies don't move or attack
        if (this.stationary) return;

        if (this.stunned) {
            this.stunnedTime--;
            if (this.stunnedTime <= 0) {
                this.stunned = false;
            }
            return;
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < this.aggroRange) {
            if (dist > this.attackRange) {
                const nx = dx / dist;
                const ny = dy / dist;
                const nextX = this.x + nx * this.speed;
                const nextY = this.y + ny * this.speed;

                const oldX = this.x;
                const oldY = this.y;
                this.x = nextX;
                this.y = nextY;
                if (zone && zone.checkCollision(this)) {
                    this.x = oldX;
                    this.y = oldY;
                }
            } else if (this.attackCooldown <= 0 && !this.passive) {
                target.takeDamage(this.damage);
                this.attackCooldown = 45;
            }
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
    }

    draw(ctx, cameraX, cameraY) {
        const screenX = this.x - cameraX;
        const screenY = this.y - cameraY;

        ctx.save();
        ctx.fillStyle = this.stunned ? '#5c5c5c' : '#c0392b';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // HP bar
        const barWidth = 30;
        const barHeight = 4;
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(screenX - barWidth / 2, screenY - 20, barWidth, barHeight);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(screenX - barWidth / 2, screenY - 20, barWidth * hpRatio, barHeight);

        ctx.restore();
    }
}
