const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const directory = '.maintenance';
const stateFile = path.join(directory, 'state.json');
const issueTitle = 'SpiritBible maintenance needs attention';
const marker = '<!-- spiritbible-weekly-maintenance -->';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function save(state) { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n'); }
function state() { return fs.existsSync(stateFile) ? read(stateFile) : { warnings: [] }; }
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit', ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status ?? result.error?.message}).${options.capture ? '\n' + result.stderr : ''}`);
  return result.stdout?.trim();
}
function major(version) { return Number(String(version).match(/\d+/)?.[0]); }
function assertCompatible(before, after) {
  for (const section of ['dependencies', 'devDependencies']) {
    assertSameKeys(before[section], after[section]);
    for (const [name, version] of Object.entries(before[section] || {})) {
      if (major(version) !== major(after[section][name])) throw new Error(`Major upgrade blocked: ${name}`);
    }
  }
  const withoutDependencies = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['dependencies', 'devDependencies'].includes(key)));
  if (JSON.stringify(withoutDependencies(before)) !== JSON.stringify(withoutDependencies(after))) throw new Error('The updater changed more than dependency versions.');
}
function assertSameKeys(a = {}, b = {}) {
  if (JSON.stringify(Object.keys(a).sort()) !== JSON.stringify(Object.keys(b).sort())) throw new Error('The updater added or removed direct dependencies.');
}
async function json(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}${new URL(url).pathname}`);
  return response.status === 204 ? null : response.json();
}
function github(endpoint, method = 'GET', body) {
  if (!process.env.GH_TOKEN || !process.env.GITHUB_REPOSITORY) throw new Error('GitHub Actions credentials are required for this step.');
  return json(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${endpoint}`, {
    method, headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function prepare() {
  const before = read('package.json');
  const current = { before, base: run('git', ['rev-parse', 'HEAD'], { capture: true }), warnings: [] };
  save(current);
  run('npm', ['exec', '--no', '--', 'ncu', '--target', 'minor', '--upgrade']);
  assertCompatible(before, read('package.json'));
  // Also refresh compatible transitive dependencies, even when direct pins did not move.
  run('npm', ['update', '--no-audit', '--no-fund']);
  assertCompatible(before, read('package.json'));
  const after = read('package.json');
  current.updates = [];
  for (const section of ['dependencies', 'devDependencies']) for (const [name, version] of Object.entries(before[section] || {})) {
    if (version !== after[section][name]) current.updates.push(`${name}: ${version} → ${after[section][name]}`);
  }
  current.changed = Boolean(run('git', ['diff', '--name-only', '--', 'package.json', 'package-lock.json'], { capture: true }));
  save(current);
}

async function audit() {
  const current = state();
  current.warnings = [];
  delete current.error;
  const result = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8' });
  let report;
  try { report = JSON.parse(result.stdout); } catch { throw new Error('npm audit did not return a valid report.'); }
  fs.writeFileSync(path.join(directory, 'audit.json'), JSON.stringify(report, null, 2) + '\n');
  if (result.error || report.error || !report.metadata?.vulnerabilities) throw new Error('The security audit could not complete. See audit.json.');
  current.vulnerabilities = report.metadata.vulnerabilities;
  const advisories = Object.entries(report.vulnerabilities || {}).map(([name, value]) => `${name} (${value.severity})`).sort();
  if (advisories.length) current.warnings.push(`Unresolved dependency advisories: ${advisories.join(', ')}. See the audit report before deciding how to address them.`);

  const latest = JSON.parse(run('npm', ['exec', '--no', '--', 'ncu', '--target', 'latest', '--jsonUpgraded'], { capture: true }));
  const pkg = read('package.json'), dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  // Patch releases within an already-flagged new major are the same review task,
  // not a new reason to notify the owner every week.
  const majors = Object.entries(latest).filter(([name, version]) => major(version) > major(dependencies[name])).map(([name, version]) => `${name}: ${major(dependencies[name])}.x → ${major(version)}.x`).sort();
  if (majors.length) current.warnings.push(`Major upgrades require review (not installed automatically): ${majors.join('; ')}.`);

  const schedule = await json('https://raw.githubusercontent.com/nodejs/Release/main/schedule.json');
  const selected = `v${major(pkg.engines.node)}`, release = schedule[selected];
  if (!release || !release.lts) throw new Error(`Cannot establish the LTS support dates for ${selected}.`);
  const now = Date.now(), remainingDays = Math.ceil((Date.parse(release.end) - now) / 86400000);
  if (now < Date.parse(release.lts)) current.warnings.push(`${selected} has not entered LTS yet (scheduled ${release.lts}).`);
  if (remainingDays < 90) current.warnings.push(`${selected} support ends ${release.end}; select a supported LTS version in package.json and verify Vercel before then.`);
  current.node = { selected, version: process.version, lts: release.lts, end: release.end };
  save(current);
  if (remainingDays < 0 || major(process.version) !== major(pkg.engines.node)) throw new Error('The selected Node runtime is unsupported or does not match package.json.');
  if (current.vulnerabilities.high || current.vulnerabilities.critical) throw new Error('High or critical security advisories remain; automatic publication is blocked.');
}

async function publish() {
  const current = state();
  if (!current.changed) { console.log('No dependency updates to publish.'); return; }
  if (!current.before || !current.base) throw new Error('The preparation record is missing.');
  assertCompatible(current.before, read('package.json'));
  const changed = run('git', ['diff', '--name-only'], { capture: true }).split('\n').filter(Boolean);
  if (changed.some(file => !['package.json', 'package-lock.json'].includes(file))) throw new Error('Unexpected tracked changes; nothing will be published.');
  const remote = await github('/git/ref/heads/main');
  if (remote.object.sha !== current.base) throw new Error('main changed during the checks; rerun maintenance against the new revision.');
  run('git', ['config', 'user.name', 'github-actions[bot]']);
  run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  run('git', ['add', 'package.json', 'package-lock.json']);
  run('git', ['commit', '-m', 'Update dependencies after weekly maintenance checks']);
  run('gh', ['auth', 'setup-git']);
  run('git', ['push', 'origin', 'HEAD:main']); // A concurrent change is rejected; never force-push.
  current.published = run('git', ['rev-parse', 'HEAD'], { capture: true });
  save(current);
  console.log(`Published ${current.published}; waiting for Vercel before reporting success.`);
}

async function deployment() {
  const current = state();
  if (!current.published) return;
  for (let attempt = 0; attempt < 60; attempt++) {
    const status = await github(`/commits/${current.published}/status`);
    const vercel = status.statuses.filter(item => /^Vercel(?:\s|$)/i.test(item.context));
    if (vercel.some(item => ['error', 'failure'].includes(item.state))) throw new Error('Vercel reported a failed deployment. The dependency commit needs review.');
    if (vercel.length && vercel.every(item => item.state === 'success')) {
      current.deployed = true; save(current); return;
    }
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  throw new Error('No successful Vercel deployment was confirmed within 15 minutes. Check the Git integration and deployment status.');
}

function attentionFingerprint(problems) { return createHash('sha256').update([...new Set(problems)].sort().join('\n')).digest('hex'); }

async function report() {
  const current = state();
  const steps = JSON.parse(process.env.MAINTENANCE_STEPS || '{}');
  const failed = Object.entries(steps).filter(([, step]) => ['failure', 'cancelled'].includes(step.outcome)).map(([name]) => name);
  const problems = [...(current.warnings || [])];
  if (current.error) problems.push(current.error);
  if (process.env.MAINTENANCE_JOB_STATUS !== 'success') problems.push(`Checks did not finish successfully${failed.length ? ': ' + failed.join(', ') : ''}.`);
  if (current.published && failed.some(name => ['deployment', 'live'].includes(name))) problems.push(`The failure followed dependency commit ${current.published}.`);
  const runUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const summary = `## Weekly maintenance\n\n${current.published ? `Dependency commit: ${current.published}. Vercel confirmed: ${current.deployed ? 'yes' : 'no'}.` : 'No dependency commit was published.'}\n\n${(current.updates || []).map(value => '- ' + value).join('\n') || 'No direct dependency version changes.'}\n\n${problems.length ? problems.map(value => '- ' + value).join('\n') : 'All checks passed. No action is needed.'}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  // Only issues made by this workflow are touched. An unchanged problem stays quiet.
  const issues = await github('/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100');
  const existing = issues.find(issue => !issue.pull_request && issue.title === issueTitle && issue.body?.includes(marker));
  if (!problems.length) {
    if (existing) await github(`/issues/${existing.number}`, 'PATCH', { state: 'closed', state_reason: 'completed' });
    return;
  }
  const fingerprint = attentionFingerprint(problems), stamp = `<!-- fingerprint:${fingerprint} -->`;
  if (existing?.body?.includes(stamp)) return;
  const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
  const body = `${marker}\n${stamp}\n@${owner}, this routine needs attention.\n\n${summary}\n[Open the run and its maintenance-report artifact](${runUrl}).\n\nCompatible updates are published only after the candidate passes its checks. If a deployment or live check failed after publication, inspect the recorded commit and Vercel deployment; there is no automatic rollback.\n`;
  if (existing) {
    await github(`/issues/${existing.number}`, 'PATCH', { body });
    await github(`/issues/${existing.number}/comments`, 'POST', { body: `@${owner}, the maintenance findings have changed. Please see the updated issue and [run report](${runUrl}).` });
  } else await github('/issues', 'POST', { title: issueTitle, body });
}

module.exports = { assertCompatible, attentionFingerprint };
if (require.main === module) {
  const actions = { prepare, audit, publish, deployment, report };
  const action = actions[process.argv[2]];
  if (!action) throw new Error('Choose prepare, audit, publish, deployment or report.');
  action().catch(error => {
    const current = state(); current.error = error.message; save(current);
    console.error(error.message); process.exitCode = 1;
  });
}
