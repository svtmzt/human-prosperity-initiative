# HPI CI on the self-hosted Mac runner

**Status, 16 November 2026:** HPI's CircleCI configuration targets the existing machine-runner resource class **`svtmzt/m4-pro-mac`**. That class was already registered for the portfolio under the MDR-06 pilot, and between 13 and 14 November it ran jobs from five other repositories at 0 credits. A job log from that period shows macOS 26.6.2 on arm64 and an isolated Node.js 22.16.0 in the runner account. HPI adds no new resource class and no new runner registration. Whether HPI jobs actually run on the Mac and report to GitHub is recorded in PR #105; see [Verification](#verification).

## Architecture

```
GitHub push / PR → CircleCI orchestration (cloud control plane)
   → machine runner on the founder's Mac (svtmzt/m4-pro-mac)
      website-quality: exact-SHA checkout → isolated Node 22 → npm run check → research attestations
      browser-accessibility: exact-SHA checkout → npm run build → pinned Playwright 1.64.1 + axe 4.14.0 → Chromium QA
   → CircleCI job results → GitHub statuses `ci/circleci: website-quality`, `ci/circleci: browser-accessibility`
   → merge only when both and Vercel pass on the same SHA → Vercel deploys main
```

- **What still uses CircleCI cloud:** orchestration, logs, test results and artifact storage. Storage is billed in credits, so stored artifacts are limited to the test-result XML, the research-pipeline attestations and the browser report JSON. There is no workspace transfer and no full `dist` upload.
- **No hosted fallback:** nothing in the config targets CircleCI-hosted Docker or macOS compute.
- **When the Mac is asleep or offline:** jobs wait in the CircleCI queue. No status turns green, so the PR stays blocked.

## Why the hosted jobs failed

On `e5a5453`, `e9e0a66` and `c896ee9`, `website-quality` failed before its first step. It had no start time and only CircleCI's synthetic "Task information unavailable" step, so it is not a code failure. The organisation's usage export for 1–16 November shows about **119,600 credits** across all portfolio projects: about 115,300 compute and 4,300 storage. HPI accounts for about 8,300.

This strongly suggests the organisation's hosted-compute credits or plan limit are exhausted. It is **not confirmed**: the plan's balance and allowance are not visible to this session's tools. Self-hosted runner minutes are not billed as compute, but CircleCI requires an account in good standing. If runner jobs also never start, the cause is account-level and only the account owner can resolve it, for example when credits renew.

## Security

- **Forks:** HPI is public. Forked pull requests must not run on the personal Mac.
  - **Primary control:** CircleCI → Project Settings → Advanced → *Build forked pull requests* must be **off**. Leave *Pass secrets to builds from forked pull requests* off as well.
  - Each job also refuses to continue when CircleCI's fork variables (`CIRCLE_PR_USERNAME` / `CIRCLE_PR_REPONAME`) are set. This is only defence in depth, because a fork could edit the config.
- **No credentials:**
  - The checkout uses anonymous HTTPS for the exact SHA; no SSH keys are used.
  - The job `PATH` is limited to the runner's isolated Node plus system directories.
  - npm and Playwright caches live in the runner account (`~/.cache/hpi-ci-*`).
  - HPI CI needs no secrets; no OpenRouter key or production credential is available to jobs.
- **Least privilege:** the runner should run as a dedicated, **non-admin** macOS account, with no access to the founder's browser profiles, keychain, SSH keys or documents.
  - Each job prints the account name and warns if it is in the `admin` group.
  - Check the first HPI job log. If the warning appears, move the runner service to a dedicated standard user before relying on it.
- **Disk:** the runner volume was 88% full on 13 November (55 GB free). Each job prints `df`. The Playwright Chromium cache adds about 150 MB once.

## Operating the runner

The runner is CircleCI Machine Runner 3 for macOS, installed under MDR-06. The commands below follow CircleCI's documented layout; check the installed paths against [CircleCI's macOS runner guide](https://circleci.com/docs/runner/install-machine-runner-3-on-macos/), because they were not verifiable from this session.

| Task | How |
|---|---|
| Online? | CircleCI web app → Self-Hosted Runners → `svtmzt/m4-pro-mac` (last seen), or a queued HPI job that starts |
| Start / stop | `launchctl` load/unload of the runner's LaunchAgent/LaunchDaemon plist (e.g. `com.circleci.runner`) |
| Logs | Job logs in CircleCI. Agent log under `~/Library/Logs/` (e.g. `com.circleci.runner.log`) |
| Retry a job | CircleCI UI → workflow → *Rerun failed jobs*. Never push empty commits to retrigger |
| After reboot | The launchd service starts at login (agent) or boot (daemon). Verify it shows as online |
| Sleep | A sleeping Mac takes no jobs. For long QA sessions use `caffeinate -s` or plug in power. Jobs wait meanwhile |
| Pause HPI builds | Stop the runner service. HPI jobs queue and are never answered by hosted compute |
| Update | Upgrade the runner with the documented package manager or installer, then restart the service |
| Roll back to hosted CI | Revert `.circleci/config.yml` to `c896ee9`'s version (Docker `cimg/node:22.11` and the Playwright image). This only works when hosted credits are available |

## Scheduled production watch

`public-operations-watch` (daily, read-only) now also targets the Mac. This is a trade-off: while the Mac is offline, the daily check waits instead of running. With hosted credits exhausted it could not run at all, so the Mac is the better option for now.

Production freshness stays independently visible at `/status`, which compares the live revision with GitHub `main` in the browser. Restore a hosted schedule if a credit allowance is available and daily monitoring matters more than the cost (about 2 credits a day).

## Reusing this for other portfolio repositories

1. Reuse `svtmzt/m4-pro-mac`; do not register another class or runner for the same Mac.
2. Use `machine: true` with `resource_class: svtmzt/m4-pro-mac`, and the isolated Node path check from this config.
3. Use an exact-SHA HTTPS checkout and no secrets in CI.
4. Keep the existing job names, so required GitHub contexts do not change.
5. Keep artifacts minimal, and prefer rebuilding over workspace transfer.
6. Turn off forked-PR builds before the first runner job of any public repository.
7. Record the change against GOV-01 #142.

## Verification

See PR #105 for the exact SHAs, CircleCI job links and GitHub statuses. Do not treat any of these as interchangeable:
- local commands passing;
- runner installed;
- a job dispatched to the Mac;
- the status reported to GitHub;
- merge authorised;
- production verified.
