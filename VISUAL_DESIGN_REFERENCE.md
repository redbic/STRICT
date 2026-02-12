# STRICT1000 — Visual Design Reference
## Hotel Lobby Mockup Guide

> **For:** Fullstack Lead implementing Phase 1.1 (Lobby Redesign)  
> **Purpose:** Visual reference for transforming the hallway into a hotel lobby

---

## Current State vs. Target State

### Current: Generic Hallway
- Plain dark brown floor (`#1a1510`)
- Simple walls with no detail
- One NPC standing in open space
- Portals scattered without context
- Feels like a **waiting room**, not a **place**

### Target: 1920s Hotel Lobby
- **Rich visual identity**: burgundy walls, ornate carpet, brass accents
- **Architectural landmarks**: reception desk, clock, elevator, pillars
- **Atmospheric lighting**: chandelier glow, soft shadows
- **Environmental storytelling**: luggage, portraits, wear & tear
- Feels like **stepping into a living world**

---

## Layout Blueprint

```
╔═══════════════════════════════════════════════════════════════╗
║                         HOTEL LOBBY                           ║
║                                                                ║
║   [Portrait]              [Chandelier]           [Portrait]   ║
║                                                                ║
║        🕰️                                                      ║
║   Grandfather                                                  ║
║      Clock          ┌─────────────────┐                       ║
║                     │  Reception Desk  │  👤 Receptionist     ║
║                     │    (counter)     │                       ║
║                     └─────────────────┘                        ║
║                                                                ║
║    🚪              💠 Spawn Point                      🚪      ║
║  Room 102         (Players appear here)            Room 237   ║
║ (Archive)                                           (Locked)  ║
║                                                                ║
║                                                                ║
║    🏛️ Pillar                                   🏛️ Pillar      ║
║                                                                ║
║                         [Carpet]                               ║
║                                                                ║
║    🚪                    🚪                         🛗         ║
║  Training            Room ???                  Elevator        ║
║                                              (Descending)      ║
║                                                                ║
║    🏛️ Pillar                                   🏛️ Pillar      ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Design Elements

### 1. Reception Desk (Center-Top)
**Visual:**
- Large horizontal counter (300x20px wall)
- Dark wood color (`#2e2420`)
- Positioned at `x: 750, y: 300`
- Receptionist NPC stands behind it

**Purpose:**
- Visual anchor — players immediately understand this is a hotel
- Interaction point for dialogue, shop (future)

**Implementation:**
```javascript
// In ZONES.hub.walls array
{ x: 750, y: 300, width: 300, height: 20 }, // Reception desk
```

---

### 2. Grandfather Clock (Top-Left)
**Visual:**
- Tall vertical structure (drawn as stacked rectangles)
- Golden/brass color (`#d4a745`)
- Positioned at `x: 200, y: 200`
- Optional: Animated pendulum (swinging circle)

**Purpose:**
- Atmospheric — ticking sound (future audio pass)
- Could track real-world time (easter egg)
- Visual landmark for orientation

**Implementation:**
```javascript
// In game.js draw loop (after walls)
function drawClock(ctx, cameraX, cameraY) {
  const clockX = 200 - cameraX;
  const clockY = 200 - cameraY;
  
  // Clock body (tall rectangle)
  ctx.fillStyle = '#6b4e3d'; // Dark wood
  ctx.fillRect(clockX - 20, clockY, 40, 150);
  
  // Clock face (circle at top)
  ctx.fillStyle = '#d4a745'; // Brass
  ctx.beginPath();
  ctx.arc(clockX, clockY + 30, 25, 0, Math.PI * 2);
  ctx.fill();
  
  // Clock hands (simple lines)
  const time = new Date();
  const hourAngle = (time.getHours() % 12) * (Math.PI / 6);
  const minuteAngle = time.getMinutes() * (Math.PI / 30);
  
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  // Hour hand
  ctx.beginPath();
  ctx.moveTo(clockX, clockY + 30);
  ctx.lineTo(
    clockX + Math.sin(hourAngle) * 12,
    clockY + 30 - Math.cos(hourAngle) * 12
  );
  ctx.stroke();
  // Minute hand
  ctx.beginPath();
  ctx.moveTo(clockX, clockY + 30);
  ctx.lineTo(
    clockX + Math.sin(minuteAngle) * 18,
    clockY + 30 - Math.cos(minuteAngle) * 18
  );
  ctx.stroke();
}
```

