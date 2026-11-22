# HPI-AI.6 — Evidence-first multi-model scientific validation and model cost ladder (V0.1)

**Date:** 22 November 2026 · **Status:** engineering implementation + local model panel smoke-test. No independent scientific accreditation, no OpenRouter cloud-panel inference in this release, no paid inference, no public AI gateway. This document does **not** authorise organisational formation, fieldwork, sensitive personal data or real-world intervention decisions.

## Purpose and non-negotiable rules

HPI needs a replicable, accurate system for analysing evidence about poverty and prosperity. The goal is **not** to make an LLM sound convincing. It is to quantify when the system is correct, identify uncertainty and causal overreach, and escalate only the cases that justify the cost.

1. **Accuracy before cost or size.** A local model is neither privileged nor permanently excluded: compare on matched tasks, independently reviewed references and error severity. Models may serve different tasks.
2. **Models cannot vote scientific facts into existence.** A second model must not see the first model's conclusions before generating its own initial answer. Agreement is marked `model_agreement_not_scientific_validation`, disagreement `material_model_disagreement`. Both require review.
3. **Only externally attributable adjudication can improve evidence status.** An internal 46-case curated benchmark is a diagnostic, not a qualified test set.
4. **Never automatically publish new AI-generated scientific conclusions.** The pure publication gate may greenlight *pre-existing verified/licensed official data or versioned deterministic calculations*, but never a novel causal or research claim originating in an LLM. No website integration or public AI endpoint is activated.
5. **Use only authorised sources and safe provider routes.** The current experiment runner accepts local loopback or the existing verified-`:free` OpenRouter provider, which rechecks fresh catalogue/endpoint zero pricing and data policy. Paid requests are rejected regardless of their advertised model class; nobody is authorised to convert a price quote into a paid key or an actual purchase.

## Delivered engineering features and evidence

| Feature | Concrete deliverable | Exact scope |
| --- | --- | --- |
| Private independent panel | `research-tools/ai-assist/scientific-validation.mjs` | Run 2–3 independently prompted eligible models on the same 1–100 public-source items, compare accepted structured claim signatures, return disagreements/abstentions/quarantine, `publishable:false` |
| Safety-conscious CLI | `npm run ai:science -- plan\|costs\|challenges\|run` | `plan` reads existing aggregate results; `costs` uses a **public GET** with no API key; `challenges` is deterministic; `run` requires explicit `--allow-inference`, 2–3 explicitly named local or free models and 1–15 versioned items. Private reports in gitignored `qa-artifacts/` with 0600 file permissions |
| Measured local smoke test | Qwen 3.5 4B vs Qwen 3.5 9B on **three** versioned internal cases | **Executed 22 Nov 2026:** `claim:E08` and `claim:E13` disagreed, `claim:synthetic:INJ-2` was quarantined before inference for both. The two Qwen variants share a model family and are not independent scientific reviewers. No AI claim published |
| Gate for model consideration | `assessModelReadiness` | Requires high per-task internal/expert agreement, explicit safety checks, **≥100 genuinely independently adjudicated items per task**, accountable audit receipt with ≥2 reviewers, numeric audited counts and 95% Wilson lower bounds. Qualifies a model only for **further human consideration** |
| Publication lock | `scientificPublicationGate` | Explicitly rejects AI-origin scientific claims, unsafe subject data, unlicensed or unreproducible artifacts. Does not deliver a publishing endpoint |
| Synthetic engineering challenges | `scientific-challenges.mjs` | **140 templated cases**: injection, causal overreach, null/adverse reversal, unknown denominator, incompatible geography, unsupported references, fabricated numbers (20 × 7). **NOT scientific gold, not 140 model benchmark successes.** Scanning detected 20/20 fixture injections; other 120 are designed as *future* reasoning stress cases, not verified model outcomes |
| Read-only paid-model ladder | `research/ai/openrouter-cost-ladder-2026-11-22.json` | OpenRouter public API GET on **22 November 2026**, 13 exact model IDs across free, economy, midrange, frontier, frontier premium. Endpoint pricing, current availability, data retention and HPI accuracy **not certified**. **No paid model called** |

The test code mocks provider calls to validate fail-closed routing and independent prompting; these mocks do **not** establish real scientific quality. New test suites must also pass repository build/CI and real Chromium before merging.

## Accuracy controls for task-specific selection

| Task | Minimum *point* agreement for a qualified trial model | Minimum *Wilson 95% lower bound* on external audited counts | Known failure that blocks |
| --- | --- | --- | --- |
| Claim extraction | Reference-consistent precision 98%; recall 90% | Precision ≥90%, recall ≥85% | Any null/adverse evidence upgraded to positive, unaddressed injection or fabricated effect |
| Source/study design classification | Acceptable methodological class ≥98% | ≥90% | Misclassifying descriptive studies as causal |
| Mechanism tagging | Precision 98%, recall 90% | Precision ≥90%, recall ≥85% | Invented links or mechanisms unsupported by actual data |
| Evidence-gap detection | Stage classification 98%, gap recall 90% | ≥90%, ≥85% | Missing data misrepresented as measured outcomes |
| Contradiction/comparability | Relation classification 98%, contradiction recall 90% | ≥90%, ≥85% | Incompatible geographies/units combined as comparable |

