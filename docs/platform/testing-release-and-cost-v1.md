# Testing, release, infrastructure and cost V1

**Applies to:** the Global Prosperity Platform release (HPI-SCALE), 16 November 2026, under HPI [AGENTS.md](https://github.com/svtmzt/human-prosperity-initiative/blob/main/AGENTS.md) and HubOS GOV-01.

## Local checks (run before any push)

```
npm run check                  # build + research verifications + all unit tests
npm run research:platform:verify
npm run ai:status
```

Browser QA (Chromium + axe), as CircleCI runs it:

```
npm install --no-save --no-package-lock --ignore-scripts playwright@1.64.1 @axe-core/playwright@4.14.0
node scripts/browser-qa.mjs
```

In environments with a preinstalled Playwright, only `@axe-core/playwright` needs installing, with `--no-save`.

## What the tests cover

- **Data and architecture:** contract validation, referential integrity, provenance and declared missingness, duplicates, incompatible units, rate arithmetic (source version drift), rights classification, retraction handling, deterministic exports, CSV formula-injection guard.
- **Intelligence:** comparability verdicts, refused rate derivation, stage coverage, no ranking or score fields, consistency audit.
- **Solutions:** receipt as primary outcome, maturity gating, synthetic labelling, funnel monotonicity, sample-size correctness.
- **Adoption:** empty adoption/partnership registers, evidence requirements, resource licences, downloads present.
- **Systems Lab:** identities, zero and negative scenarios, bounds, monotonicity, determinism, sensitivity.
- **AI:** disabled state, invalid output, unsupported citations, missing evidence and abstention, prompt injection, provider unavailability, rate limits and budgets, paid-host refusal, no false success.
- **Integration (browser):** every new route at four viewports, axe WCAG 2.2 AA, no horizontal overflow, keyboard focus, interactive explorer, comparison check, model run and readiness self-check.

## Release sequence

1. Local checks pass. 2. Commit and push the feature branch once. 3. Open a pull request. 4. CircleCI `website-quality` and `browser-accessibility` and the Vercel Preview must pass on the exact head SHA. 5. Merge only through the protected workflow. 6. Verify the production revision through `/publication.json` or the daily operations watch. 7. Update GitHub issues and the HubOS pending manifest.

Never bypass a failing check; if quota or permission blocks release, keep the branch and document the blocker.

## Infrastructure and cost

| Resource | Action in this release | Cost impact |
|---|---|---|
| GitHub repository | Reused | None |
| Vercel project `human-prosperity-initiative` | Reused; one Preview per push; no new project; no configuration change | Within Hobby quota if pushes are limited |
| CircleCI pipeline | Reused; no new jobs | Credits for one or two pipeline runs |
| Neon | Not used; no HPI database created | None |
| AI inference | None; disabled by default | None |
| New paid services | None | None |

Rollback: revert the merge commit on `main`; Vercel redeploys the previous static build. No data migration is involved.

## Security review (proportional)

- No secrets in client code or repository; AI keys only from the local environment and never logged.
- CSP unchanged; no inline scripts or styles; new scripts are same-origin; user input rendered with `textContent` only.
- Knowledge-base text rejects markup; all generated HTML is escaped; external links use `rel="noopener noreferrer"`.
- No cookies, analytics or tracking added; the readiness self-check and model run locally.
- No personal or beneficiary data anywhere; the validator rejects fieldwork authorisation.
- Misleading-claim controls: denominators never synthesised, incompatible figures not charted, no rankings, maturity gated by evidence.
