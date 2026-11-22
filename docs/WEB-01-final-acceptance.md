# WEB-01 — Release, cost and assistive-technology acceptance matrix

**Originally prepared:** 6 November 2026 · **Technical revision:** 22 November 2026 · **Status:** *partially implementable*. **WEB-01 remains OPEN** until actual provider configuration and human acceptance are evidenced. This is a publication/operations assurance plan, not proof of a completed independent accessibility audit or deployed automated release hold.

## 1. Exact-commit deployment preflight (implemented as a code-only checker)

Use the read-only script only when the **current merged `main` SHA** and a candidate from the HPI Vercel project are accessible. An optional ephemeral `GITHUB_TOKEN` is used **only** for official GitHub REST metadata (not for Vercel or any site URL). The script also refuses unexpected Vercel project hostnames:

```sh
node scripts/release-preflight.mjs <40-character-merged-SHA> https://<candidate-deployment>.vercel.app
```

It checks **main's exact SHA**, the latest executed `website-quality` and `browser-accessibility` GitHub Actions checks, Vercel status, the candidate's exact `publication.json` SHA and `/platform-ai-status.json` showing public inference disabled and zero AI-generated publications. Missing, failed, pending, mismatched or unsafe results fail closed. The optional built-in GitHub Actions token is never sent to Vercel; it is not stored in the report. Passing means **safe for a responsible human to consider promotion**, not that promotion happened. The script never calls provider write APIs, injects public-page secrets or bypasses CI.

The current GitHub required checks are GitHub Actions `website-quality` and `browser-accessibility` (read as **check-runs**) plus the `Vercel` commit status. The legacy CircleCI `error` status is an **unrequired historical signal**, not a reason to bypass required checks. The latest release on 21 Nov, SHA `70d9806431f61a0c5176790cd92f38920493fe99`, passed all three current checks ([post-merge Actions run](https://github.com/svtmzt/human-prosperity-initiative/actions/runs/44939379816)); the public site served the exact SHA. Passing PR checks does **not itself withhold the production alias after merge**.

**Blocker for unattended release safety:** Review Vercel's applicable **Deployment Checks** integration and plan support using the **current GitHub Actions** check-runs. Observe a **new** merged SHA remain **not publicly promoted** until its post-merge browser check changes from pending to success, and independently observe a failed check not promoted. An approved staged production build/promote workflow is an alternative if an actual hold cannot be implemented. **No post-merge alias-hold experiment has been performed**, so never label that gate complete.

**Do NOT blindly set `github.autoAlias: false`** as a workaround: that removes automatic release behaviour and would leave the live site frozen until a reliable approved promoter is configured. **Do not mark this gate complete** from passing PR checks, preflight logic, Vercel READY or a dashboard setting alone.

Provider reference: [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks).

## 2. Real provider billing and quota monitoring (partial technical tooling only)

The public operations watcher currently exposes public commit-velocity as a **proxy**, never a billed charge. Vercel's authenticated FOCUS charge API can return team-wide records, but the API result is a **bounded sample**. Some records include `Tags.ProjectId`; others are shared/team costs without project attribution. A team amount is **not an HPI spend figure**.

The new **local-only** `scripts/focus-cost-audit.mjs` accepts FOCUS JSON or CSV exports. For JSON, supply a complete **trusted** envelope `{"exportComplete":true,"records":[...]}`. A bare JSON array is automatically **incomplete** and never proves a total. For CSV, only a declared complete export can validate full-period totals; otherwise the script treats it as partial and exits non-zero. Example:

```sh
node scripts/focus-cost-audit.mjs private-complete-focus-export.json prj_qJNfyJL17JNpEiuNlafJPZZKYkMN 5
```

It reports an attributable **known HPI subtotal**, separately counts untagged team charges, refuses unknown currencies and incomplete sources, and warns against a local threshold. It **does not** persist or upload provider financial data; do not commit private exports to GitHub. This is **not** a recurring provider monitor, and a tagged export may not include all resource costs or cover the full billing period: financial review is still required.

**Blocker for real recurring billed-cost/quota alerts:** owner-authorised complete export/API with complete project attribution, a private credential-safe schedule and notification path, an agreed threshold and validation against the provider dashboard and billing period. The team shares billing with unrelated projects. Neon resource consumption and the *historical* CircleCI charges/credits require separate verified provider data and must **never** be inferred from Vercel totals or commit count. Do not install paid add-ons or tokens in Git.

## 3. Human assistive technology acceptance (not delegated to automation)

**Current automated checks:** real Playwright Chromium at multiple viewport widths, axe WCAG checks, text zoom-equivalent and typography resizing, ARIA snapshots, keyboard traversal, CI artifacts. This is **not** actual screen-reader speech or OS browser zoom.

**Required human-assisted matrix** (record real tester, consent to share the observation only, date, SHA, device/browser/AT versions and route):
- Screen reader: **VoiceOver + Safari** on iOS or macOS; optionally NVDA + Firefox/Chrome on Windows, or TalkBack + Chrome on Android.
- Routes: `/`, `/roadmap`, `/initiatives/web-01`, `/research`, `/library` and `/contribute`.
- Workflows: start reading at heading, use skip link, traverse navigation, jump through headings and landmark regions, open first-party links, read research metadata and table headings, encounter error/unavailable source states, reach and identify focus order.
- Native browser zoom: 200% and 400% where available; verify text remains understandable, reflow does not hide controls or force both-direction scrolling except justified data tables.
- Screen-reader observations: correct spoken labels, meaningful headings and link purpose, no duplicate confusing title, distinguish pending scientific research from approved outcomes, and reading order consistent with visible layout.
- Record **PASS / FAIL / BLOCKED / NOT TESTED** per check and the evidence of an actual environment session. Synthetic ariaSnapshot outputs alone are **not** acceptance.

**Blocker:** an operator with real assistive technologies must perform and record a session. A qualified independent accessibility review is recommended for a genuinely external sign-off; none is claimed.

## 4. Go/no-go and sequenced roadmap

| Requirement | Technical evidence available | Pending acceptance |
|---|---|---|
| Protected PR checks, exact SHA, Vercel build | Yes (historically enforced, verify new SHA) | Per-release checks still required |
| Source/site post-merge preflight | Script and tests available | Actual promotion hold and positive/negative demonstration |
| Daily read-only monitor and configured alert path | GitHub Actions watch now runs with an ephemeral read-only token (PR #108, successful PR test); historical CircleCI email is not proof of current notifications | Verify **future scheduled execution** and actual notification delivery; no continuous uptime SLA |
| Project billed/quota alerting | Offline FOCUS parser; unassigned costs disclosed | Complete provider data, private recurrence and alerts |
| Automated accessibility | Browser CI and artifacts | Actual human AT/OS-zoom test evidence |
| International privacy/science safeguards | Governance rules for public only | Independent field research ethics is separate, not WEB-01 |

**No automatic re-scoping** of the three open core gates as completed. If the founder later wants to close WEB-01 as *technical-only*, that requires an explicit narrowed acceptance and new independently tracked operational gates. Until then, do not close WEB-01 merely because new scripts/tests are shipped.
