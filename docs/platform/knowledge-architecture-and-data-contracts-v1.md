# Knowledge architecture and data contracts V1 (schema 1.0)

**Status:** implemented and enforced by the build, 16 November 2026. Methods not independently reviewed.

## Domain model

| Entity | File | Key relationships |
|---|---|---|
| Prosperity dimension (5, from F0-03) | `research/platform/taxonomy.json` | Problems → dimensions |
| Problem family | `taxonomy.json` | Groups problems, mechanisms, interventions, solutions |
| Context (jurisdiction) and programme | `contexts.json` | Parent hierarchy (global → country → region → locality); programmes define the five outcome stages |
| Context fact (published figure) | `context-facts.json` | Context, programme, outcome stage; optional numerator/denominator facts |
| Measurement gap | `context-facts.json` | Declares an unmeasured stage, why, and the access gate |
| Evidence record | existing `research/evidence-ledger.csv` + structured extraction | Not duplicated; resolved through the Source Catalogue |
| Evidence claim | `evidence-claims.json` | Evidence record → mechanisms, interventions, problems; direction and endpoint level |
| Mechanism | `mechanisms.json` | Problem family; recurrence per context; status evidence-linked or hypothesis |
| Intervention hypothesis | `interventions.json` | Mechanisms targeted |
| Problem | `problems.json` | Dimensions, contexts, mechanisms |
| Solution package | `solutions.json` | Problem, mechanisms, interventions, claims, local adaptations, gates, maturity |
| Adoption resources, maturity, readiness, adoption records | `adoption.json` | Adoption records → solutions (empty) |
| Systems Lab questions, explanations, models, archetypes, scenarios | `systems-lab.json` | Model → module |
| Opportunity assessment | `opportunity-assessment.json` | Candidates → contexts, problem |
| Correction / supersession / retraction | `corrections.json` | Any entity ID or first-party document |

Risks and uncertainty are fields on each entity (`uncertainty`, `limitations`, `potentialHarms`, `evidenceGaps`), and review state is recorded per record (`reviewStatus`).

## Provenance and reliability contract for figures

Required: stable ID, context, label, value, unit, measure type, measure definition ID, population unit and definition, geography level, reference period, method, source organisation, source URL, source version, licence, redistribution status, licence review status, transformation, verification level, uncertainty, missingness, limitations, interpretation guard, review status, provenance record and `missingProvenance`.

**Explicit missingness:** publication date, retrieval date, licence evidence URL, source hash, source bytes and reference-period start/end may be null only if listed in `missingProvenance` with a reason. Declaring a field missing that is present also fails.

**Verification levels:** `byte_hashed_extraction` (SHA-256 and byte length required), `publisher_page_transcribed_unhashed`, `citation_level_from_ledger`.

**Separation of kinds:** source facts (context facts), source-reported findings (claims), HPI interpretations (`hpiInterpretation`, labelled on pages) and hypotheses (mechanism status, intervention hypotheses) are stored separately.

## Validation rules (build-failing)

- IDs follow per-entity patterns and are globally unique; every reference resolves.
- Rates are percentages 0–100; counts are integers; monetary measures carry ISO currency and price basis.
- A denominator without a referenced fact must be stated by the source; denominators are never synthesised.
- Rates with numerator and denominator facts must share context, source, period, population unit and unit, and agree arithmetically within rounding (detects source version drift).
- Claims must cite catalogue evidence; retracted evidence forces withdrawal; null and adverse findings cannot be recorded as supportive; duplicate claims are rejected.
- Evidence-linked mechanisms need claims; candidate hypotheses must have none.
- Benefit-access solutions must use verified receipt as the primary outcome; every outcome stage in each local adaptation is either a published measure or a declared gap.
- Maturity levels require recorded evidence for each level; level 5+ requires independent evaluation; level 7 requires a verified adoption record.
- Adoption and partnership entries require public evidence verified independently of HPI; usage counts and testimonials are rejected.
- Contexts cannot authorise fieldwork.
- Text cannot contain markup or unsafe URLs; aggregate scores and rankings are rejected outside the opportunity-assessment module.
- The opportunity rubric must equal the F0-02.5 baseline exactly; scores require independent or community scorers.

Warnings (non-failing): figures whose reference period ended more than three years before review; interventions without linked claims.

## Comparability

`compareMeasures(a,b)` compares measure definition, unit, population unit, geography level, method, reference period, currency and price basis, and returns every difference with an explanation. `deriveRate` refuses to combine counts from different sources, contexts, periods or populations. Pairwise verdicts for all figures are published at `/platform-comparability.json`.

## Deterministic consistency audit

Rule-based, not AI: conflicting evidence (supportive and null/adverse on one mechanism or intervention), intermediate-only endpoints for benefit-access interventions, non-independent studies (shared study family), duplicate DOIs, evidence older than ten years, hypotheses without evidence, abstract-level extraction counts, retraction-not-checked counts and unhashed figures.

## Exports

`/platform-knowledge-base.json`, `/platform-context-facts.csv`, `/platform-evidence-claims.csv`, `/platform-graph-edges.csv`, `/platform-schema.json`, `/platform-comparability.json`, `/platform-consistency-audit.json`, `/platform-opportunity-assessment.json` and `/platform-manifest.json` (SHA-256 of every source and output). CSV cells beginning with `=`, `+`, `-` or `@` are prefixed to prevent spreadsheet formula injection.

## Research ingestion procedure

1. Identify a reputable public source and check its licence and access terms; prefer metadata and links to redistribution.
2. Add the figure or claim by pull request with all contract fields; declare missing provenance.
3. Run `npm run research:platform:verify` and `npm run check`.
4. When a published figure changes, append a correction entry; never silently overwrite.
5. Never ingest personal, beneficiary or small-cell data.

Source adapters for World Bank, UNDP, OECD, ILO and national statistics offices are **not built**: RT-02.6 conditions apply. When built, they must run offline against pinned, hashed files, never during the public build.
