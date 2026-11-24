# HPI-AI.6 — More precise source grounding and taxonomy guidance

24 November 2026. Scope: versioned internal research-engineering safeguards, not independent scientific validation.

## Changes

Claim prompt 1.2.0 and mechanism prompt 1.1.0 define the general endpoint categories and all 19 HPI mechanism concepts. These are general definitions, not case-specific expected answers. Verified enrolment can be represented by the legacy receipt category, but does not itself establish actual payment or sustained participation; filing a claim is not payment. Application assistance alone does not establish administrative refusal. Mechanism tags are proposed pathways, not proof of mediation.

The validator requires each numerical token in a claim to appear in its specific verified evidence span, not merely elsewhere in the source. Whole-token matching prevents 6 from being treated as the same value as 6.5. This is a lexical check, not proof of correct units, sign, arm assignment or causal interpretation. A narrow explicit-enrolment check rejects an incompatible category when the quote itself labels verified enrolment as the sole measured endpoint. It does not resolve every ambiguous or multi-endpoint source. Procedural-denial claims/tags require an explicit refusal/rejection term in the supporting quote; that necessary condition does not establish denial reasons or causality. Existing four-word verbatim quote checks remain.

One existing simulated test fixture was corrected to cite both treatment and control rates, rather than weaken the new validator. Four new regression tests cover quote-specific numerical matching, endpoint incompatibility, denial evidence and versioned general definitions. Evaluation cases and reference answers were unchanged.

## Actual fixed-case repeat

The original five-task selection digest remains 9d6d5d9ff786871662c79724a27e033cb17c0a1f1910844e2ccddf07ce75c6a7. Ten native local logical invocations, same Qwen 3.5 4B and Nemotron 3 Nano 4B, no paid/cloud AI.

| Task | Qwen before / after | Nemotron before / after |
|---|---|---|
| Claim extraction | Match / partial | Mismatch / match |
| Source classification | Match / match | Match / match |
| Mechanism tagging | Partial / partial | Partial / partial |
| Evidence gap | Match / match | Partial / partial |
| Contradiction | Match / match | Match / match |

Overall complete internal matches Qwen 4/5 to 3/5, Nemotron 2/5 to 3/5. Combined 6/10 unchanged. This is a repeated small internal diagnostic, not a held-out evaluation or evidence of improved general accuracy.

Both initially accepted an unsupported procedural-denial tag. This time Qwen accepted compliance burden, Nemotron accepted compliance burden and information frictions, and Nemotron's additional unsupported denial was rejected. Qwen's other mechanism quote was not verbatim; both mechanisms outputs remained partial. One Qwen claim with an incompatible explicitly labelled enrolment endpoint was rejected, but another application-classified claim survived because its quotation did not explicitly label the measured endpoint. This residual error remains unresolved. Do not count accepted subsets as complete matches.

A separate real publisher-deposited abstract audit of E08 and E13 ran first (four public registry GETs; two abstracts available; two rounded SNAP arithmetic comparisons and one author-reported null outcome). No publisher text retained, no full texts downloaded. The five-task prompts still use HPI summaries, not original full text; the abstract audit is separate, not automatic validation of all five tasks.

## Reproduction and limits

    npm run ai:science:original -- audit --item-ids claim:E08,claim:E13
    npm run ai:science:five -- run --allow-local-inference
    npm run check
    npm run ai:science:trial:test

No new benchmark labels, no paid calls, no production inference or automatic scientific publication. Prior reports remain private. Next priority: separate measured endpoints from intervention descriptions and represent claiming separately from payment, plus source-verified new independent engineering cases and stronger model-family comparisons. The current general taxonomy and lexical guards still require better semantic checks. T07 and poverty-trial replication remain open.
