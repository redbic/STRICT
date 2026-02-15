const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager, MAX_PARTY_SIZE } = require('../server/rooms');

// Minimal mock WebSocket
function mockWs(id) {
  return { readyState: 1, send: () => {}, _id: id };
}

describe('RoomManager', () => {
  let rm;

  beforeEach(() => {
    rm = new RoomManager();
  });

  describe('createRoom / getRoom / hasRoom', () => {
    it('creates and retrieves a room', () => {
      rm.createRoom('room1');
      assert.equal(rm.hasRoom('room1'), true);
      const room = rm.getRoom('room1');
      assert.deepEqual(room.players, []);
      assert.equal(room.started, false);
      assert.equal(room.hostId, null);
    });

    it('returns undefined for non-existent room', () => {
      assert.equal(rm.getRoom('nope'), undefined);
      assert.equal(rm.hasRoom('nope'), false);
    });
  });

  describe('addPlayer', () => {
    it('adds a player and assigns host', () => {
      rm.createRoom('room1');
      const ws = mockWs('p1');
      const result = rm.addPlayer('room1', { id: 'p1', username: 'Alice', ws, zone: 'hub', character: 1 });
      assert.equal(result, true);

      const room = rm.getRoom('room1');
      assert.equal(room.players.length, 1);
      assert.equal(room.hostId, 'p1');
    });

    it('does not reassign host for second player', () => {
      rm.createRoom('room1');
      rm.addPlayer('room1', { id: 'p1', username: 'Alice', ws: mockWs('p1'), zone: 'hub', character: 1 });
      rm.addPlayer('room1', { id: 'p2', username: 'Bob', ws: mockWs('p2'), zone: 'hub', character: 2 });

      assert.equal(rm.getRoom('room1').hostId, 'p1');
    });

    it('rejects duplicate player IDs', () => {
      rm.createRoom('room1');
      rm.addPlayer('room1', { id: 'p1', username: 'Alice', ws: mockWs('p1'), zone: 'hub', character: 1 });
      const result = rm.addPlayer('room1', { id: 'p1', username: 'Alice2', ws: mockWs('p1b'), zone: 'hub', character: 1 });
      assert.equal(result, false);
    });

    it('rejects when room is full', () => {
      rm.createRoom('room1');
      for (let i = 0; i < MAX_PARTY_SIZE; i++) {
        rm.addPlayer('room1', { id: `p${i}`, username: `P${i}`, ws: mockWs(`p${i}`), zone: 'hub', character: 1 });
      }
      const result = rm.addPlayer('room1', { id: 'extra', username: 'Extra', ws: mockWs('extra'), zone: 'hub', character: 1 });
      assert.equal(result, false);
    });

    it('returns false for non-existent room', () => {
      assert.equal(rm.addPlayer('nope', { id: 'p1', username: 'A', ws: mockWs('p1'), zone: 'hub', character: 1 }), false);
    });
  });

  describe('removePlayer', () => {
    it('removes a player and returns result', () => {
      rm.createRoom('room1');
      rm.addPlayer('room1', { id: 'p1', username: 'A', ws: mockWs('p1'), zone: 'hub', character: 1 });
      rm.addPlayer('room1', { id: 'p2', username: 'B', ws: mockWs('p2'), zone: 'hub', character: 2 });

      const result = rm.removePlayer('room1', 'p2');
      assert.notEqual(result, null);
      assert.equal(result.room.players.length, 1);
      assert.equal(result.newHostId, null);
    });

    it('reassigns host when host leaves', () => {
      rm.createRoom('room1');
      rm.addPlayer('room1', { id: 'p1', username: 'A', ws: mockWs('p1'), zone: 'hub', character: 1 });
      rm.addPlayer('room1', { id: 'p2', username: 'B', ws: mockWs('p2'), zone: 'hub', character: 2 });

      const result = rm.removePlayer('room1', 'p1');
      assert.equal(result.newHostId, 'p2');
      assert.equal(rm.getRoom('room1').hostId, 'p2');
    });

    it('deletes room when last player leaves', () => {
      rm.createRoom('room1');
      rm.addPlayer('room1', { id: 'p1', username: 'A', ws: mockWs('p1'), zone: 'hub', character: 1 });
      const result = rm.removePlayer('room1', 'p1');
      assert.equal(result, null);
      assert.equal(rm.hasRoom('room1'), false);
    });

    it('returns null for non-existent room', () => {
      assert.equal(rm.removePlayer('nope', 'p1'), null);
    });
  });

  describe('removePlayerByWs', () => {
    it('removes player by WebSocket reference', () => {
      rm.createRoom('room1');
      const ws1 = mockWs('p1');
      const ws2 = mockWs('p2');
      rm.addPlayer('room1', { id: 'p1', username: 'A', ws: ws1, zone: 'hub', character: 1 });
      rm.addPlayer('room1', { id: 'p2', username: 'B', ws: ws2, zone: 'hub', character: 2 });

      const result = rm.removePlayerByWs('room1', ws1);
      assert.notEqual(result, null);
      assert.equal(result.room.players.length, 1);
      assert.equal(result.room.players[0].id, 'p2');
    });

    it('returns null if ws not found', () => {
      rm.createRoom('room1');
      rm.addPlayer('room1', { id: 'p1', username: 'A', ws: mockWs('p1'), zone: 'hub', character: 1 });
      assert.equal(rm.removePlayerByWs('room1', mockWs('unknown')), null);
    });
  });

  describe('getPlayerRoster', () => {
    it('returns serializable roster', () => {
      rm.createRoom('room1');
      rm.addPlayer('room1', { id: 'p1', username: 'Alice', ws: mockWs('p1'), zone: 'hub', character: 3 });

      const roster = rm.getPlayerRoster(rm.getRoom('room1'));
      assert.deepEqual(roster, [{ id: 'p1', username: 'Alice', zone: 'hub', character: 3 }]);
      // Verify ws is not in the roster (not serializable)
      assert.equal(roster[0].ws, undefined);
    });

    it('defaults character to 1', () => {
      rm.createRoom('room1');
      rm.addPlayer('room1', { id: 'p1', username: 'Alice', ws: mockWs('p1'), zone: 'hub' });
      const roster = rm.getPlayerRoster(rm.getRoom('room1'));
      assert.equal(roster[0].character, 1);
    });
  });

  describe('getAvailableRooms', () => {
    it('returns rooms with space', () => {
      rm.createRoom('room1');
      rm.addPlayer('room1', { id: 'p1', username: 'Alice', ws: mockWs('p1'), zone: 'hub', character: 1 });

      const available = rm.getAvailableRooms();
      assert.equal(available.length, 1);
      assert.equal(available[0].roomId, 'room1');
      assert.equal(available[0].playerCount, 1);
      assert.equal(available[0].maxPlayers, MAX_PARTY_SIZE);
      assert.deepEqual(available[0].players, ['Alice']);
    });

    it('excludes full rooms', () => {
      rm.createRoom('room1');
      for (let i = 0; i < MAX_PARTY_SIZE; i++) {
        rm.addPlayer('room1', { id: `p${i}`, username: `P${i}`, ws: mockWs(`p${i}`), zone: 'hub', character: 1 });
      }
      assert.equal(rm.getAvailableRooms().length, 0);
    });
  });

  describe('broadcastToRoom', () => {
    it('sends to all players except excluded', () => {
      rm.createRoom('room1');
      const sent = [];
      const ws1 = { readyState: 1, send: (m) => sent.push({ to: 'p1', msg: m }) };
      const ws2 = { readyState: 1, send: (m) => sent.push({ to: 'p2', msg: m }) };
      rm.addPlayer('room1', { id: 'p1', username: 'A', ws: ws1, zone: 'hub', character: 1 });
      rm.addPlayer('room1', { id: 'p2', username: 'B', ws: ws2, zone: 'hub', character: 2 });

      rm.broadcastToRoom('room1', { type: 'test' }, ws1);
      assert.equal(sent.length, 1);
      assert.equal(sent[0].to, 'p2');
    });

    it('sends to all players when no exclude', () => {
      rm.createRoom('room1');
      const sent = [];
      const ws1 = { readyState: 1, send: () => sent.push(1) };
      const ws2 = { readyState: 1, send: () => sent.push(2) };
      rm.addPlayer('room1', { id: 'p1', username: 'A', ws: ws1, zone: 'hub', character: 1 });
      rm.addPlayer('room1', { id: 'p2', username: 'B', ws: ws2, zone: 'hub', character: 2 });

      rm.broadcastToRoom('room1', { type: 'test' });
      assert.equal(sent.length, 2);
    });
  });

  describe('deleteRoom', () => {
    it('cleans up zone sessions on delete', () => {
      rm.createRoom('room1');
      const room = rm.getRoom('room1');
      let shutdownCalled = false;
      room.zoneSessions.set('hub', { shutdown: () => { shutdownCalled = true; } });

      rm.deleteRoom('room1');
      assert.equal(rm.hasRoom('room1'), false);
      assert.equal(shutdownCalled, true);
    });
  });
});