---

### 3. Elevator Doors (Right Side)
**Visual:**
- Two vertical doors (closed, metallic)
- Silver/steel color (`#8a8a8a`)
- Positioned at `x: 1500, y: 1000`
- Red "OUT OF SERVICE" light (small circle above)
- Optional: Art deco elevator frame

**Purpose:**
- Mystery box — players will wonder what's behind it
- Locked until Room 237 unlock condition met
- Visual storytelling (forbidden area)

**Implementation:**
```javascript
// In ZONES.hub.walls array
{ x: 1500, y: 1000, width: 60, height: 100 }, // Elevator left door
{ x: 1560, y: 1000, width: 60, height: 100 }, // Elevator right door

// In game.js draw loop (decorative elements)
function drawElevator(ctx, cameraX, cameraY) {
  const elevatorX = 1530 - cameraX;
  const elevatorY = 980 - cameraY;
  
  // "OUT OF SERVICE" light (red circle)
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(elevatorX, elevatorY, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Optional: Art deco triangle pattern above doors
  ctx.strokeStyle = '#d4a745';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(elevatorX - 30 + i * 15, elevatorY - 20);
    ctx.lineTo(elevatorX - 30 + i * 15 + 7, elevatorY - 35);
    ctx.lineTo(elevatorX - 30 + i * 15 + 15, elevatorY - 20);
    ctx.stroke();
  }
}
```

---

### 4. Ornate Carpet Pattern (Floor)
**Visual:**
- Replace solid floor color with patterned carpet
- Burgundy/maroon base (`#4a1c1c`)
- Golden geometric accents (`#d4a745`)
- Can use CSS pattern or canvas repeating pattern

**Purpose:**
- Visual richness — makes floor feel intentional
- Helps with spatial orientation (pattern alignment)

**Implementation Option A: CSS Background Pattern**
```css
/* In style.css, applied to #gameCanvas */
#gameCanvas {
  background: repeating-linear-gradient(
    45deg,
    #4a1c1c,
    #4a1c1c 10px,
    #3a1515 10px,
    #3a1515 20px
  );
}
```

**Implementation Option B: Canvas Pattern**
```javascript
// In zone.draw(), replace solid floor fill
const pattern = ctx.createPattern(createCarpetPattern(), 'repeat');
ctx.fillStyle = pattern;
ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

function createCarpetPattern() {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 40;
  patternCanvas.height = 40;
  const pctx = patternCanvas.getContext('2d');
  
  pctx.fillStyle = '#4a1c1c'; // Base color
  pctx.fillRect(0, 0, 40, 40);
  
  pctx.strokeStyle = '#d4a745'; // Accent lines
  pctx.lineWidth = 1;
  pctx.strokeRect(5, 5, 30, 30); // Diamond outline
  pctx.moveTo(20, 5);
  pctx.lineTo(20, 35);
  pctx.moveTo(5, 20);
  pctx.lineTo(35, 20);
  pctx.stroke();
  
  return patternCanvas;
}
```

---

### 5. Chandelier (Center-Top)
**Visual:**
- Not a physical object, just a lighting effect
- Soft radial gradient glow centered at `x: 900, y: 200`
- Warm yellow light (`rgba(255, 230, 150, 0.3)`)

**Purpose:**
- Atmospheric lighting — makes lobby feel grand
- Central focal point

