const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const currency = require('./server/currency');
const { RoomManager, MAX_PARTY_SIZE } = require('./server/rooms');
const { createAuthRouter, authMiddleware, isSessionAuthenticated } = require('./server/auth');
const { normalizeSafeString, isValidUsername, sanitizeInventory } = require('./server/validation');
const { createPool } = require('./server/db/pool');
const { ZoneSession } = require('./server/zone-session');
const { TankZoneSession } = require('./server/tank-zone-session');
const { createHandlers } = require('./server/handlers');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({
  noServer: true, // We handle upgrades manually for session auth
  maxPayload: 64 * 1024, // 64 KB max message size
});

const PORT = process.env.PORT || 3000;
const ENEMY_KILL_REWARD = 5;
const DEATH_PENALTY_COINS = 20;

const HTTP_BODY_SIZE_LIMIT = '5mb';
const WS_MAX_CONNECTIONS_PER_IP = 5;

// WebSocket rate limiting
const WS_RATE_LIMIT_WINDOW_MS = 10000;
const WS_RATE_LIMIT_MAX_MESSAGES = 300; // Increased to support player updates + enemy sync
const wsConnectionsByIp = new Map();
const WS_IP_CLEANUP_INTERVAL_MS = 60000; // Clean up stale IP entries every 60s

validateEnvironment();

// PostgreSQL connection pool
const pool = createPool(process.env.DATABASE_URL, process.env.NODE_ENV === 'production');

// Room manager
const rooms = new RoomManager();

// Trust proxy (for deployments behind reverse proxy like Render, Railway, etc.)
app.set('trust proxy', 1);

// Session middleware
const isProduction = process.env.NODE_ENV === 'production';
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'strict1000-dev-secret-' + Math.random(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' // 'strict' can cause issues with redirects
  }
});

// Body parser for login (must come before auth routes)
app.use(express.json({ limit: HTTP_BODY_SIZE_LIMIT }));

// Session middleware
app.use(sessionMiddleware);

// Auth routes (login must be before auth middleware)
app.use(createAuthRouter());
app.use(authMiddleware);

// Security headers (must be before static files so they apply to all responses)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

