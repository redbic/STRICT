const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { addBalance, deductBalance, getBalance } = require('../server/currency');

// All tests use pool=null (in-memory fallback mode)

describe('currency (in-memory mode)', () => {
  describe('addBalance', () => {
    it('adds to default balance of 1000', async () => {
      const result = await addBalance(null, 'test-add-1', 50, 'test', {});
      assert.equal(result, 1050);
    });

    it('rejects zero amount', async () => {
      const result = await addBalance(null, 'test-add-zero', 0, 'test', {});
      assert.equal(result, null);
    });

    it('rejects negative amount', async () => {
      const result = await addBalance(null, 'test-add-neg', -10, 'test', {});
      assert.equal(result, null);
    });

    it('rejects non-number amount', async () => {
      const result = await addBalance(null, 'test-add-str', 'abc', 'test', {});
      assert.equal(result, null);
    });

    it('rejects Infinity', async () => {
      const result = await addBalance(null, 'test-add-inf', Infinity, 'test', {});
      assert.equal(result, null);
    });

    it('rounds to 2 decimal places', async () => {
      const name = 'test-add-round-' + Date.now();
      // 0.001 > 0 so passes guard, but rounds to 0 after Math.round
      const result = await addBalance(null, name, 0.001, 'test', {});
      assert.equal(result, 1000); // 1000 + 0 = 1000
    });

    it('accumulates across calls', async () => {
      const name = 'test-accum-' + Date.now();
      await addBalance(null, name, 10, 'test', {});
      const result = await addBalance(null, name, 20, 'test', {});
      assert.equal(result, 1030);
    });
  });

  describe('deductBalance', () => {
    it('deducts from default balance', async () => {
      const name = 'test-deduct-' + Date.now();
      const result = await deductBalance(null, name, 100, 'test', {});
      assert.equal(result, 900);
    });

    it('returns null for insufficient funds', async () => {
      const name = 'test-deduct-insuf-' + Date.now();
      const result = await deductBalance(null, name, 1500, 'test', {});
      assert.equal(result, null);
    });

    it('rejects zero amount', async () => {
      const result = await deductBalance(null, 'test-deduct-zero', 0, 'test', {});
      assert.equal(result, null);
    });

    it('rejects negative amount', async () => {
      const result = await deductBalance(null, 'test-deduct-neg', -10, 'test', {});
      assert.equal(result, null);
    });
  });

  describe('getBalance', () => {
    it('returns null for unknown player', async () => {
      const result = await getBalance(null, 'nobody-' + Date.now());
      assert.equal(result, null);
    });

    it('returns balance after add', async () => {
      const name = 'test-getbal-' + Date.now();
      await addBalance(null, name, 50, 'test', {});
      const result = await getBalance(null, name);
      assert.equal(result, 1050);
    });
  });
});