**Implementation:**
```javascript
// In game.js draw loop (before walls)
function drawChandelier(ctx, cameraX, cameraY) {
  const chandelierX = 900 - cameraX;
  const chandelierY = 200 - cameraY;
  
  // Radial gradient glow
  const gradient = ctx.createRadialGradient(
    chandelierX, chandelierY, 0,
    chandelierX, chandelierY, 300
  );
  gradient.addColorStop(0, 'rgba(255, 230, 150, 0.3)');
  gradient.addColorStop(0.5, 'rgba(255, 230, 150, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 230, 150, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(chandelierX - 300, chandelierY - 300, 600, 600);
  
  // Optional: Simple chandelier sprite (circles + lines)
  ctx.fillStyle = '#d4a745';
  ctx.beginPath();
  ctx.arc(chandelierX, chandelierY, 10, 0, Math.PI * 2);
  ctx.fill();
  // Hanging crystals (small circles below)
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const x = chandelierX + Math.cos(angle) * 20;
    const y = chandelierY + 15;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

---

### 6. Wall Portraits (Left & Right)
**Visual:**
- Simple rectangular frames on walls
- Dark gold frames (`#8b6f47`)
- Contents: Shadowy silhouettes or question marks
- Positioned at `x: 150` (left) and `x: 1650` (right), `y: 100`

**Purpose:**
- Environmental storytelling (who are these people?)
- Future easter egg: portraits change based on lobby state
- Could be clickable (future feature)

**Implementation:**
```javascript
// In game.js draw loop (decorative elements)
function drawPortraits(ctx, cameraX, cameraY) {
  const portraits = [
    { x: 150, y: 100 },
    { x: 1650, y: 100 }
  ];
  
  portraits.forEach(p => {
    const screenX = p.x - cameraX;
    const screenY = p.y - cameraY;
    
    // Frame
    ctx.fillStyle = '#8b6f47';
    ctx.fillRect(screenX - 40, screenY - 60, 80, 100);
    
    // Inner shadow (portrait content)
    ctx.fillStyle = '#2a2420';
    ctx.fillRect(screenX - 35, screenY - 55, 70, 90);
    
    // Mysterious silhouette (simple shape)
    ctx.fillStyle = 'rgba(100, 80, 60, 0.5)';
    ctx.beginPath();
    ctx.arc(screenX, screenY - 20, 15, 0, Math.PI * 2); // Head
    ctx.fill();
    ctx.fillRect(screenX - 20, screenY, 40, 30); // Body
  });
}
```

---

### 7. Pillars (Four Corners)
**Visual:**
- Already exist in current hub (`30x30` squares)
- Change color to marble/stone (`#6b6560`)
- Add subtle shading (darker base, lighter top)

**Purpose:**
- Architectural detail — reinforces hotel aesthetics
- Collision obstacles (tactical cover in future combat?)

**Implementation:**
```javascript
// In ZONES.hub.walls, update existing pillars
{ x: 300, y: 400, width: 30, height: 30 },
{ x: 1470, y: 400, width: 30, height: 30 },
{ x: 300, y: 900, width: 30, height: 30 },
{ x: 1470, y: 900, width: 30, height: 30 }

// In zone.draw(), when drawing walls, check if it's a pillar
this.walls.forEach(wall => {
  if (wall.width === 30 && wall.height === 30) {
    // Draw pillar with shading
    ctx.fillStyle = '#6b6560'; // Base color
    ctx.fillRect(wall.x - cameraX, wall.y - cameraY, wall.width, wall.height);
    
    // Lighter top edge (fake 3D)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(wall.x - cameraX, wall.y - cameraY, wall.width, 5);
  } else {
    // Normal wall
    ctx.fillStyle = this.wallColor;
    ctx.fillRect(wall.x - cameraX, wall.y - cameraY, wall.width, wall.height);
  }
});
```

---

### 8. Portal Labels (Enhanced)
**Visual:**
- Existing portals get more context
- Add decorative door frames (arched top, brass trim)
- Room plaques (brass nameplates with room numbers)

**Purpose:**
- Players understand what each portal leads to
- Reinforces hotel theme (rooms have numbers/names)

