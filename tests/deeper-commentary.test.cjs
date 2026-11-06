const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validateDeeperReview} = require('../scripts/deeper-review.cjs');

test('supplementary commentary matches its evidence, import payload and stable original note IDs', () => {
  const result = validateDeeperReview(undefined, undefined, {historical: true});
  const coverage = require('../drafts/deeper-commentary/coverage.json');
  assert.equal(result.newNotes, coverage.newNotes);
  assert.equal(result.totalNotes, coverage.totalNotes);
  assert.equal(result.connections, coverage.totalConnections);
});
