const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertCompatible, shouldNotifyApplied, notifyApplied } = require('../scripts/maintenance.cjs');

test('maintenance accepts compatible changes but refuses major upgrades and unrelated edits', () => {
  const before = { name: 'reader', engines: { node: '26.x' }, scripts: { test: 'node --test' }, dependencies: { next: '15.5.9', react: '^19.1.0' }, devDependencies: { typescript: '^5.0.0' } };
  const next = structuredClone(before); next.dependencies.next = '15.6.0'; next.dependencies.react = '^19.2.0';
  assert.doesNotThrow(() => assertCompatible(before, next));
  for (const change of [
    p => { p.dependencies.next = '16.0.0'; },
    p => { p.engines.node = '28.x'; },
    p => { p.scripts.test = 'true'; },
    p => { delete p.dependencies.react; },
    p => { p.dependencies.extra = '1.0.0'; },
  ]) { const invalid = structuredClone(next); change(invalid); assert.throws(() => assertCompatible(before, invalid)); }
});

const passed = Object.fromEntries(['candidate', 'publish', 'deployment', 'live'].map(name => [name, { outcome: 'success' }]));
const updated = { published: 'abc123', deployed: true, updates: ['next: 15.5.28 → 15.5.29'] };

test('notifications require a real update, confirmed deployment and successful live checks', async () => {
  assert.equal(shouldNotifyApplied(updated, 'success', passed), true);
  const silent = [
    [{}, 'success', passed],
    [{ ...updated, deployed: false }, 'success', passed],
    [updated, 'failure', passed],
    [updated, 'cancelled', passed],
    ...Object.keys(passed).map(name => [updated, 'success', { ...passed, [name]: { outcome: 'failure' } }]),
    [updated, 'success', {}],
  ];
  for (const args of silent) {
    assert.equal(shouldNotifyApplied(...args), false);
    await notifyApplied(...args, 'owner/repo', 'https://example.test/run', () => { throw Error('Silent runs must not contact the issue API'); });
  }
});

test('successful updates use one thread and never notify twice for the same commit', async () => {
  const issues = [], comments = [], writes = [];
  async function api(endpoint, method = 'GET', body) {
    if (method === 'GET') return endpoint.includes('/comments?') ? comments : issues;
    writes.push({ endpoint, body });
    if (endpoint === '/issues') issues.push({ number: 7, ...body, user: { login: 'owner' } });
    else comments.push({ ...body, user: { login: 'github-actions[bot]' } });
  }
  const send = current => notifyApplied(current, 'success', passed, 'owner/repo', 'https://example.test/run', api);
  await send(updated);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].body.title, 'SpiritBible updates applied');
  assert.match(writes[0].body.body, /@owner/);
  await send(updated);
  assert.equal(writes.length, 1);
  await send({ ...updated, published: 'def456', updates: [] });
  assert.equal(writes.length, 2);
  assert.equal(writes[1].endpoint, '/issues/7/comments');
  assert.match(writes[1].body.body, /indirect dependencies/);
  await send({ ...updated, published: 'def456' });
  assert.equal(writes.length, 2);
});

test('a configured notification thread is addressed directly and must be trusted', async () => {
  const previous = process.env.MAINTENANCE_ISSUE_NUMBER;
  process.env.MAINTENANCE_ISSUE_NUMBER = '3';
  try {
    const issue = { user: { login: 'owner' }, body: '<!-- spiritbible-applied-updates -->\n<!-- applied:abc123 -->' };
    const calls = [];
    const api = async endpoint => { calls.push(endpoint); return issue; };
    await notifyApplied(updated, 'success', passed, 'owner/repo', 'https://example.test/run', api);
    assert.deepEqual(calls, ['/issues/3']);
    issue.user.login = 'someone-else';
    await assert.rejects(notifyApplied(updated, 'success', passed, 'owner/repo', 'https://example.test/run', api), /could not be verified/);
  } finally {
    if (previous === undefined) delete process.env.MAINTENANCE_ISSUE_NUMBER;
    else process.env.MAINTENANCE_ISSUE_NUMBER = previous;
  }
});
