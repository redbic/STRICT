// Ability system for adventure
const ITEM_TYPES = {
    dash: {
        name: 'Dash',
        icon: '💫',
        description: 'Quick burst of speed'
    },
    sword: {
        name: 'Sword Strike',
        icon: '⚔️',
        description: 'Strike nearest enemy'
    },
    shield: {
        name: 'Shield Block',
        icon: '🛡️',
        description: 'Temporary invincibility'
    },
    fireball: {
        name: 'Fireball',
        icon: '🔥',
        description: 'Launch a fireball'
    }
};

class ItemManager {
    constructor() {
        this.hazards = [];
    }
    
    update(entities) {
        // Check hazard collisions
        this.hazards.forEach((hazard, index) => {
            entities.forEach(entity => {
                if (entity.invincible) return;
                
                const dist = Math.hypot(entity.x - hazard.x, entity.y - hazard.y);
                if (dist < 25) {
                    // Hit by fireball
                    if (hazard.type === 'fireball') {
                        entity.stunned = true;
                        entity.stunnedTime = 60;
                        this.hazards.splice(index, 1);
                    }
                }
            });
        });
    }
    
    draw(ctx, cameraX, cameraY) {
        // Draw hazards
        ctx.font = '30px Arial';
        this.hazards.forEach(hazard => {
            if (hazard.type === 'fireball') {
                ctx.fillText('🔥', hazard.x - cameraX - 15, hazard.y - cameraY + 15);
            }
        });
    }
    
    addHazard(hazard) {
        this.hazards.push(hazard);
    }
}