**Implementation:**
```javascript
// In zone.draw(), when drawing portals
this.portals.forEach(portal => {
  const screenX = portal.x + portal.width / 2 - cameraX;
  const screenY = portal.y + portal.height / 2 - cameraY;
  
  // Door frame (arch)
  ctx.strokeStyle = '#d4a745'; // Brass
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(screenX, screenY - portal.height / 2, portal.width / 2, Math.PI, 0);
  ctx.stroke();
  ctx.strokeRect(
    screenX - portal.width / 2,
    screenY - portal.height / 2,
    portal.width,
    portal.height
  );
  
  // Room plaque (above door)
  if (portal.label) {
    ctx.fillStyle = '#8b6f47'; // Gold plaque
    ctx.fillRect(screenX - 40, screenY - portal.height / 2 - 35, 80, 25);
    
    ctx.fillStyle = '#000'; // Engraved text
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'center';
    ctx.fillText(portal.label, screenX, screenY - portal.height / 2 - 17);
  }
  
  // Locked icon (if locked)
  if (portal.locked) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('🔒', screenX, screenY + 5);
  }
});
```

---

## Color Palette

### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Burgundy** | `#4a1c1c` | Carpet base, wall accents |
| **Dark Wood** | `#2e2420` | Walls, reception desk |
| **Brass/Gold** | `#d4a745` | Clock, chandelier, door frames |
| **Marble Gray** | `#6b6560` | Pillars, stone elements |
| **Steel** | `#8a8a8a` | Elevator doors |

### Lighting Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Warm Glow** | `rgba(255, 230, 150, 0.3)` | Chandelier light |
| **Shadow** | `rgba(0, 0, 0, 0.3)` | Pillar bases, portrait interiors |
| **Locked Red** | `#ff0000` | Elevator "out of service" light |

---

## Atmospheric Touches (Optional Extras)

### Dust Motes (Particle Effect)
```javascript
// In game.js, maintain array of floating particles
class DustMote {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vy = -0.1; // Slow upward drift
    this.vx = Math.random() * 0.2 - 0.1;
    this.opacity = Math.random() * 0.3 + 0.1;
    this.size = Math.random() * 2 + 1;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < -10) this.y = canvas.height + 10; // Loop
  }
  
  draw(ctx, cameraX, cameraY) {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x - cameraX, this.y - cameraY, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Generate 20-30 dust motes in lobby, update + draw each frame
```

### Flickering Lights
```javascript
// In chandelier glow, add random flicker
const flicker = Math.random() * 0.1 + 0.9; // 0.9-1.0
gradient.addColorStop(0, `rgba(255, 230, 150, ${0.3 * flicker})`);
```

---

## Implementation Checklist

### Phase 1A: Basic Layout (1-2 days)
- [ ] Update `ZONES.hub` wall positions (reception desk, pillars)
- [ ] Change floor/wall colors to new palette
- [ ] Test: Layout should feel less empty

### Phase 1B: Decorative Elements (2-3 days)
- [ ] Draw grandfather clock (static)
- [ ] Draw elevator doors with "OUT OF SERVICE" light
- [ ] Draw portraits on walls
- [ ] Add chandelier glow effect
- [ ] Test: Lobby should feel atmospheric

### Phase 1C: Polish (1-2 days)
- [ ] Add carpet pattern (canvas or CSS)
- [ ] Enhanced portal labels with door frames
- [ ] Optional: Dust motes particle system
- [ ] Optional: Clock animation (ticking hands)
- [ ] Test: Lobby should feel **alive**

---

## Testing Checklist

After implementing the redesign, verify:
- [ ] Players spawn in correct location (center of lobby)
- [ ] Portals still function (transitions work)
- [ ] Collisions work (can't walk through desk/pillars/elevator)
- [ ] NPC (Receptionist) is visible and positioned correctly
- [ ] Performance is good (new draw code doesn't lag)
- [ ] Lobby feels **distinct** from other zones (not just a hallway)

---

## Final Notes

**Don't overthink it.**  
Start simple: update colors, add reception desk, draw a clock. Test. Then layer in details.

**Iterate visually.**  
Open the game in browser, make a change, refresh, see how it feels. Design by iteration.

**Player perspective matters.**  
Stand at spawn point, look around. Does this feel like a hotel? Would you want to explore?

If the answer is yes → **we've succeeded**.

*— The Game Designer*
