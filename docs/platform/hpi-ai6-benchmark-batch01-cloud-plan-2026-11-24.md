# HPI-AI.6 — New benchmark candidates and cloud comparison plan

24 November 2026. First private candidate batch and live metadata preflight; no new cloud inference.

## Candidate expansion

Ten new candidate cases (two per scientific task) were curated from four previously unused study DOI identities and one DWP official-statistics release. Crossref and OpenAlex corroborated all four DOI identities; no DOI appeared in the prior evaluation set or evidence ledger. The source text consists of newly authored factual summaries, not copied paper full texts. The candidate records and tentative references are private on the Mac, mode 0600 in a mode 0700 archive. The public report does not expose the case prompts or answers. The first batch is not independently adjudicated, not a validated holdout, and not yet approved for cloud submission. Different cases share study sources; there are five source groups, not ten independent studies. In particular the DWP data and older Newham evidence concern related programmes. Future split design must keep study families and connected components of comparison pairs together; this initial intake checks DOI/URL grouping consistency but does not construct a holdout split or guarantee absence of model pretraining overlap.

Candidate counts: 2 claim extraction, 2 source classification, 2 mechanism tagging, 2 evidence-gap detection, 2 contradiction detection. 490 further candidates to reach the 100-per-task target, followed by stronger source/reference review. The two contradiction cases are non-comparability examples only, so the current batch does not cover a balanced relation distribution. The gap examples assess available information in an excerpt, not all knowledge about a programme. Official estimates are not individual verified eligibility. The intake checks case identity, input class, provenance digest, known DOI/URL exclusions and source grouping, not semantic truth or complete answer quality. No model reference answer changed in the existing evaluation set.

Source families include recent benefit-access research in India, randomized evaluations of business training in Sri Lanka and cash transfers in Malawi and Zambia, and DWP's [FYE 2025 benefit take-up statistics](https://www.gov.uk/government/statistics/income-related-benefits-estimates-of-take-up-financial-year-ending-2025/income-related-benefits-estimates-of-take-up-financial-year-ending-2025). Sources checked at abstract or official-release level, not independently reproduced original statistical estimates.

## Live OpenRouter route and cost preflight

The public model catalogue contained 470 entries. No active zero-priced ZDR free variant was identified; the four previously selected free candidates remain blocked. No privacy downgrade.

Five exact paid model/provider pairs matched live model and ZDR endpoint metadata. Projected price for 25 calls per model, 3000 input and 1200 output tokens each, based on the verified provider prompt/completion rates:

| Model | Provider | USD per million input/output tokens | Estimated USD |
|---|---|---|---:|
| DeepSeek V4.1 Flash | Inceptron | 0.10 / 0.60 | 0.0255 |
| Qwen 3.8 27B | Pearl Research | 0.10 / 2 | 0.0675 |
| GPT-6.2 Sol | Azure | 2 / 10 | 0.45 |
| Claude Sonnet 5.5 | Amazon Bedrock | 2 / 10 | 0.45 |
| Claude Opus 5.5 | Amazon Bedrock | 4 / 20 | 0.90 |

125 requests: estimated $1.893. Initial 10-case comparison, 50 requests: estimated $0.7572. These are price scenarios, not upper bounds, invoices, or quality rankings. Reasoning/surcharges, longer inputs, taxes and future prices can change actual cost. The old limited $0.25 paid pilot does not authorize a new comparison budget. Proposed new cumulative ceiling: $5, subject to explicit approval, a separate persistent reservation/accounting ledger, exact fresh routes and no fallback, ZDR and deny collection, safe public-source inputs, and tested execution guards. The new script only performs seven fixed public metadata GETs; it cannot send a paid inference request. The previous paid pilot results are too small to rank models reliably.

    npm run ai:science:benchmark:intake -- batch01
    npm run ai:science:cloud:plan -- plan

No private candidate rows or answer keys in public Git. No new paid API calls. No new scientific publications. HPI-AI.6 T07/T08 remain in progress.
