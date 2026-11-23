# HPI-AI.6-T07 — Independent human research-review intake and blind practice

**Prepared:** 23 November 2026. **Status:** engineering preparation, NOT independent scientific validation, recruitment, source-rights approval or permission to publish AI-generated science.

The existing 46 internally curated HPI evaluation cases are familiar to the project. Even if reviewed again, **they cannot be claimed as independent held-out gold references**. The independent scientific requirement is at least 100 **new**, independently adjudicated cases for each of the five tasks, at least 500 task-case references total, supported by original source provenance, licensed reuse, preregistered sampling and authentic qualified human judgements. No such externally verified cases have been recorded yet. The first local practice export admitted **36 of 46 internal examples** after source/privacy screening and conservatively withheld the other **10**. This is a training-only export, not a claim that the ten source records are invalid.

| Research task | Internal examples (practice only) | New independent references required |
| --- | ---: | ---: |
| Claim extraction | 21 | 100 |
| Study design/source classification | 8 | 100 |
| Mechanism tagging | 8 | 100 |
| Evidence-gap detection | 3 | 100 |
| Contradiction and comparability | 6 | 100 |
| **Total** | **46, excluded from gold** | **500 minimum** |

## 1. Prepare a training-only blind pack on the authorised Mac

- Run: npm run ai:science:reviewers -- init
- Run: npm run ai:science:reviewers -- practice
- Run: npm run ai:science:reviewers -- audit

The commands respectively create an empty, private human-review intake, export a blinded **practice-only** version of already known HPI public metadata, and report aggregate administrative readiness. Source texts are screened for sensitive identifiers, local-only licence classifications and prompt-injection content. The packet does not expose HPI reference labels, model answers, scores or generated conclusions. The output is placed exclusively under the Git-ignored qa-artifacts/ai-independent-review directory with restricted file permissions. The commands send **no** model requests and never consume OpenRouter credits.

## 2. Separate actual human scientific responsibilities

A suitably qualified external scientific methods lead must independently approve the analysis plan, lawful source selection, source licences, geographic/population strata, design types, outcome definitions and statistical admission criteria **before any blinded hold-out is scored**. Retain authentic source URL/DOI, version, access date, SHA-256, evidence-rights proof, population, comparator, period, unit, denominator and null/adverse result status.

Recruit and verify **two distinct qualified independent reviewers** who have no unmanaged conflicts with HPI or the evaluated models. They score each newly sourced case independently, blinded both to model results and each other's decisions. Reviewer identities and disclosures belong in protected human-governed records; technical outputs should use anonymised pseudonyms and digests. A separate independent human adjudicator resolves differences only after both assessments are sealed. Unresolved or excluded cases must be explicitly counted, never silently treated as correct.

Use prespecified task-specific rubrics: claim evidence/quote/effect/direction/denominator; observational-versus-causal design; observed-versus-hypothesised mechanism; missing data; incompatible population/timeframe/units. Register severity categories and stop rules for fabricated effects, reversal of null or adverse findings, unsupported causal inference and privacy/licensing violations.

## 3. What the new intake verifier can—and cannot—establish

The intake verifier checks the **structure** of records: unique case IDs, 100 new cases per task, licence links and source hashes, declared independent origin, confidentiality flags, independent qualification attestations for two different reviewers, sealed review hashes after preregistration, independent adjudication after reviews, and missing/uncertain sample counts.

This is a fail-closed administrative tool, **not an identity verification service**. A flag, URL or hash can be fabricated; qualified humans must authenticate records and the scientific plan outside this software. Even a structurally complete packet is explicitly marked independentScientificValidation=false, publicationAuthorised=false, externalEvidenceVerificationStillRequired=true.

## 4. Next milestones

- **Engineering ready:** blinded training pack; private empty intake; task-specific rubric metadata; source/privacy screening; independent administrative readiness checks; regression tests.
- **Human/scientific still open:** external reviewer recruitment and qualification; preregistered source selection, rights and hold-out; 500+ task-case expert adjudications; auditable errors and Wilson intervals; independent method/ethics review and an attributable receipt.
- **Governance:** T07 IN PROGRESS but NOT validated. T08 has only a tightly capped exploratory paid-model pilot; actual scientific model admission remains open. T09 AI-origin scientific publication remains **NO-GO**.

See [independent review handoff](./hpi-ai6-independent-science-review-handoff-2026-11-22.md) and [paid cloud pilot](./hpi-ai6-paid-scientific-pilot-2026-11-22.md).
