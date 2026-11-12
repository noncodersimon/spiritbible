# Weekly maintenance

GitHub Actions runs **Weekly maintenance** every Monday at **07:17 UTC** (07:17 UK winter time, 08:17 UK summer time). It can also be started from the repository's **Actions → Weekly maintenance → Run workflow** page. GitHub schedules can be delayed; this is not an exact-time service.

## What happens

1. Use the Node major selected by `engines.node` in `package.json` and install the committed lockfile.
2. Update direct packages within their existing major version, including exact pins, and refresh compatible transitive dependencies. Node and framework major upgrades are not automatic.
3. Check npm security advisories, available major updates and the official Node support schedule. High/critical advisories, an unsupported Node version or unavailable audit results block publication.
4. Generate the database, run the regression suite, and build the production application.
5. Run Chromium checks against the standalone deployment bundle: successful initial server responses, passage links, search, commentary, related passages, copying, the 73-book canon, social-card metadata and images, install manifest, phone layout and theme controls.
6. Commit **only `package.json` and `package-lock.json`**, provided main has not changed during the checks. Never force-push. Vercel's existing Git integration deploys that commit.
7. Wait for Vercel's status on that exact commit, then check the live website. The live site is also checked on weeks with no updates.

If a deployment or live check fails after publication, the routine raises an issue; it does **not** silently roll back. Inspect the reported dependency commit, restore the previous Vercel deployment if necessary, then correct or revert the dependency change. Failed candidate checks never publish the candidate.

## Quiet notifications

Successful checks and successful automatic updates produce **no issue or comment**. The Actions run summary and its `maintenance-report` artifact record what changed; artifacts are retained for 30 days.

One issue named **SpiritBible maintenance needs attention** is created when action is needed. It mentions `@noncodersimon`. An unchanged set of findings produces no repeated comments. Changed findings update that issue and add a notification; a subsequent clean run closes it. Major upgrades and unresolved security advisories are included in the findings. An issue notification depends on the recipient's GitHub notification preferences.

This workflow cannot send messages into a ChatGPT conversation. It also cannot change personal GitHub notification preferences.

To reduce unrelated GitHub noise while preserving these alerts:

- On the repository, choose **Watch → Participating and @mentions** rather than **All Activity**. Do not choose **Ignore**, which can suppress important mentions too.
- In **Settings → Notifications**, review automatic watching for repositories you push to and teams you join.
- For Actions notifications, select failed-workflow notifications if you want GitHub's own fallback alerts. These can repeat for recurring failures; the maintenance issue itself is deduplicated.

## Operational limits

The workflow needs GitHub Actions enabled, repository-content write permission and issue write permission for `GITHUB_TOKEN`. Vercel must remain connected to main and report deployment statuses. The first manual run should verify these permissions and the bot-commit deployment path. No Vercel secret is required for the existing Git integration.

Vercel manages its infrastructure and patch versions of the selected Node major. Selecting a new major remains a repository/project maintenance task. The routine flags Node approaching end of support and new package majors; it does not change Vercel project settings or establish a vendor's support commitment for every package.

Next.js 15 pins an older PostCSS release. The reviewed `overrides.next.postcss` entry keeps this dependency on patched PostCSS 8 releases and is covered by the production build and browser checks. Revisit/remove this override when upgrading Next.js to a major that supplies a patched version itself.

Public repositories can have scheduled workflows disabled after 60 days without repository activity. Check the Actions page if reports stop. If Actions itself is disabled or the runner never starts, the workflow cannot create its own alert. GitHub account notification settings and GitHub service availability are outside this routine's control.

## Local verification

```sh
npm ci
npm run data:build
npm test
npm run build
npx playwright install chromium
npm run test:smoke
```

The smoke command copies public/static assets into Next.js's standalone output, then starts and stops that packaged server on port 3107. To inspect the live reader without changing it, set `SMOKE_BASE_URL=https://spirit.digitelos.co.uk`. In the managed cloud environment, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` can use the installed browser. Reports and screenshots are kept in ignored `.maintenance/` files.

The candidate server disables experimental CommonJS-to-ESM loading to match the stricter hosting behaviour that exposed the initial jsdom incompatibility. Commentary is sanitised with DOMPurify in the browser; jsdom is a test-only dependency and must not enter the deployed reader bundle.

`maintenance:prepare` changes dependency manifests; use a clean checkout. `maintenance:audit` records advisories and support findings. Publication and issue reporting are separate authenticated workflow steps; install, build and browser steps do not receive `GH_TOKEN`.
