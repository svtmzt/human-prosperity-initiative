# HPI-AI.6 — Independent scientific review and model admission: accountable handoff (V0.1)

**Prepared:** 22 November 2026. **Classification:** operational protocol, NOT scientific validation, ethics approval, permission to spend, fieldwork authorisation or approval to publish LLM-generated research conclusions.

**Tracking:** [HPI-AI.6 #111](https://github.com/svtmzt/human-prosperity-initiative/issues/111) · [independent methodology #19](https://github.com/svtmzt/human-prosperity-initiative/issues/19) · [research/data gate #67](https://github.com/svtmzt/human-prosperity-initiative/issues/67) · [human scale gate #103](https://github.com/svtmzt/human-prosperity-initiative/issues/103). This is a preparation document; no independent reviewer or authorisation is represented as having been secured.

## 1. Boundary and responsible human roles

- A qualified independent scientific/methodological lead must approve the protocol and source-selection rules **before sampling or model comparison**. At least two *different qualified independent assessors* must score each assigned source/case separately, blind to model responses. Their qualifications, relevant financial/institutional conflicts and study familiarity must be verified by accountable people, not an AI agent.
- A scientific adjudicator resolves contested ground truth only after initial judgements have been sealed. Unresolved cases remain **unknown**, not silently excluded. Source-rights, data protection and safeguarding reviewers remain separate roles.
- An authorised study/data-rights lead verifies public-source licences, versions, permitted quotations/excerpts, appropriate storage, legal controller and provenance. Exclude personal beneficiary information, leaked text and non-public/unlicensed content from external APIs.
- The HPI founder/institutional principal makes any actual spend or publication decision. AI-generated expert personas, agreement between models, successful CI and internal performance tests do NOT count as human signatures.

## 2. Preregister the study BEFORE collecting model results

Freeze versioned public evidence **source IDs, author/title, exact DOI/URL, access date, geography, time period, population, intervention, outcome, metric, unit, methods/design, licence or lawful reuse basis**, and hash the canonical source manifest (SHA-256). Freeze the statistical analysis plan and model/prompt versions before opening the blinded hold-out. Keep exploratory data separate to avoid test-set leakage.

Use **at least 100 distinct, independently adjudicated cases per HPI task**, across five tasks (minimum 500 task-case judgements, not necessarily 500 papers); ideally at least 500 cases per task when precision warrants. The old 46 internal examples and 140 synthetic challenges do not count. Independent lead must choose and justify sampling strata: null, negative, beneficial and ambiguous findings; observational vs experimental designs; different population groups, countries, dates, outcomes and source-quality classes. Report denominators and gaps honestly.

| Task | Independent reference fields | Critical failure |
| --- | --- | --- |
| Claim extraction | source and quote locator, outcome, effect magnitude/direction, unit, denominator, population | fabricated effect, null/adverse reversed to benefit |
| Study design classification | design, comparator, measured variables, bias, causal limitations | descriptive data mislabelled causal proof |
| Mechanism tagging | observed versus hypothetical mechanism, direct supporting evidence | speculative mechanism presented as observed |
| Evidence-gap detection | missing/observed information and granularity, uncertainty | missing denominator or data asserted as measured |
| Contradiction/comparability | geography, year, populations, units, definitions, provenance | incompatible studies merged or counterevidence concealed |

Compute all performance metrics from **auditable integer successes/trials**, report 95% Wilson lower bounds and strata, with severity-weighted failures and error/abstention rates. Predeclare thresholds *before* looking at held-out outcomes. HPI-AI.6 engineering thresholds are eligibility criteria only, not a substitute for independent scientific review.

## 3. Private blinded case and reviewer record

Initial reviewers see licensed sources, task prompts and the rubric — **never model answers, model names or hidden expected labels**. Each private case record must identify:

- Case and task IDs, versioned source ID, exact locator, sha256, reuse basis, study design and sampling stratum;
- Private reviewer pseudonym, independently verified reviewer identity/qualification and conflict-of-interest register (held off public GitHub);
- Reviewer label, effect direction, number/denominator, method and limitations, citation pointer, uncertainty, abstention and review timestamp;
- Whether findings are null/negative or adverse, and whether a possible fabricated causal effect requires urgent escalation.

The adjudicator independently checks the sealed reviews, records an attributable resolution/disagreement, and validates provenance and denominator math. Never erase minority judgements or rename unresolved cases as correct. Keep reviewer notes, full copies and raw model outputs in authorised **private access-controlled storage**, not public repository issues, build artifacts or website routes. GitHub may hold only an appropriately redacted aggregate review receipt with an audited content digest.

## 4. Actual comparison and stop policy

1. Freeze reviewed hold-out and prompts; all models receive the same lawful public sources. Record model version, provider/endpoint, request/privacy policy, all failures, token usage and costs independently. No model receives another model's answer before its own response.
2. Begin with locally measured models plus genuinely eligible free cloud providers. **22 Nov observation:** public OpenRouter ZDR model listing includes Ling 3.2 Flash but not ERNIE 5.5 Flash. Model-list membership alone is *not* proof of any endpoint's ZDR, no-training, routing, region, quota or source-rights compliance. Use the metadata-only cloud preflight to recheck; inspect the real inference route at call time.
3. When an injection, fabricated effect, reversed harm, missing source right, privacy ambiguity or model dispute appears: quarantine/escalate and preserve the evidence. **Never** silently retry via permissive or paid fallback. Different sizes of Qwen are the same model family, not two independent scientific sources.
4. A paid stage requires a separately approved **named founder/account owner**, maximum USD charge, hard account-level budget, selected models/endpoints, request and token limits, approved source classes, expiry, route/privacy review, stop conditions and a receipt. Compare economy before midrange/frontier on the same independently scored hold-out. This protocol does NOT permit a paid request.
5. Publication of new AI-generated scientific claims remains forbidden until qualified independent methods/ethics/privacy/data-rights review, reproducibility, lawful governance and a separate signed release procedure. Public model inference stays disabled.

## 5. Evidence gate checklist — current status

| Gate | Actual evidence needed | Current result |
| --- | --- | --- |
| T06 free-cloud model comparison | HPI-scoped OpenRouter key, fresh endpoint-level privacy + zero-price checks, real private same-set response records, no paid routing | **OPEN** — authorised HPI environment currently has no key; metadata preflight is not inference |
| T07 independent review | approved preregistration, lawful held-out source set, two verified independent expert assessments per case, conflicts/adjudication and auditable numeric counts | **OPEN** — no human reviews or validated independent hold-out |
| T08 paid model tier | separate explicit cost approval, independent accuracy need, hard billing caps, endpoint/privacy/legal checks | **OPEN** — no paid authority or charges |
| T09 scientific-publication gate | qualified science, legal, accessibility, ethics and institutional sign-offs plus separate release authority | **NO-GO** — AI-origin science never auto-published |

Human-only decision fields (leave empty until evidence is produced): scientificLead, qualificationVerification, reviewerOne, reviewerTwo, conflictReview, lawfulSourceRights, preregistration, sourceSHA256, adjudicationReceipt, eligibleCaseCounts, criticalSafetyFailures, independentScienceDecision, paidSpendOwnerAndCap, institutionalPublicationAuthority, datedSignatures. **An empty field means no approval.**

## 6. Reproduction and private handoff

- npm run check — repository engineering regression, NOT an external scientific accreditation.
- npm run ai:science -- plan — old internal diagnostic scores, not independent ground truth.
- npm run ai:science -- cloud-preflight — unauthenticated **public GET** checks of current catalogue and exact free ZDR endpoint metadata; no API key, inference, spend, guarantee of provider compliance or scientific validity.
- npm run ai:science -- run --allow-inference ... — only inside an HPI-authorised runtime with a real scoped API key and live verified free endpoint, on licensed public-only sources, with private model output and human review.

**These documents and automated checks do not close T06–T09. Closing requires genuine external evidence, budget approval where relevant, and human accountability.**
