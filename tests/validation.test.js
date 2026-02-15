const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSafeString,
  isSafeString,
  isValidRoomId,
  isValidPlayerId,
  isValidUsername,
  isFiniteNumberInRange,
  isValidPlayerState,
  isValidZoneId,
  sanitizeInventory,
  isValidChatMessage,
  ALLOWED_ZONE_IDS,
  INVENTORY_MAX_ITEMS,
} = require('../server/validation');

describe('normalizeSafeString', () => {
  it('trims whitespace', () => {
    assert.equal(normalizeSafeString('  hello  '), 'hello');
  });

  it('collapses multiple spaces', () => {
    assert.equal(normalizeSafeString('hello   world'), 'hello world');
  });

  it('returns empty string for non-string input', () => {
    assert.equal(normalizeSafeString(null), '');
    assert.equal(normalizeSafeString(undefined), '');
    assert.equal(normalizeSafeString(123), '');
  });
});

describe('isSafeString', () => {
  it('accepts valid strings', () => {
    assert.equal(isSafeString('hello'), true);
  });

  it('rejects empty strings', () => {
    assert.equal(isSafeString(''), false);
    assert.equal(isSafeString('   '), false);
  });

  it('rejects strings exceeding maxLength', () => {
    assert.equal(isSafeString('a'.repeat(65), { maxLength: 64 }), false);
  });

  it('checks pattern when provided', () => {
    assert.equal(isSafeString('abc123', { pattern: /^[a-z0-9]+$/ }), true);
    assert.equal(isSafeString('abc!@#', { pattern: /^[a-z0-9]+$/ }), false);
  });
});

describe('isValidRoomId', () => {
  it('accepts alphanumeric with hyphens and underscores', () => {
    assert.equal(isValidRoomId('my-room_123'), true);
  });

  it('rejects special characters', () => {
    assert.equal(isValidRoomId('room <script>'), false);
  });

  it('rejects empty', () => {
    assert.equal(isValidRoomId(''), false);
  });

  it('rejects overly long IDs', () => {
    assert.equal(isValidRoomId('a'.repeat(65)), false);
  });
});

describe('isValidPlayerId', () => {
  it('accepts valid IDs', () => {
    assert.equal(isValidPlayerId('player-1_abc'), true);
  });

  it('rejects spaces', () => {
    assert.equal(isValidPlayerId('player 1'), false);
  });
});

describe('isValidUsername', () => {
  it('accepts simple names', () => {
    assert.equal(isValidUsername('Alice'), true);
    assert.equal(isValidUsername('Bob 42'), true);
  });

  it('trims leading/trailing space via normalization', () => {
    // normalizeSafeString trims, so ' Alice' becomes 'Alice' which is valid
    assert.equal(isValidUsername(' Alice'), true);
    // But a name that's only spaces normalizes to empty → invalid
    assert.equal(isValidUsername('   '), false);
  });

  it('rejects special characters', () => {
    assert.equal(isValidUsername('Alice<script>'), false);
  });

  it('rejects empty', () => {
    assert.equal(isValidUsername(''), false);
  });

  it('accepts hyphens and underscores', () => {
    assert.equal(isValidUsername('cool-player_1'), true);
  });
});

describe('isFiniteNumberInRange', () => {
  it('accepts values in range', () => {
    assert.equal(isFiniteNumberInRange(5, 0, 10), true);
    assert.equal(isFiniteNumberInRange(0, 0, 10), true);
    assert.equal(isFiniteNumberInRange(10, 0, 10), true);
  });

  it('rejects out of range', () => {
    assert.equal(isFiniteNumberInRange(-1, 0, 10), false);
    assert.equal(isFiniteNumberInRange(11, 0, 10), false);
  });

  it('rejects non-finite', () => {
    assert.equal(isFiniteNumberInRange(Infinity, 0, 10), false);
    assert.equal(isFiniteNumberInRange(NaN, 0, 10), false);
  });

  it('rejects non-numbers', () => {
    assert.equal(isFiniteNumberInRange('5', 0, 10), false);
  });
});

