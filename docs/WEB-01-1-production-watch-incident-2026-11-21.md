# WEB-01.1 — GitHub Actions daily production-watch incident and remediation (21 November 2026)

**Status:** evidenced root cause; repair proposed in the accompanying PR. **A live successful scheduled run after release is not yet evidenced by this report.** Public HPI website serving status and CI monitor health are different things.

## Evidence from actual run logs

| Run (UTC) | Observed failure | Meaning |
| --- | --- | --- |
| [20 Nov 2026 scheduled run #44764652998](https://github.com/svtmzt/human-prosperity-initiative/actions/runs/44764652998) | GitHub public REST `GET /commits/main` returned HTTP 403 | Anonymous API requests may be rate limited/denied; the production site itself was not reported down |
| [21 Nov 2026 scheduled run #44915572391](https://github.com/svtmzt/human-prosperity-initiative/actions/runs/44915572391) | Site routes and published/main SHA matched; Vercel was success; `website-quality` and `browser-accessibility` were returned as `missing` by the unauthenticated check-runs query | A misleading monitor failure due to missing GitHub check-run visibility, **not** proof that the release checks failed |

The previous release checks on merge `5a79f6312360827233ec556adf2e4a82b189059b` had succeeded; public Vercel served the exact revision. The **monitor failed closed**, correctly avoiding a false green, but made the daily service-health signal noisy and unusable for repeated days.

## Remedy implemented in this PR

- The `public-operations-watch` job now requests only GitHub's existing **ephemeral built-in token**, not a personal access token or paid monitoring provider.
- Job permissions are explicitly **`contents: read`, `checks: read`, `statuses: read`**. GitHub checkout still has credentials persistence disabled. The token is passed **only to the scheduled/read-only operations-watch step**, not to the browser, deployment build or frontend files.
- `scripts/ops-watch.mjs` attaches `Authorization: Bearer` **only for the canonical GitHub REST domain/path**; website and other hosts never receive it. Requests and error output do not log the token.
- `tests/ops-watch.test.mjs` adds synthetic-token scope assertions and ensures genuinely missing required checks still **fail closed**.
- The read-only monitor also runs for PRs to validate the authenticated monitoring path before merging; scheduled daily runs remain in place, without paid services.

## Boundaries and operator follow-up

- Does **not** set up email/SMS/push notifications; a failing GitHub workflow is not a guaranteed alert. A real notification channel requires actual approved recipient and account settings.
- Does **not** supply Vercel/Neon provider billed usage or cost-limit information. Public commit count stays an *activity proxy*, not billable usage; no invented recurring cost alert.
- Does not change required release gates, access to source secrets, GitHub repository permissions, production data or independent accessibility certification.
- Validate `website-quality`, `browser-accessibility`, `public-operations-watch` and `Vercel` at exact PR SHA. Then verify post-merge production SHA, and a *future real scheduled execution* with proper read-only check metadata; do not mark that future event as completed prematurely.
- If GitHub API 403/missing checks recurs with the token, inspect actual response and job permissions. **Never suppress required check failures or downgrade them to success merely because the API is unavailable.**

The [WEB-01 issue](https://github.com/svtmzt/human-prosperity-initiative/issues/9) remains open for independent manual AT acceptance, actual provider-attributed cost/quota monitoring, and authorised post-merge promotion. The existing site is live; human field research remains NO-GO.
