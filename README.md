# STRICT Adventure ⚔️

A browser-based multiplayer top-down adventure game set in a mysterious hotel, inspired by Realm of the Mad God, Inscryption, and Wii Play Tanks. Features real-time co-op combat, a shared currency system, and a narrative-driven hotel hub.

## Features

- **Top-down 2D Exploration**: Realm of the Mad God-style perspective with fullscreen canvas
- **Hotel Hub**: A central gathering hallway for players (no enemies)
- **Click-to-Attack Combat**: Mouse-based melee system with attack animations
- **Enemy AI**: Enemies aggro, chase, and deal damage in combat zones
- **Server-side Currency**: Earn coins from enemy kills, persisted across sessions
- **Player Profiles**: Username-based profiles with avatar, balance, and character data from shared DB
- **Multiplayer Only**: Real-time WebSocket co-op — see other players with avatars above their heads
- **Responsive Controls**: WASD or Arrow keys for movement, mouse click to attack

## Tech Stack

- **Frontend**: Vanilla JavaScript with HTML5 Canvas
- **Backend**: Node.js + Express
- **Real-time**: WebSocket (ws library)
- **Database**: PostgreSQL (Neon.tech) — shared with [stricthotel](https://github.com/blusaccount/stricthotel)
- **Hosting**: Render.com

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL (optional — game works without DB, but profiles/currency won't persist)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/redbic/STRICT1000.git
cd STRICT1000
```

2. Install dependencies:
```bash
npm ci
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set your database URL (optional):
```
DATABASE_URL=postgresql://user:password@host/dbname
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:3000`

## How to Play

### Controls

- **Arrow Keys** or **WASD**: Movement
- **Mouse Click**: Attack (melee, aimed toward cursor)

### Flow

1. Enter your name and click **Confirm** — your profile loads from the shared DB
2. You auto-connect to a multiplayer room via WebSocket
3. Click **Start Adventure** to enter the hotel hub
4. Walk into portals to transition between zones
5. Kill enemies in combat zones to earn coins
6. Use the **Recall** button to return to the hub

### Tips

- The hub (hallway) is a safe zone — no enemies spawn here
- Enemies only appear in specific zones like the Archive Entry
- Your coin balance persists across sessions via the server
- Other players appear in real-time with their avatars

## Project Structure

```
STRICT1000/
├── public/
│   ├── css/
│   │   └── style.css          # Game styling
│   ├── js/
│   │   ├── main.js            # App logic: screens, profile loading, network setup
│   │   ├── game.js            # Game class: canvas, loop, camera, combat FX, zone transitions
│   │   ├── player.js          # Player class: movement, collision, melee attack, HP
│   │   ├── enemy.js           # Enemy class: aggro AI, chase, melee attack, HP
│   │   ├── track.js           # Zone class + ZONES data: walls, portals, floor/wall colors
│   │   └── network.js         # NetworkManager: WebSocket client, room sync, kill events
│   └── index.html             # Main HTML — screens (menu, lobby, game), HUD
├── server/
│   └── currency.js            # Server-side currency module (balance, transactions)
├── server.js                  # Express + WebSocket server, API routes, game rooms
├── package.json               # Dependencies
├── render.yaml                # Render.com deployment config
├── HANDOFF.md                 # Project state and session handoff notes
├── DEPLOYMENT.md              # Detailed deployment guide
└── README.md                  # This file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serve the game |
| `POST` | `/api/player` | Register or update a player |
| `GET` | `/api/profile?name=` | Fetch player profile (name, balance, character) |
| `POST` | `/api/balance/add` | Add currency to a player's balance |
| `WS` | `/` | WebSocket — multiplayer room sync, state updates, kill events |

## Database Schema

### Players Table
- `id`: Serial primary key
- `name`: Unique player name
- `balance`: Currency balance (decimal)
- `character_data`: JSON character customization data
- `created_at`: Timestamp

## Narrative & Design Direction

### Core Pillars

- **Uneasy intimacy**: The game should feel like it is watching or listening to the player.
- **Tactile strategy**: Movement and interactions should feel physical and consequential (Wii Play Tanks-inspired combat).
- **Rule instability**: Players should gradually learn that the rules are not fixed — different rooms, different rules.
- **Meta-layer mystery**: There is always a hidden game behind the visible one.

### Structure

Three-act, Inscryption-inspired structure:
- **Act 1**: A contained ritual-like loop.
- **Act 2**: A reframing where prior assumptions are challenged.
- **Act 3**: Systemic collapse/recombination where story and mechanics converge.

### World Hook

- The central hub is a **hotel lobby**.
- Each room in the hotel is a self-contained ruleset/game variant.
- The host/curator role is unreliable and deceptive.
- The player slowly realizes the narrator is intentionally preventing access to the hotel's presidential suite.

### Prototype Focus

- Real-time strategic combat (instead of card combat)
- Room-based ruleset variation
- Early narrative manipulation from the narrator

## Roadmap

- [ ] Redesign hub as hotel lobby with visual identity
- [ ] Curator NPC — unreliable narrator in the lobby
- [ ] Room-based rule variation (different rules per zone)
- [ ] Ranged combat / projectiles (Wii Play Tanks-style)
- [ ] Shield Block, Dash, Fireball abilities
- [ ] Currency shop for upgrades and cosmetics
- [ ] More zones / hotel rooms
- [ ] Sound effects and music
- [ ] Mobile touch controls

## Related

- [`blusaccount/stricthotel`](https://github.com/blusaccount/stricthotel) — shared universe: playable website with multiplayer minigames, social interaction, retro atmosphere. Shares the player profile DB.

## License

MIT

## Credits

Inspired by Realm of the Mad God, Inscryption, and Wii Play Tanks.