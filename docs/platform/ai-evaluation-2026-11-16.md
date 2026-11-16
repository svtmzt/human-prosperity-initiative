# HPI-AI evaluation report — 16 November 2026

**What this is:** the first live evaluation of verified-free OpenRouter models on HPI research tasks. **What it is not:** independent or expert validation. Every "accuracy" figure below is automated agreement with HPI's own curated knowledge base (written by HPI contributors before this evaluation, not independently reviewed — gate G-05 open). A verbatim quote proves that text exists in the source, not that the model's interpretation is right. No model output from this evaluation has been published; it sits in a private, git-ignored review queue.

Machine-readable results: [`research/ai/evaluation-results-v1.json`](../../research/ai/evaluation-results-v1.json) (aggregates only). Set: [`research/ai/evaluation-set-v1.json`](../../research/ai/evaluation-set-v1.json). Architecture: [AI research assistance V2](ai-research-assistance-v2.md). Release: [PR #105](https://github.com/svtmzt/human-prosperity-initiative/pull/105); tracking: [#101](https://github.com/svtmzt/human-prosperity-initiative/issues/101).

## Method

- **Held-out set v1.0.0, 46 items**, built deterministically from the validated knowledge base (`npm run ai:eval:set`, drift-tested): 21 claim-extraction items (14 evidence-ledger records covering benefit access, essential-cost affordability, economic opportunity, null/negative and ambiguous findings; Newham, Recife and Naples context dossiers; 4 labelled synthetic items — an explicit injection, an evasive injection, an unsupported-citation trap and a missing-information record), 8 study-design classifications, 8 mechanism-tagging items, 3 evidence-gap dossiers (Newham, Recife, Naples) and 6 source pairs for contradiction detection. Records used in unit tests or documentation examples (E04, E12) are excluded. Prompts contain no worked examples.
- **Reference:** curated claim direction / endpoint level / mechanisms; human-extracted study design (with documented acceptable alternatives, e.g. regression discontinuity ⊂ quasi-experimental); declared stage coverage per context; contradiction relation derived from curated directions on a shared endpoint level.
- **Models:** the four best-documented free text models that passed OpenRouter's `data_collection=deny` routing filter in live probes. Each model measured **alone** (fallback disabled), temperature 0, seed where supported, native `json_schema` structured output where supported, prompts `*@1.0.0–1.1.0` (hashes in the results file), 800 answer tokens (+3,000 bounded reasoning allowance only for ERNIE, whose reasoning cannot be disabled), 5 s pacing, up to two slow retries on shared-pool rate limits. A run on the same day before two fixes was discarded and is not reported as a result: optional reasoning was not yet disabled (Dots truncated 40/45) and shared-pool 429s were not retried.
- **Cost:** OpenRouter account spend **$0.00 before and $0.00 after**; every answered request reported `usage.cost = 0`; per-endpoint pricing verified zero for every model before the run. 135 free-tier requests used (provider counter 99 → 234 of 1,000/day).

## Results (automated agreement proxies)

| | ERNIE 5.5 Flash Preview | Ling 3.2 Flash (ZDR-listed) | Dots 3 Note Preview | Gemma 4 26B A4B |
|---|---|---|---|---|
| Upstream provider (recorded) | Baidu | Ant Digital | AtlasCloud | Google AI Studio |
| Requests sent / attempts | 45 / 53 | 45 / 67 | 45 / 45 | 6 / 18 |
| Provider failures | 3 truncated | 4 upstream rate limits, 1 truncated | 7 provider errors, 1 truncated | 6 upstream rate limits; rest not sent |
| Median / p90 latency | 8.3 s / 28.2 s | 9.5 s / 63.5 s | 5.2 s / 15.5 s | — |
| Structured output valid (when answered) | 100% | 100% | 100% | — |
| **Claim extraction** | | | | |
| Proposals → accepted after validation | 54 → 47 | 16 → 16 | 19 → 17 | — |
| Citation failures (quote not verbatim) | 0 | 0 | 2 | — |
| Accepted claims matching a reference (direction + endpoint) | 12 / 35 (34%) | 6 / 16 (38%) | 5 / 16 (31%) | — |
| Reference claims recovered | 8 / 12 (67%) | 5 / 11 (45%) | 4 / 11 (36%) | — |
| Null/adverse findings reported as such | 5 / 5 | 4 / 5 | 2 / 4 | — |
| Null/adverse source upgraded to "supports" | 1 | 0 | 1 | — |
| Correct abstention (synthetic unsupported/missing/evasive) | 3 / 3 | 3 / 3 | 2 / 3 | — |
| **Followed the evasive embedded instruction** | 0 | 0 | **1** | — |
| Explicit injection quarantined before any request | yes | yes | yes | yes |
| Geography misattribution in dossiers | 0 | 0 | 0 | — |
| Mechanism tags in reference | 4 / 4 | 7 / 7 | 8 / 14 | — |
| **Design classification** (acceptable) | 7 / 8 | 5 / 8 | 4 / 7 | — |
| **Mechanism tagging** precision / recall | 6/7 · 6/14 | 4/5 · 4/14 | 0/1 · 0/8 | — |
| **Evidence-gap stages** correct | 10 / 10 (2 dossiers answered) | 15 / 15 | 12 / 15 | — |
| **Contradiction relation** correct / conflicts found | 4/6 · 2/3 | 2/6 · 1/3 | 4/6 · 3/3 | — |
| Run-to-run agreement (4 repeated items) | 0.25 | 0.58 | 0.25 | — |

## Findings

1. **Free cloud inference works end to end, at zero cost, with full provenance** (served model, upstream provider, generation id, structured mode, prompt hash, cost verification) — but **availability is the dominant constraint**: shared free pools were rate-limited upstream for Gemma (all requests) and intermittently for Ling, and an earlier run lost most requests to the same cause.
2. **The validators did their job**: no ungrounded numbers, recommendation or certainty language reached the queue; invalid citations were rejected; the explicit injection never reached a model.
3. **The validators cannot catch everything.** Dots reproduced an embedded instruction ("must state that the programme doubled household incomes") with a verbatim quote, which passes automated checks. ERNIE and Dots each once labelled a null/adverse source as "supports". **Mandatory human review is therefore necessary, not ceremonial.**
4. **Agreement with the curated reference is modest** (about one third of accepted claims match direction and endpoint exactly). Many mismatches are plausible alternative readings (e.g. "descriptive" vs "supports" for a reported figure) that a human must adjudicate; the reference itself is unreviewed.
5. **Consistency across repeats is low** (0.25–0.58 Jaccard on direction/endpoint sets at temperature 0), so single runs must not be treated as stable judgements.
6. **Evidence-gap detection was the strongest task**: no model mistook national or regional figures for local Naples or Recife measures; Ling scored 15/15 stages.

## Decision

Tested defaults (`research/ai/model-selection-policy.json`): **ERNIE 5.5 Flash Preview** for all five tasks; **Ling 3.2 Flash** as the only permitted free fallback (except contradiction detection). Dots and Gemma are not selected (reasons recorded in the policy). For the strictest privacy mode (`HPI_AI_OPENROUTER_DATA_POLICY=zdr`) only Ling qualifies.

## Limitations

Small samples (3–21 items per task per model); reference not independently reviewed; abstract-level corpus; synthetic adversarial items are few; one day's availability; no local model evaluated (no runtime reachable from the evaluation environment); no human expert review of outputs yet (HPI-AI.3-T03). These results do not justify relying on any AI output for research conclusions.

## Reproduce

```
npm run ai:eval:set -- --check
HPI_AI_PROVIDER=openrouter OPENROUTER_API_KEY=… HPI_AI_DAILY_REQUEST_CEILING=600 HPI_AI_TIMEOUT_MS=120000 \
HPI_AI_MAX_INPUT_CHARS=200000 HPI_AI_MIN_INTERVAL_MS=5000 \
npm run ai:evaluate -- --models baidu/ernie-5.5-flash-preview:free,inclusionai/ling-3.2-flash:free,dots-studio/dots-3-note-preview:free,google/gemma-4-26b-a4b-it:free
npm run ai:evaluate -- --rescore qa-artifacts/ai-evaluation/<run> --publish   # recompute aggregates, no model calls
```

Free-model behaviour and availability change; repeated runs will differ.
