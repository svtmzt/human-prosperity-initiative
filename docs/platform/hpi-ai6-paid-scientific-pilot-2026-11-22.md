# HPI-AI.6 — Paid-model exploratory scientific-engineering pilot

**Executed:** 22 November 2026. **Status:** experimental engineering diagnosis only; NOT scientific accreditation, paid-model endorsement, or permission to publish AI-origin science. [HPI-AI.6 issue #111](https://github.com/svtmzt/human-prosperity-initiative/issues/111).

## Authorisation, privacy and safeguards

The HPI founder authorised the evaluation of paid models meeting the established data-handling requirements. Only the pre-existing, versioned, publicly available research metadata for cases claim:E08 and claim:E13 was transmitted to external models. Their references were curated by HPI internally, not independently adjudicated.

The HPI-specific OpenRouter key was read only from private Mac configuration (never placed in code, public logs or the repository). It has an account hard spending limit of USD 10. This pilot enforces a separate **cumulative USD 0.25 ceiling** with conservative worst-case input/output token reservations, verified key and account credit budget, and a single-flight lock to prevent concurrent-budget races. Each model receives at most two selected public cases. No automatic retries.

Each external request explicitly enforces Zero Data Retention (ZDR), data_collection=deny, allow_fallbacks=false, an allowlisted single provider, and per-million-token max_price limits. The exact model + provider must appear in the current ZDR registry and in the current model endpoint pricing before the call. Neither personal/beneficiary records nor confidential notes, internal drafts or third-party restricted full texts were transmitted. ZDR endpoint listing reflects OpenRouter/provider assurances, not an independent guarantee of provider behavior.

Only a private, explicit CLI can call paid models. The existing research free-only adapter and public website inference remain unchanged. No new scientific findings were published.

## Actual test runs and cumulative budget

| Run | Cloud candidates (plus local Qwen 3.5 4B control) | Paid calls | Conservative cost reserved |
| --- | --- | ---: | ---: |
| Initial baseline | DeepSeek V4.1 Flash, Qwen 3.8 27B, Claude Sonnet 5.5 | 6 | $0.0224984 |
| Reasoning-adjusted baseline | Same models, low reasoning and larger output limit for DeepSeek/Qwen | 6 | $0.0413984 |
| Advanced escalation | GPT-6.2 Sol, Claude Opus 5.5 | 4 | $0.102432 |
| **Combined** | **Five paid models, one local control** | **16** | **$0.1663288 / $0.25 pilot ceiling** |

The initial run returned HTTP-successful but empty final responses from DeepSeek and Qwen 3.8. They both had reasoning enabled with insufficient output allowance. The initial failures remain recorded and are not silently discarded. The adjusted run yielded interpretable JSON.

**Billing verification:** At 22:54 UTC, the dedicated HPI key reported **USD 0.069030944 consumed**, with **USD 9.930969056** remaining of its account key limit. API billing can post with delay; this is a timestamped reading, not a promise of a permanently final charge. Costs returned in the successful model responses totalled approximately USD 0.06649, distinct from the conservative reserved ceiling.

## Two-case internally curated reference comparison

The internal claim extraction reference labelled claim:E08 as supports/receipt and claim:E13 as null/receipt. These are not externally reviewed truth labels. Additional candidate propositions require manual evaluation; they are not automatically scientific errors.

| Model | Expected internal labels present | Additional propositions needing review | Notable result |
| --- | ---: | ---: | --- |
| Qwen 3.5 4B local | 2 / 2 | 0 | No missing category in this small sample |
| DeepSeek V4.1 Flash — Inceptron ZDR route | 2 / 2 | 2 | Additional descriptive propositions |
| Qwen 3.8 27B — Pearl Research ZDR route | 1 / 2 | 3 | E13 outcome category differed |
| Claude Sonnet 5.5 — Amazon Bedrock ZDR route | 1 / 2 | 1 | E13 outcome category differed |
| GPT-6.2 Sol — Azure ZDR route | 1 / 2 | 3 | E13 outcome category differed |
| Claude Opus 5.5 — Amazon Bedrock ZDR route | 1 / 2 | 5 | E13 outcome category differed |

These are **engineering label-match observations on only two internally labelled examples**, NOT robust model accuracy rates. Source/format validators passing do not prove substantive correctness. The panel flagged material disagreements on both cases. None of the adjusted or advanced runs promoted the null direction to a positive effect in these two examples; that does not establish general safety. Larger models are not automatically better, but these results are insufficient to rank them meaningfully.

Reasoning effort and output limits vary across candidate models. Future fair scientific comparisons must preregister a justified prompt and configuration policy, including how reasoning-token budgets are treated.

## Reproduction

- Baseline: npm run ai:science:paid:pilot -- run --allow-paid --max-usd 0.25
- Advanced: npm run ai:science:paid:pilot -- run --allow-paid --max-usd 0.25 --tier advanced
- Private internally curated reference diagnostics: node scripts/ai-paid-science-diagnostics.mjs
- Local engineering verification: npm run check

The CLI requires a separately configured HPI-specific OpenRouter secret and a strict cumulative USD 0.25 ceiling. All model responses, private review queues, exact billing and source-linked internal data stay in gitignored qa-artifacts/ai-paid-science-pilot, with private file permissions. No raw model responses are committed.

## Scientific status and next decisions

**T08 has a real bounded paid exploratory pilot, but is NOT a completed, scientifically validated paid-model benchmark.** T07 requires two qualified independent human reviewers, a lawful and pre-registered held-out dataset, and at least 100 independently adjudicated cases for each of the five tasks. Errors, extra claims, negative/null evidence, denominators, stratified comparisons, and 95% Wilson intervals must be reviewed. DeepSeek is an economical **candidate for further evaluation**, not a certified winner.

**T09 remains NO-GO.** Novel AI-generated scientific conclusions may not be auto-published. The USD 10 limit on the API key is not approval to exceed the USD 0.25 experimental budget. Additional spend requires explicit approval after this pilot.
