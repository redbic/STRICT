# HANDOFF.md — STRICT Adventure ⚔️

> Last updated: 2026-02-10

## Current State

STRICT1000 is a **multiplayer-only** top-down 2D adventure game (browser-based) with a hotel-themed narrative direction inspired by Inscryption, Realm of the Mad God, and Wii Play Tanks.

### What Works

- **Multiplayer**: WebSocket-based real-time co-op. Players confirm a username, auto-connect, join a room, and see each other in-game with avatars rendered above their heads.
- **Movement**: WASD / Arrow keys, fullscreen canvas, camera follows the local player.
- **Combat**: Click-to-attack melee system. Enemies aggro, chase, and deal damage. Players can kill enemies and earn currency.
- **Zones**: Hub (hallway, no enemies) → Archive Entry (enemies spawn). Portal-based zone transitions.
- **Server-side currency**: Kills award coins (`ENEMY_KILL_REWARD = 5`). Balance is persisted in PostgreSQL (Neon.tech) via `server/currency.js` and the `/api/balance/add` endpoint.
- **Player profiles**: Loaded from shared DB on name confirm — portrait, balance, and character data. Balance displayed in HUD.
- **Input fixes**: Sticky keys cleared on blur/visibility change. Context menu disabled on canvas.
- **Deployment**: Render.com + Neon.tech PostgreSQL. `render.yaml` included.

### What Was Removed

- **Singleplayer mode** — completely stripped (PR #5). The game is multiplayer-only now.
- **Pickups** — removed from hub.
- **Hub enemies** — hub is a safe gathering zone.
- **Space-bar attack** — attack moved to mouse click only.

## Architecture

```
STRICT1000/
├── server.js                # Express + WebSocket server, API routes, game rooms
├── server/
│   └── currency.js          # Server-side currency module (add/get balance, transactions)
├── public/
│   ├── index.html           # Main HTML — screens (menu, lobby, game), HUD
│   ├── css/
│   │   └── style.css        # Game styling
│   └── js/
│       ├── main.js          # App logic: screen management, profile loading, network setup, game start
│       ├── game.js          # Game class: canvas, game loop, camera, enemies, attack FX, zone transitions
│       ├── player.js        # Player class: movement, collision, combat (tryAttack, takeDamage), drawing
│       ├── enemy.js         # Enemy class: aggro AI, chase, melee attack, HP, drawing
│       ├── track.js         # Zone class + ZONES data: walls, portals, nodes, floor/wall colors
│       └── network.js       # NetworkManager: WebSocket client, room join/leave, state sync, enemy kill events
├── package.json
├── render.yaml
├── DEPLOYMENT.md
└── README.md
```

### Key data flow

1. **Name confirm** → `loadProfile(username)` fetches `/api/profile` → shows balance/avatar
2. **Auto-connect** → `NetworkManager.connect()` opens WebSocket → `joinRoom()` → lobby screen
3. **Start Adventure** → `startGame('hub')` → `Game.init('hub', username)` → game loop begins
4. **Zone transition** → player touches portal → `transitionZone(targetZone)` → `networkManager.enterZone()`
5. **Enemy kill** → `onEnemyKilled` callback → `networkManager.sendEnemyKilled()` → server awards coins → `balance_update` event → HUD updates

## Narrative Direction (from PR #7)

The game is shifting toward an **Inscryption-inspired three-act structure** set in a mysterious hotel:

**Four Pillars:**
1. **Uneasy intimacy** — the hotel setting creates closeness between player and game
2. **Tactile strategy** — real-time combat inspired by Wii Play Tanks
3. **Rule instability** — different rooms have different rulesets
4. **Meta-layer mystery** — narrator-driven reveals about the presidential suite

**Structure:** Hotel lobby as hub → room-based encounters with distinct rules → unreliable curator NPC → presidential suite as the meta-narrative payoff.

**Prototype focus:** Real-time combat and room-based rule variation.

## Next Steps (Priority Order)

### High Priority
- [ ] **Update README.md** — still references single-player mode, Space for abilities, and an outdated project structure. Needs to match the current multiplayer-only, click-to-attack reality.
- [ ] **Hotel lobby hub** — redesign the current hallway hub into the hotel lobby described in the narrative direction. Add visual identity (reception desk, doors to rooms, elevator?).
- [ ] **Curator NPC** — an unreliable narrator character in the lobby who gives context, hints, and misdirection.

### Medium Priority
- [ ] **Room-based rule variation** — each zone/room gets a distinct ruleset (e.g., no melee, limited visibility, reversed controls). This is the "rule instability" pillar.
- [ ] **Ranged combat / projectiles** — Wii Play Tanks-style: add projectile enemies, maybe reflective walls.
- [ ] **Remaining abilities** — Shield Block, Dash, Fireball are documented in README but not implemented.
- [ ] **Currency shop** — an NPC or UI in the lobby where players spend earned coins on abilities, cosmetics, or upgrades.

### Lower Priority
- [ ] **More zones** — expand beyond hub + archive entry. Each new room = new ruleset.
- [ ] **Sound / music** — retro atmosphere audio.
- [ ] **Visual polish** — sprite-based characters, tile maps, lighting effects.
- [ ] **Cross-game integration** — the shared DB with `blusaccount/stricthotel` (profile portrait, balance).

## Known Issues

- README.md is out of date (mentions single-player, Space key attack, old project structure).
- No `.github/copilot-instructions.md` exists yet.
- No automated tests.
- Room joining always creates a new random room — no way to join a friend's room by code yet (the room code is displayed but there's no join-by-code UI).

## Related Repositories

- [`blusaccount/stricthotel`](https://github.com/blusaccount/stricthotel) — shared universe: playable website with multiplayer minigames, social interaction, retro atmosphere. Shares the player profile DB.