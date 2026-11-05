// Compatibility entry point: regenerate all derived data from the JSON sources.
// Stop the app before running this; restart it afterwards.
const { buildData } = require('./build-data.cjs');
const result = buildData();
console.log(`Built ${result.verses} verses and ${result.notes} notes: ${result.target}`);
if (result.blankVerses) console.warn(`Editorial review needed: ${result.blankVerses} blank verse records preserved.`);