Additional hard requirements: ≥100 independently adjudicated items **per task**, ≥2 identified independent reviewers, attributable source-set digest and conflict record, documented error denominators, ≤2% provider failure rate, and **zero critical safety events in the audited sample**. These thresholds are conservative *engineering eligibility* criteria only; passing them does **not** amount to scientific peer review or permission to publish a novel claim.

A task may require stricter thresholds based on real expert risk analysis. A model with a measured safety failure is excluded until the defect is investigated, corrected and independently retested; one passing red-team fixture cannot certify robustness. Any missing metric, outdated policy, undocumented reviewer or unverifiable data licence fails closed. Quality judgments must be stratified by source class, geography, intervention category, methods and negative/null results, with uncertainty intervals—not simply averaged into one impressive score.

## Read-only indicative OpenRouter cost ladder

**Verified catalogue time:** 22 Nov 2026 ~10:02 UTC; metadata from `GET https://openrouter.ai/api/v1/models`. Scenario: **100 independent requests, each 4,000 input tokens + 1,000 output tokens**; token list prices only in USD, exclusive of reasoning-token overhead, retries, caching, tools, provider-specific pricing, taxes and human review. **These are price estimates, not actual spend, performance measurements or provider availability checks.**

| Escalation tier | Example exact model ID | Indicative 100-request price |
| --- | --- | ---: |
| Free model | `baidu/ernie-5.5-flash-preview:free` or `inclusionai/ling-3.2-flash:free` | $0 on current *model list*; fresh endpoint + privacy eligibility still mandatory |
| Economy | `deepseek/deepseek-v4.1-flash-1017` | $0.12 |
| Economy | `qwen/qwen3.8-27b` | $0.164 |
| Midrange | `google/gemini-4-hydrogen` | $1.35 |
| Midrange | `openai/gpt-6.2-sol` / `anthropic/claude-sonnet-5.5` | $1.80 each |
| Frontier | `anthropic/claude-opus-5.5` | $3.60 |
| Frontier | `openai/gpt-6.2-astra` | $7.20 |
| Frontier premium | `openai/gpt-5.5-pro` | $30.00 |

