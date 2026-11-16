# Solutions and evaluation methodology V1

**Status:** implemented as data contract and pages, 16 November 2026. Not independently reviewed (G-05 pending).

## What a solution package is

A reusable research and evaluation design for a recurring mechanism. It is **not** a policy recommendation, a delivered service, an eligibility tool or authorisation for fieldwork.

Operating sequence: problem → mechanism → existing evidence → intervention hypothesis → evaluation design → local adaptation → independent validation → potential adoption → measured outcomes. HPI currently reaches *local adaptation* at prototype level; the last three steps require external institutions and approvals.

## Required specification

Intended problem and mechanisms; intervention description; scientific rationale; existing evidence claims; evidence limitations; context dependencies; resource and institutional prerequisites; potential benefits and harms; measurement plan; local adaptations; ethical and legal gates; governance issues; maturity with evidence; reproducible artifacts; related research. The build rejects packages missing any of these.

## Outcome stages

1. **Potentially eligible** — modelled or estimated eligibility is not verified entitlement.
2. **Applied** — an application is not an approval.
3. **Approved** — an approval is not a payment.
4. **Benefit received** — receipt is not sustained improvement.
5. **Sustained economic improvement** — requires a credible comparison and follow-up.

Benefit-access packages must use verified receipt (HPI-B-01) as the primary outcome. Applications and approvals are intermediate stages that are reported but never substituted.

## Worked vertical slice: benefit access

- **Mechanisms:** compliance burden, information and learning costs, eligibility uncertainty, procedural denials.
- **Evidence:** nine abstract-level claims (E03, E04, E08, E11, E12, E13, E14), including null and endpoint-mismatch findings.
- **Contexts:** Newham (Pension Credit, claim-based; DWP 2023/24 local model byte-verified), Recife (CadÚnico registration then federal Bolsa Família selection; no local gap measured), Naples (Assegno di Inclusione, application-based; only national caseload and regional poverty recorded). Every outcome stage in each context is either a published figure or a declared gap.
- **Synthetic comparison:** fictional groups show a clear application difference (+12.5 pp, interval excluding zero) while the receipt difference (+2.2 pp) has an interval including zero, illustrating why application increases must not be reported as receipt or income gains. Wilson and Newcombe intervals reuse `research-tools/outcome-evaluation.mjs`.
- **Measurement plan:** primary HPI-B-01; secondary HPI-B-02 (navigation time and cost), HPI-E-02 (equity gaps), HPI-E-03 (costs); harms (incorrect advice, complaints, failed applications caused by the intervention); comparison with usual services with no entitlement withheld; missing-data bounds; causal claims only from an approved design.
- **Sample-size planner:** two-proportion normal approximation with pooled null variance, attrition inflation and design effect; a planning aid with illustrative defaults, not a protocol.
- **Maturity:** level 3 (prototype). Level 4 is blocked by the absence of an approved protocol, lawful outcome data, independent methods review and ethics approval.

Other families: energy affordability and livelihoods templates at maturity 2, with outcomes that capture adequate energy services (not only bills) and sustained earnings, job quality and displacement (not enrolments).

## Experimental and simulation standards

Baseline and follow-up comparison; missing observations and attrition reported by arm with worst/best-case bounds; prespecified subgroups and distributional effects; costs reported separately from effects (ratios undefined when effects are zero or uncertain); null and negative outcomes published; scenarios compared side by side; simulation always labelled and separated from observation; descriptive association never presented as causal inference.

## Maturity model

| Level | Stage | Evidence required |
|---|---|---|
| 1 | Research question | Published research question |
| 2 | Evidence reviewed | Published evidence review, stating internal or independent |
| 3 | Prototype | Published reproducible artifact |
| 4 | Evaluation ready | Protocol with comparator, estimand, power and gates |
| 5 | Independently evaluated | Evaluation report by an evaluator independent of HPI |
| 6 | Replication assessed | Independent evidence from a further context |
| 7 | Adopted | Verifiable public evidence of external use |

Levels are enforced by the validator; developer judgment alone cannot raise them.

## Opportunity assessment

The F0-02.5 rubric is preserved exactly: need severity 20%, existing impact evidence 20%, feasibility and cost 20%, ethics 15%, additionality 15%, measurable learning 10%. The method:

1. defines criteria and evidence requirements;
2. evaluates hard fieldwork vetoes separately (no accountable operator, no lawful data, no ethics review, entitlement withheld, no community participation, unmeasurable primary outcome);
3. computes a weighted score **only** when all six criteria have independent or community scores; otherwise reports "not scorable";
4. runs weight-perturbation sensitivity only when at least two candidates are fully scored;
5. records extended considerations (mechanism recurrence, method reusability, adoption potential, scalability constraints, benefit per resource, distributional consequences, neglected populations, sustainability, evidence uncertainty) qualitatively and never weights them;
6. requires human review before any consequential decision.

A small, highly deprived population must not be dismissed because it is less scalable. Current state: three candidates, zero of six criteria independently scored, all fieldwork vetoes triggered; no ranking is published.
