# HPI-QA.3 — Release verification and safety-gate evidence (22 November 2026)

**Classification:** technical engineering assurance, not independent accessibility or scientific certification. **Decision:** the *automatable* release gate is demonstrated; genuine human assistive-technology testing remains OPEN. Nothing in this record authorises fieldwork, public AI inference, collecting personal case records, grant applications or legal operations.

## Last verified published production baseline (before this change)

| Signal | Independent observation | Status |
| --- | --- | --- |
| GitHub main revision | `70d9806431f61a0c5176790cd92f38920493fe99`, merged [PR #108](https://github.com/svtmzt/human-prosperity-initiative/pull/108) | Verified 22 Nov |
| Post-merge Actions | [run #44939379816](https://github.com/svtmzt/human-prosperity-initiative/actions/runs/44939379816): `website-quality` **success**, `browser-accessibility` **success**, `public-operations-watch` *skipped by design on push* | PASS for the two mandatory release jobs |
| Vercel | Commit status `Vercel:success` on that exact SHA; public `/publication.json` also reports exactly `70d9806...` | PASS |
| Core user routes | `/`, `/intelligence`, `/solutions`, `/adopt`, `/systems-lab`, `/status`, all HTTP 200 from the public site on 22 Nov | PASS for HTTP only |
| Public AI safety | `/platform-ai-status.json`: `productionInference:false`, `publicHostedInference:"disabled"`, `publishedAiGeneratedContent:0` | PASS; public inference **not activated** |
| Historical CircleCI | GitHub legacy status context still reports `CircleCI Pipeline:error` on the published SHA because CircleCI has no plan credits | **NOT a current required check**. Superseded by ADR-0005 and GitHub Actions, not a reason to weaken required protections |

**The above are observations of the existing production release, not a guarantee for this PR's eventual merge SHA.** Run the gates again on every proposed new SHA.

## Implementation in the current QA.3 change

The existing read-only `scripts/release-preflight.mjs` now verifies **all** of the following against the *same exact 40-character commit SHA*, and fails closed otherwise:

1. GitHub API `/branches/main` confirms the expected commit is the present main head.
2. Check-runs from the **GitHub Actions** app show latest *executed* `website-quality` and `browser-accessibility` both successful; a scheduled skipped/neutral job never displaces a real release result, and an actual newer failure still blocks.
3. Vercel commit status on that SHA is `success`.
4. The HPI-only Vercel deployment candidate URL serves a `publication.json` with exactly the expected SHA.
5. Its `platform-ai-status.json` confirms no public model inference or published AI-generated claims.
6. The request is **read only**. If the optional `GITHUB_TOKEN` is present, only the canonical GitHub repository API receives it. The HPI site and Vercel candidate **never receive** the token; the returned report contains no credential.

The checker rejects unrelated `*.vercel.app` project names rather than treating every Vercel URL as an HPI deployment. Its output `readyForHumanPromotion` is **only an operator preflight**, not an actual Vercel alias hold, an automatic promoter, a production-safe rollback procedure or any authority to publish unreviewed research.

```bash
# Run after a merge, using the exact merged main commit:
GITHUB_TOKEN="${GITHUB_TOKEN}" node scripts/release-preflight.mjs \
  "<exact-main-sha>" https://human-prosperity-initiative.vercel.app
```

For local public checks without a GitHub token, GitHub API may return 403 (rate limiting or visibility); this is **UNKNOWN/FAIL**, not license to mark release as passed. The verified GitHub app/Actions checks and human authorisation must be consulted instead. Never put a token in the command arguments, tracked file, browser or report.

## Automated checks of these safeguards

- New tests verify exact main SHA, fail-closed pending/missing/failed checks and incorrect publication SHA, unrelated project Vercel host rejection, AI status false/disabled/zero, GitHub-only ephemeral credential routing, and no outbound call to a user-specified alternate repository.
- Local `npm run check` passed **245/245** tests on the QA.3 branch head after the checker changes, before PR publication (Node 26; CI pins Node 22). This is engineering test evidence, **not the post-merge production result**.
- Existing browser QA runs automated WCAG-tagged scans and keyboard/responsive checks. It is not a genuine VoiceOver/NVDA/TalkBack human session.

## Honest disposition of HPI-QA.3 and WEB-01

- **HPI-QA.3-T01 technical release verification:** completed for the prior production baseline, with a maintained fail-closed tool and new regression coverage. The former CircleCI-specific task title is historically superseded by ADR-0005; record it as GitHub Actions + Vercel + public SHA, not pretend CircleCI passed.
- **HPI-QA.3-T02 real assistive-technology use:** **NOT DONE**, cannot be completed by an agent, and cannot be inferred from axe/Chromium. Assign an actual qualified tester with permitted evidence handling and retest the final public SHA.
- **Deployment alias hold / negative failure promotion test:** **NOT DEMONSTRATED**. No changes to Vercel release settings or permissions were made; separately approved safe deployment-control work may be needed.
- **Project provider-billed costs/quotas and actual notifications:** outside this technical release verification and **NOT CERTIFIED**; public GitHub activity is not a spend figure.
- **Scientific, ethical, rights and fieldwork authorisation:** all unchanged and OPEN.

See [WEB-01 acceptance matrix](/library/docs/web-01-final-acceptance), [current release runbook](/library/docs/web-01-release-and-operations), [CI migration decision](/library/docs/decisions/0005-ci-github-actions), [AI gate #101](https://github.com/svtmzt/human-prosperity-initiative/issues/101) and [HPI-QA umbrella #102](https://github.com/svtmzt/human-prosperity-initiative/issues/102).

**Publication rule:** when this document is part of a PR, its exact release-check test claims apply to **prior** verified production only; the new version must itself pass the required jobs on PR head and be verified post-merge before it can be called publicly released.