// Static files (after auth and security headers)
app.use(express.static(path.join(__dirname, 'public')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// --- API Routes ---

app.post('/api/player', async (req, res) => {
  const username = normalizeSafeString(req.body.username);
  if (!username || !isValidUsername(username)) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  if (!pool) {
    return res.json({ success: true, player: { name: username, inventory_data: [] } });
  }

  try {
    const result = await pool.query(`
      INSERT INTO players (name) 
      VALUES ($1) 
      ON CONFLICT (name) 
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, balance, character_data, inventory_data
    `, [username]);

    res.json({ success: true, player: result.rows[0] });
  } catch (error) {
    console.error('Player creation error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/profile', async (req, res) => {
  const name = normalizeSafeString(req.query.name);
  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }

  if (!pool) {
    return res.json({ name, balance: null, character: null, inventory: [] });
  }

  try {
    const result = await pool.query(
      'SELECT name, balance, character_data, inventory_data FROM players WHERE name = $1 LIMIT 1',
      [name]
    );
    if (result.rows.length === 0) {
      return res.json({ name, balance: null, character: null, inventory: [] });
    }
    const row = result.rows[0];
    res.json({
      name: row.name,
      balance: row.balance !== null ? Number(row.balance) : null,
      character: row.character_data || null,
      inventory: sanitizeInventory(row.inventory_data),
    });
  } catch (error) {
    console.error('Profile lookup error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Inventory Save: Client-authoritative model
// The client sends full inventory state, server trusts it after sanitization.
// This is acceptable for cooperative play. For a competitive game, this would
// need server-side item tracking with item generation/consumption validation.
app.post('/api/inventory', async (req, res) => {
  const username = normalizeSafeString(req.body.username);
  if (!username || !isValidUsername(username)) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  const sanitized = sanitizeInventory(req.body.inventory);

  if (!pool) {
    return res.json({ success: true, inventory: sanitized });
  }

  try {
    const result = await pool.query(
      `UPDATE players
       SET inventory_data = $2::jsonb
       WHERE name = $1
       RETURNING inventory_data`,
      [username, JSON.stringify(sanitized)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ success: true, inventory: sanitizeInventory(result.rows[0].inventory_data) });
  } catch (error) {
    console.error('Inventory save error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Zone API ---

const fs = require('fs').promises;
const zonesDir = path.join(__dirname, 'public', 'data', 'zones');

// Cache for zone data (to avoid repeated file reads)
const zoneDataCache = new Map();

/**
 * Load zone data from JSON file
 * @param {string} zoneId
 * @returns {Promise<Object|null>}
 */
async function loadZoneData(zoneId) {
  if (zoneDataCache.has(zoneId)) {
    return zoneDataCache.get(zoneId);
  }

  try {
    const filePath = path.join(zonesDir, `${zoneId}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    zoneDataCache.set(zoneId, parsed);
    return parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Failed to load zone ${zoneId}:`, error);
    }
    return null;
  }
}

// Save zone data (restricted to development mode only — zone editor is a dev tool)
app.post('/api/zones/:zoneId', async (req, res) => {
  if (isProduction) {
    return res.status(403).json({ error: 'Zone editing is disabled in production' });
  }

  const zoneId = normalizeSafeString(req.params.zoneId);
  if (!zoneId || !/^[a-z0-9_-]+$/i.test(zoneId)) {
    return res.status(400).json({ error: 'Invalid zone ID' });
  }

  const zoneData = req.body;
  if (!zoneData || typeof zoneData !== 'object') {
    return res.status(400).json({ error: 'Invalid zone data' });
  }

  try {
    // Ensure directory exists
    await fs.mkdir(zonesDir, { recursive: true });

    // Write zone file
    const filePath = path.join(zonesDir, `${zoneId}.json`);
    await fs.writeFile(filePath, JSON.stringify(zoneData, null, 2));

    res.json({ success: true, zoneId });
  } catch (error) {
    console.error('Zone save error:', error);
    res.status(500).json({ error: 'Failed to save zone' });
  }
});

// Get zone data
app.get('/api/zones/:zoneId', async (req, res) => {
  const zoneId = normalizeSafeString(req.params.zoneId);
  if (!zoneId || !/^[a-z0-9_-]+$/i.test(zoneId)) {
    return res.status(400).json({ error: 'Invalid zone ID' });
  }

  try {
    const filePath = path.join(zonesDir, `${zoneId}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Zone not found' });
    }
    console.error('Zone load error:', error);
    res.status(500).json({ error: 'Failed to load zone' });
  }
});

// List all zones
app.get('/api/zones', async (req, res) => {
  try {
    await fs.mkdir(zonesDir, { recursive: true });
    const files = await fs.readdir(zonesDir);
    const zones = files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    res.json({ zones });
  } catch (error) {
    console.error('Zone list error:', error);
    res.status(500).json({ error: 'Failed to list zones' });
  }
});

// --- Database schema migration ---

async function ensurePlayerSchema() {
  if (!pool) return;
  try {
    await pool.query(`
      ALTER TABLE players
      ADD COLUMN IF NOT EXISTS inventory_data JSONB NOT NULL DEFAULT '[]'::jsonb
    `);
  } catch (error) {
    console.error('Failed ensuring players inventory schema:', error);
  }
}

// --- WebSocket setup ---

const { MESSAGE_HANDLERS, handleDisconnect } = createHandlers({
  rooms, pool, currency, wss, loadZoneData,
  ZoneSession, TankZoneSession, MAX_PARTY_SIZE,
  ENEMY_KILL_REWARD, DEATH_PENALTY_COINS,
});

function getAllowedOrigins() {
  const configuredOrigin = normalizeSafeString(process.env.APP_ORIGIN || '');
  const origins = new Set();
  if (configuredOrigin) origins.add(configuredOrigin);
  return origins;
}

function isAllowedWsOrigin(origin, request) {
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.size > 0) {
    return allowedOrigins.has(origin);
  }

  const requestHost = normalizeSafeString(request?.headers?.host || '');
  if (!requestHost) {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.host === requestHost;
  } catch (_error) {
    return false;
  }
}

function validateEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!normalizeSafeString(process.env.APP_PASSWORD || '')) {
    throw new Error('APP_PASSWORD is required to password protect STRICT1000');
  }

  if (nodeEnv === 'production') {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production');
    }
    if (!process.env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET is required in production');
    }
  }
}

function getClientIp(request) {
  const forwarded = normalizeSafeString(request.headers['x-forwarded-for'] || '');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return request.socket?.remoteAddress || 'unknown';
}

function registerWsConnection(ip) {
  const count = wsConnectionsByIp.get(ip) || 0;
  if (count >= WS_MAX_CONNECTIONS_PER_IP) {
    return false;
  }

  wsConnectionsByIp.set(ip, count + 1);
  return true;
}

function unregisterWsConnection(ip) {
  const count = wsConnectionsByIp.get(ip) || 0;
  if (count <= 1) {
    wsConnectionsByIp.delete(ip);
    return;
  }

  wsConnectionsByIp.set(ip, count - 1);
}

function parseWsPayload(message) {
  if (typeof message !== 'string') return null;

  let data;
  try {
    data = JSON.parse(message);
  } catch {
    return null;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (!MESSAGE_HANDLERS[data.type]) return null;

  return data;
}

wss.on('connection', (ws, request) => {
  // Check session-based authentication
  // The session was already validated in the upgrade handler
  if (!request.session || !isSessionAuthenticated(request.session)) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  const clientIp = getClientIp(request);
  if (!registerWsConnection(clientIp)) {
    ws.close(1008, 'Too many connections');
    return;
  }

  ws.clientIp = clientIp;
  ws.messageCount = 0;
  ws.lastReset = Date.now();

  ws.on('message', (message) => {
    // Rate limiting
    const now = Date.now();
    if (now - ws.lastReset > WS_RATE_LIMIT_WINDOW_MS) {
      ws.messageCount = 0;
      ws.lastReset = now;
    }
    ws.messageCount++;
    if (ws.messageCount > WS_RATE_LIMIT_MAX_MESSAGES) {
      console.warn('Rate limit exceeded for connection, closing');
      ws.close(1008, 'Rate limit exceeded');
      return;
    }

    const data = parseWsPayload(message.toString());
    if (!data) return;

    MESSAGE_HANDLERS[data.type](ws, data);
  });

  ws.on('close', () => {
    unregisterWsConnection(ws.clientIp || 'unknown');
    handleDisconnect(ws);
  });
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(() => {
    if (pool) {
      pool.end()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      return;
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Periodic cleanup of stale IP connection counts — reconcile with actual connections
setInterval(() => {
  // Count actual open connections per IP
  const actualCounts = new Map();
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.clientIp) {
      actualCounts.set(client.clientIp, (actualCounts.get(client.clientIp) || 0) + 1);
    }
  });

  // Reconcile: remove stale entries, correct drifted counts
  for (const [ip] of wsConnectionsByIp) {
    const actual = actualCounts.get(ip) || 0;
    if (actual === 0) {
      wsConnectionsByIp.delete(ip);
    } else {
      wsConnectionsByIp.set(ip, actual);
    }
  }
}, WS_IP_CLEANUP_INTERVAL_MS);

// Handle WebSocket upgrade with session authentication
server.on('upgrade', (request, socket, head) => {
  // Check origin
  const origin = request.headers.origin;
  if (origin && !isAllowedWsOrigin(origin, request)) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  // Parse session from cookies
  sessionMiddleware(request, {}, () => {
    if (!request.session || !isSessionAuthenticated(request.session)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
});

// Start server
server.listen(PORT, async () => {
  await ensurePlayerSchema();
  console.log(`Server running on port ${PORT}`);
});
