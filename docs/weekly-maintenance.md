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

If a deployment or live check fails after publication, the run fails and records the problem in its report; it does **not** silently roll back or send an update-applied notification. Inspect the reported dependency commit, restore the previous Vercel deployment if necessary, then correct or revert the dependency change. Failed candidate checks never publish the candidate.

## Quiet notifications

The [**SpiritBible updates applied** issue](https://github.com/noncodersimon/spiritbible/issues/3) is a single notification thread. The workflow addresses issue #3 directly and mentions `@noncodersimon` there only after it has published a dependency commit, Vercel has confirmed its deployment, and the live-site checks have passed. Each commit is reported once, even if the reporting step is retried. Direct changes are listed; lockfile-only updates are described as indirect dependency updates.

No-change runs, warnings, candidate failures, failed deployments and failed live checks produce **no issue or comment**. Their details remain in the Actions summary and `maintenance-report` artifact (retained for 30 days). The old **SpiritBible maintenance needs attention** issue is no longer updated by the routine. This is the owner's preference for update-applied notifications only; a failure therefore requires checking the Actions report rather than expecting a maintenance alert.

This workflow cannot send messages into a ChatGPT conversation or change personal GitHub notification preferences. GitHub's own Actions emails are independent of the issue notifications.

To receive these messages without the development-failure emails:

- In **Settings → Notifications**, turn **Actions** notifications off.
- Enable **Participating, @mentions and custom**, choosing email or web/mobile delivery as preferred.
- On the repository, use **Watch → Participating and @mentions**, rather than **All Activity** or **Ignore**.
- Follow the **SpiritBible updates applied** thread. Unsubscribe from unrelated noisy issue/PR conversations if needed; the delivery preferences are account-wide and do not isolate this one workflow automatically.

Committing or pushing code under `noncodersimon` does not itself create an `@mention`. Explicit mentions and subscribed conversations can still create notifications, so this configuration suppresses Actions noise rather than promising to suppress every other GitHub notification.

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