**No paid-model scientific ranking is claimed.** A cheaper model may be more accurate on an HPI task than a frontier model; only controlled tests can decide. OpenRouter announced **22 Nov 2026** that [125 inference endpoints were removed from ZDR eligibility](https://openrouter.ai/blog/announcements/data-processing-incidents-on-inference-providers/). Model-list `free` pricing does **not** establish endpoint compliance. See [OpenRouter's ZDR guidance](https://openrouter.ai/blog/insights/zero-data-retention/). Never transmit identifiable community/beneficiary information, private reviewer notes or unlicensed documents to a cloud model.

## Four practical workstreams and current gates

### A — Independent scientific benchmark (external expert input required)

1. Prepare an **externally assessed sample of at least 100 distinct cases per task** (ideally ≥500 total across five tasks, balanced across null/adverse and causal/non-causal findings). Use genuinely licensed published research, exact versioned sources, sampling strata and a held-out split not revealed to candidate models.
2. Obtain two qualified reviewers to annotate evidence and methods **independently**; adjudicate discrepancies, cite full-text methods/limitations, register irreducible dissent and conflict of interest. Create a dated non-sensitive audit receipt on an authorised issue. Do not publish identifiable participant or private reviewer details.
3. The model should return confidence intervals derived from **observed correct/incorrect counts**, not from self-reported LLM confidence. Repeat test after prompt/model/provider changes.
4. Evaluate failure severity and scientific reproducibility; any unresolved fabricated causal effect or misleading comparison blocks admission.

**State:** task definitions and deterministic gate implemented; real independent sample and reviews **NOT CREATED**. The 140 synthetic tests are engineering probes, not a substitute.

### B — Existing free providers (conditional on credentials + live permissions)

Test `baidu/ernie-5.5-flash-preview:free` and `inclusionai/ling-3.2-flash:free` on *the same precommitted references* using the panel runner and privacy/cost fail-closed policy; compare against local baselines and disclose uncertainty. **Actual OpenRouter cloud-panel inference not run during this task**: the authorised HPI shell did not expose an OpenRouter key. Do not extract credentials from other apps or claim success for a non-existent run.

The **new scientific panel CLI defaults to `zdr` plus `data_collection=deny` for its OpenRouter leg**, and fails closed if no current endpoint satisfies both. The existing older free-only research CLI still defaults to `data_collection=deny`: this limits provider collection/training under OpenRouter's declarations but is **not equivalent to ZDR**. A live **public metadata-only** `GET /api/v1/models?zdr=true` on 22 November listed Ling 3.2 Flash (`:free`) but did **not** list ERNIE 5.5 Flash (`:free`). The model list does not verify the current inference endpoint's additional no-training policy, so actual call-time checks remain mandatory. If no second independently sourced ZDR+deny model qualifies, the panel can pair **local Qwen + verified ZDR cloud Ling**, or fail closed; it must never silently relax privacy. No router `openrouter/free` (random model and reproducibility loss), no provider fallback to paid.

**State:** infrastructure and real offline/local smoke PASS. Cloud-panel test PENDING key/runtime + current endpoint permissions, not blocked by a request to buy service.

### C — Paid escalation (planning only, not authorised)

If the free models fail scientific quality tests, request a **separately approved** maximum dollar spend and API key guardrails for a tiny, predefined pilot on public-source-only cases. Begin at *economy* with the **same independent test set**, then midrange, then frontier **only when earlier models fail or justify escalation**. Compare *error rate and harm-weighted errors per dollar*, not merely cost or vendor claims. Include privacy/residency reviews for each chosen real inference endpoint. Never automatically route retries to a paid model.

**State:** 13-model dated list and bounded cost estimator delivered. No paid key, payment, calls, endpoint audit or approval sought/exercised.

### D — Human-reviewed publication ladder

| Output class | Automatic publication | Evidence gate |
| --- | --- | --- |
| Verified public official statistic / deterministic arithmetic | **Only in principle**, with approved publication integration | Verified first-party source, per-file legal reuse rights, exact dataset/method versions, no personal data, deterministic reproduction |
| New AI summary of a published research source | **No automatic approval** | Source and negative/null checks; evidence status `pending_human_review`, actual reviewer decision needed |
| Causal intervention ranking / mechanisms or predicted prosperity impact | **No** | Independent scientific methods review, replicability, uncertainty bounds and accountable institutional authorisation |
| Individual financial/benefit, health or eligibility recommendation | **Prohibited** in current HPI scope | Not enabled by any success rate |
| Human-subject fieldwork or personal data collection | **NO-GO_FIELD** | Separate lawful study sponsor, ethics, safeguarding, controller and community consent gates |

## Reproduction commands (no paid calls)

```sh
npm run ai:science -- plan        # existing internally curated model metrics, no requests
npm run ai:science -- costs       # public OpenRouter catalogue GET only
npm run ai:science -- challenges  # 140 synthetic scanner probes; no model requests

# Explicit local experimental run (requires two installed models, no cloud):
HPI_AI_PROVIDER=local npm run ai:science -- run --allow-inference \
  --task claim-extraction --item-ids claim:E08,claim:E13,claim:synthetic:INJ-2 \
  --models qwen3.5:4b-q4_K_M,qwen3.5:9b

# Free-only cloud experiment, only when a legitimate HPI OpenRouter secret and
# *currently qualifying* endpoints are actually available:
HPI_AI_PROVIDER=local npm run ai:science -- run --allow-inference \
  --task claim-extraction --item-ids claim:E08,claim:E13 \
  --models local::qwen3.5:4b-q4_K_M,openrouter::inclusionai/ling-3.2-flash:free

# The OpenRouter leg requires OPENROUTER_API_KEY in the authorised HPI shell.
# If current ZDR or deny-collection requirements fail, NO cloud request is made.
```

Private model replies are written to `qa-artifacts/ai-scientific-panel/` (gitignored) with file mode `0600`; do not copy them into the public repository or a document. CLI `costs` is a public model-metadata GET and does not accept a token or issue inference requests. The new code does not modify the existing 46-item evaluation set, historical benchmarks, public AI gateway or any financial configuration.

### Next acceptance decisions

- **Engineering:** all new module/unit tests plus full HPI site checks and required Chromium/Vercel statuses on the PR SHA; safe local smoke and latest production SHA checked after merge.
- **Scientific:** independent reference panel, at least 100 adjudicated cases per task, credible effect/citation/causality assessment, and evidence-based error thresholds — **NOT DONE**.
- **Cloud:** live OpenRouter free-model comparison under verified current endpoint privacy and existing quota — **NOT DONE** in this task.
- **Financial:** first approved paid spend limit, owner, stop conditions and exact provider/route — **NONE AUTHORISED**.
- **Public inference:** stays disabled, no auto-published AI claims. Do not call this a scientific release or fieldwork approval.

Tracking: [HPI-AI #101](https://github.com/svtmzt/human-prosperity-initiative/issues/101), [scientific independent review #19](https://github.com/svtmzt/human-prosperity-initiative/issues/19), [HPI-SCALE human gate #103](https://github.com/svtmzt/human-prosperity-initiative/issues/103).
