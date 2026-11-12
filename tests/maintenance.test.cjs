const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertCompatible, attentionFingerprint } = require('../scripts/maintenance.cjs');

test('maintenance accepts compatible changes but refuses major upgrades and unrelated edits', () => {
  const before = { name: 'reader', engines: { node: '26.x' }, scripts: { test: 'node --test' }, dependencies: { next: '15.5.9', react: '^19.1.0' }, devDependencies: { typescript: '^5.0.0' } };
  const next = structuredClone(before); next.dependencies.next = '15.6.0'; next.dependencies.react = '^19.1.10';
  assert.doesNotThrow(() => assertCompatible(before, next));
  for (const change of [
    p => { p.dependencies.next = '16.0.0'; },
    p => { p.dependencies.react = '^19.2.0'; },
    p => { p.engines.node = '28.x'; },
    p => { p.scripts.test = 'true'; },
    p => { delete p.dependencies.react; },
    p => { p.dependencies.extra = '1.0.0'; },
  ]) { const invalid = structuredClone(next); change(invalid); assert.throws(() => assertCompatible(before, invalid)); }
});

test('unchanged findings have the same notification fingerprint despite ordering or repetition', () => {
  assert.equal(attentionFingerprint(['Build failed', 'Review major upgrade']), attentionFingerprint(['Review major upgrade', 'Build failed', 'Build failed']));
  assert.notEqual(attentionFingerprint(['Build failed']), attentionFingerprint(['Live check failed']));
});
