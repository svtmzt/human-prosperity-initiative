# ADR 0005 — Move HPI CI from CircleCI to GitHub Actions hosted runners

**Status:** Accepted by the founder, 16 November 2026.
**Decision scope:** continuous integration only. Supersedes the CircleCI clauses of ADR 0003 and the runbook `docs/ci-self-hosted-mac-runner.md`. It does not change what the checks verify, the Vercel deployment, or any research, ethics or governance gate.

## Context

From 16 November 2026 CircleCI blocked every HPI job before dispatch with `performance-plan-no-credits-available`. That includes jobs targeting the self-hosted Mac runner, because CircleCI requires a positive credit balance even for 0-credit runner compute. PR #105 had passing code (235/235 tests and 1790/1790 browser checks locally) but could not merge, because its required checks never ran.

The self-hosted runner also carried an open security finding: it ran under the founder's admin macOS account.

## Decision

1. Run CI as `.github/workflows/ci.yml` on GitHub-hosted `ubuntu-24.04` runners. These are free for this public repository.
2. Keep the same jobs and commands:
   - `website-quality`: `npm run check` and the RT-01.3 research attestation archive.
   - `browser-accessibility`: Playwright 1.64.1, axe-core 4.14.0 and `scripts/browser-qa.mjs`. It depends on `website-quality`.
   - `public-operations-watch`: a daily scheduled read-only run of `scripts/ops-watch.mjs`.
3. Every job checks out the **exact PR head SHA**, never the synthetic merge commit, and exposes it to the build as `HPI_COMMIT_SHA`. The token is read-only (`contents: read`), no repository secret is used, and `pull_request_target` is not used. Fork PRs therefore run without write access and without secrets.
4. All third-party actions are pinned to full commit SHAs.
5. The required checks on `main` become `website-quality` and `browser-accessibility`, restricted to the GitHub Actions app, plus the `Vercel` commit status. `scripts/ci-checks.mjs` reads those checks for `ops-watch` and `release-preflight`.
6. `.circleci/config.yml` is removed so that two CI systems never report divergent results. It stays in Git history.

## Alternatives considered

- **Wait for the CircleCI plan renewal, or buy credits.** This keeps a paid dependency, leaves merges blocked in the meantime and keeps the runner security finding open.
- **Ask CircleCI about open-source eligibility.** The outcome is uncertain and does not remove the paid dependency.
- **Bypass the required checks.** Rejected. Required checks must not be bypassed (AGENTS.md).

## Consequences

- GitHub Actions minutes cost nothing for this public repository, so the CI gate no longer depends on a credit balance.
- The founder's Mac is no longer part of HPI CI. The admin-account finding no longer applies to HPI, although other portfolio projects may still use that runner.
- Artifacts are kept for 30 days in GitHub Actions rather than in CircleCI.
