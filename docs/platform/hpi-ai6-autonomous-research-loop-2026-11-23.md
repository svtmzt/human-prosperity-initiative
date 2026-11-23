# HPI-AI.6-T07 — AI-first autonomous scientific research engine, first working slice

**Date:** 23 November 2026 · **Scope:** an operational *private* technical research loop, not independently validated findings or authorisation to publish novel model-generated scientific conclusions. **Founder policy:** AI autonomously performs lawful intermediate research and iterative checking. Expert participation is reserved for final scientific publication or real-world intervention clearance where genuinely required, not each intermediate research iteration.

## What this first slice actually does

The controller has three automatic roles. The first two are **separate first-pass research analyses**, using two installed native Ollama models, Qwen 3.5 4B and Qwen 3.5 9B. They are given the same immutable, preversioned HPI public research summaries, each in isolation; neither sees the other's proposed result. Existing HPI internal reference/expected labels are explicitly removed before either model receives its prompt.

A **third adversarial pass** uses Qwen 3.5 9B to challenge the already-generated candidates against the source. It looks for unsupported effects, hallucinated numbers, evidence/outcome mismatches, reversal of null/adverse findings, overstatements of causality, and citation defects. Adversarial outputs must be structured JSON; source quotations must be verifiable substrings. Unverified adversarial responses are rejected, not silently treated as approval.

If the supervisor identifies missing or contradictory information, a **fourth bounded source-only recheck** is run automatically for that case. Its fresh extraction must pass the same citation and numeric validators; even convergence with an earlier model does not prove scientific truth. There is **at most one automatic recheck per disputed case**, with no recursive loop or unbounded retries.

The **deterministic supervisor** then validates citations and source provenance again, compares coarse outcome/direction labels and severe reversals, checks critic findings, and autonomously classifies each case as one of:
- A source-grounded *candidate* that still needs **primary publication verification**;
- Unresolved, requiring further AI source and methods challenge;
- Quarantined for urgent internal rechecking where severe contradictions or invalid citations are suspected;
- Failed/incomplete, never silently considered successful.

These steps generate **next actions without asking a human to approve intermediate research**. Nothing here certifies scientific truth. The current source text is HPI's authored *summary* of a publication. Although it has a DOI URL and attributed figures, its accuracy against the original journal article is **not independently verified**. The system explicitly records this limitation.

## Run modes and budgets

- Plan, no model calls: npm run ai:science:auto -- plan --item-ids claim:E08,claim:E13
- Execute privately: npm run ai:science:auto -- run --allow-local-inference --item-ids claim:E08,claim:E13

This first phase supports **claim extraction only**, 1–3 user/versioned-public cases per run, exactly two installed local first-pass models and one local critic invocation per case. Maximum **4 local model invocations per case**, no retries, bounded source text, output tokens and runtime; requires explicit execution opt-in. Network output is restricted to loopback native Ollama on port 11434, **not** LiteLLM or another cloud-capable proxy. This iteration makes **zero cloud or paid model calls**. No new OpenRouter spending is authorised by enabling this feature.

One instance at a time is enforced with an atomic private lock. Only a local administrative record is created, under gitignored qa-artifacts/ai-autonomous-science with directory mode 0700 and per-report mode 0600. Reports contain model-proposed candidate text and metadata, so **they must never be committed, uploaded to CI or made available through a public API**.

The candidate report includes versioned source digest, request and model identities, failures, citation/critic flags, coarse agreement/disagreement, next action, independentModelFamilies count and immutable publishable=false. It clearly distinguishes **independent first-pass prompts** from independent scientific evidence: 4B and 9B are both Qwen models and belong to the **same model family**, so correlated errors are possible.

## Honest scientific limits and staged next work

This is the **first working engineering slice**, not a completed general-purpose autonomous research scientist. It currently reuses two supplied public-source summaries and cannot yet autonomously discover and authenticate new primary studies, extract publisher-licensed full text, perform mathematical verification of all causal estimates, or benchmark a thousand independent cases. Do not interpret consensus or AI confidence as measured scientific accuracy.

Next technical stages, in execution priority:

1. **Autonomous primary-source discovery and verification:** official statistics and publisher/DOI metadata with lawful excerpts, licence checks, dated retrieval records, independent provenance and source SHA-256. Fail closed on missing source rights or stale metadata.
2. **Adversarial replay with controlled repair:** bounded retry only for objectively classified failures, targeted evidence search, new independent model families where they improve verified quality, explicit request/time/spend ceilings, and a reproducible correction log. Do not turn one model's approval into consensus truth.
3. **Scale five-task pipeline:** study design, mechanisms, gaps and contradictions; stratified held-out *AI-engineering* challenge cases including negative/null/adverse findings, reproducible tests, failure denominators, source contamination controls and transparent uncertainty.
4. **Model routing ladder:** select local/free/strict-ZDR paid models based on reproducible measured errors per task, using **separately authorised budgets**; do not permit paid fallback implicitly.
5. **Final human boundary only where truly necessary:** produce source-linked reproducibility dossiers for optional final qualified review and required ethical/legal approval **before** publication of new scientific claims or interventions involving real people.

## Integrity and release invariants

- Public-hosted AI inference disabled.
- No paid cloud routing in this command; even a local HTTP proxy is refused.
- No private or identifying data is allowed into the automatically selected source set.
- Pre-existing internal expected labels remain unavailable to the research agents and critic.
- The critic's conclusions are not scientific truth.
- No new scientific conclusion can be auto-published; human expert review remains reserved for final release/real-world safety boundaries when required.
- Existing HPI-AI.6 T09 publication gate remains a separate NO-GO.

## Actual bounded local acceptance run — 23 November 2026

A genuine local-only run processed the two pre-existing HPI public-summary examples claim:E08 and claim:E13. It executed **eight local model invocations**: two independent source-only first passes per case, one subsequent 9B adversarial critic per case, and one bounded, source-only recheck per disputed case. **Zero** paid/cloud model requests, new experimental expenditure, web publications of model findings or beneficiary interventions. The raw response material is private, uncommitted and accessible only to the authorised Mac user.

The two model versions disagreed on E08's outcome category; its bounded automated recheck then agreed with one source-grounded first-pass classification, so E08 was **provisionally convergent, awaiting verification against the original primary publication**. For E13, one first-pass model abstained and the subsequent recheck did not fully resolve the discrepancy. That item remained **unresolved for an additional autonomous source and methods check**. Neither outcome is a scientifically validated finding.

The independent model family count was **one** (both Qwen). This proves the orchestration and failure-handling path operates with real local inference; it does **not** establish correctness, statistical accuracy, independent replication or AI scientific accreditation.