describe('isValidPlayerState', () => {
  const validState = {
    x: 100, y: 200, angle: 1.5, speed: 3, zoneLevel: 1, stunned: false,
  };

  it('accepts valid state', () => {
    assert.equal(isValidPlayerState(validState), true);
  });

  it('accepts state with optional fields', () => {
    assert.equal(isValidPlayerState({ ...validState, hp: 100, isDead: false }), true);
  });

  it('rejects null/undefined', () => {
    assert.equal(isValidPlayerState(null), false);
    assert.equal(isValidPlayerState(undefined), false);
  });

  it('rejects arrays', () => {
    assert.equal(isValidPlayerState([1, 2, 3]), false);
  });

  it('rejects unknown keys', () => {
    assert.equal(isValidPlayerState({ ...validState, hackerField: true }), false);
  });

  it('rejects out-of-range coordinates', () => {
    assert.equal(isValidPlayerState({ ...validState, x: 99999 }), false);
  });

  it('rejects non-boolean stunned', () => {
    assert.equal(isValidPlayerState({ ...validState, stunned: 'yes' }), false);
  });

  it('rejects non-integer zoneLevel', () => {
    assert.equal(isValidPlayerState({ ...validState, zoneLevel: 1.5 }), false);
  });
});

describe('isValidZoneId', () => {
  it('accepts all allowed zone IDs', () => {
    for (const zoneId of ALLOWED_ZONE_IDS) {
      assert.equal(isValidZoneId(zoneId), true, `Expected ${zoneId} to be valid`);
    }
  });

  it('rejects unknown zone IDs', () => {
    assert.equal(isValidZoneId('unknown_zone'), false);
    assert.equal(isValidZoneId(''), false);
  });
});

describe('sanitizeInventory', () => {
  it('returns empty array for non-array', () => {
    assert.deepEqual(sanitizeInventory(null), []);
    assert.deepEqual(sanitizeInventory('string'), []);
    assert.deepEqual(sanitizeInventory({}), []);
  });

  it('sanitizes valid items', () => {
    const input = [{ id: 'sword-1', name: 'Iron Sword', icon: '🗡️' }];
    const result = sanitizeInventory(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'sword-1');
    assert.equal(result[0].name, 'Iron Sword');
  });

  it('skips items without id or name', () => {
    const input = [{ id: '', name: 'No ID' }, { id: 'x', name: '' }];
    assert.deepEqual(sanitizeInventory(input), []);
  });

  it('defaults icon to box emoji', () => {
    const input = [{ id: 'a', name: 'b' }];
    assert.equal(sanitizeInventory(input)[0].icon, '📦');
  });

  it('caps at INVENTORY_MAX_ITEMS', () => {
    const input = Array.from({ length: 20 }, (_, i) => ({ id: `item-${i}`, name: `Item ${i}` }));
    assert.equal(sanitizeInventory(input).length, INVENTORY_MAX_ITEMS);
  });

  it('skips non-object items', () => {
    const input = [null, 42, 'string', { id: 'valid', name: 'Valid' }];
    assert.equal(sanitizeInventory(input).length, 1);
  });
});

describe('isValidChatMessage', () => {
  it('accepts normal messages', () => {
    assert.equal(isValidChatMessage('Hello world!'), true);
    assert.equal(isValidChatMessage("It's a test."), true);
  });

  it('rejects empty messages', () => {
    assert.equal(isValidChatMessage(''), false);
    assert.equal(isValidChatMessage('   '), false);
  });

  it('rejects non-strings', () => {
    assert.equal(isValidChatMessage(123), false);
    assert.equal(isValidChatMessage(null), false);
  });

  it('rejects messages with disallowed characters', () => {
    assert.equal(isValidChatMessage('<script>alert(1)</script>'), false);
    assert.equal(isValidChatMessage('hello@world'), false);
  });

  it('rejects overly long messages', () => {
    assert.equal(isValidChatMessage('a'.repeat(201)), false);
  });
});
