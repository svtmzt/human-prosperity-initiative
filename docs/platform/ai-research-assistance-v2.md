# AI research assistance V2 — local and verified-free cloud inference

**Updated 22 November 2026.** The internal research tool has both the verified-free OpenRouter held-out evaluation ([16 Nov report](ai-evaluation-2026-11-16.md)) **and real local Ollama 4B/9B held-out evaluation** ([22 Nov report](/library/docs/platform/ai-local-benchmark-2026-11-22)). The 46-case local run found a fabricated-effect prompt-injection candidate from 9B in the **private review queue**, prompting additional source quarantine and claim-validator hardening with regression tests. **None of these automated scores has been independently adjudicated or authorised as scientific evidence. The public website performs no inference and publishes no AI-generated content.** The hosted gateway library is **not deployed**; local Ollama is accessible only on the founder's machine, not to the public build environment. Supersedes the provider sections of [V1](ai-research-assistance-v1.md); V1 safeguards remain in force.

Distinguish these achievements — they are different:

| Achievement | State |
|---|---|
| Adapter implemented (local, OpenRouter, generic) | Yes |
| Provider connected | OpenRouter: yes (internal CLI, key in the session's secret store). Local: Ollama 0.40.16 on the founder's Mac (5 models discovered) |
| Real inference tested | Yes: OpenRouter free models (46-item evaluation); local `qwen3.5:4b-q4_K_M` **and** `qwen3.5:9b` on the same 46-item HPI reference set, 22 Nov 2026 ([comparison](/library/docs/platform/ai-local-benchmark-2026-11-22)) |
| Research quality evaluated | Automated agreement with HPI's own curated reference; **no independent or human expert review yet** |
| Public inference securely enabled | No |
| Production-scalable service | No |

## Operating modes

1. **Internal research — local** (`HPI_AI_PROVIDER=local`). Loopback only (`localhost`, `127.0.0.1`, `::1`); the model list is discovered from `/v1/models` (or Ollama `/api/tags`). Runtimes: `ollama` (11434), `lmstudio` (1234), `llamacpp` (8080), `litellm` (4000), `other`. Text never leaves the machine. Never expose these ports to the internet; for a shared lab server use an authenticated HTTPS gateway with `HPI_AI_PROVIDER=openai_compatible` and `HPI_AI_ALLOWED_HOSTS`.
2. **Internal research — verified free cloud** (`HPI_AI_PROVIDER=openrouter`). For researchers without AI-capable hardware.
3. **Limited public cloud** — `research-tools/ai-assist/gateway.mjs`, not routed. See [activation](#public-gateway-activation).
4. **Institutional / sponsored capacity** — interfaces only: an organisational OpenAI-compatible gateway (`openai_compatible`, allowlisted HTTPS host) or an institution-held key with the same free-only or a separately approved budget. Nothing is provisioned, and paid routes require a separate approval recorded in #103.

### Local models: Ollama specifics and a real sample run

A founder test on 16 Nov 2026 (Ollama v0.40.16 on a Mac) found that HPI tasks through Ollama's OpenAI-compatible `/v1` endpoint failed safely: `truncated` with Qwen 3.5 4B and `empty_output` with Nemotron 3 Nano 4B. Basic inference worked. Two Ollama behaviours explain this: `/v1` does not reliably accept `think:false`, so reasoning models spend the budget thinking; and Ollama's small default context window (`num_ctx`) cannot be raised through `/v1`, so long grounded prompts plus the answer hit `done_reason: length`.

For `HPI_AI_LOCAL_RUNTIME=ollama` the adapter therefore uses the **native `/api/chat`** API (`HPI_AI_LOCAL_API=native`, the default), which sends:
- `think:false` (retried without it if a model rejects the field);
- the task's JSON schema as `format` (then `"json"`, then prompt-only);
- `options.num_ctx = HPI_AI_LOCAL_NUM_CTX` (default 16384) and `options.num_predict = HPI_AI_MAX_OUTPUT_TOKENS`.

`done_reason:"length"` is always treated as a truncation, and output that contains only thinking text is treated as reasoning exhaustion. Neither is ever accepted. Set `HPI_AI_LOCAL_API=openai` to use `/v1` instead; LM Studio, llama.cpp and LiteLLM always use it.

**Live local result (16 Nov 2026, founder-run on head `3e21274`, [evidence](https://github.com/svtmzt/human-prosperity-initiative/pull/105#issuecomment-6920780819)):** with real Ollama 0.40.16 and `qwen3.5:4b-q4_K_M`, no mocks:
- `ai:run -- source-classification --ids E04` returned `completed_pending_human_review` with 1 validated queue item, in 4.2 s;
- `ai:extract -- --ids E04` returned `completed_pending_human_review` with 2 validated candidate claims, in 4.3 s;
- 0 failures and 0 blocked items; outputs stayed in private queues.

The 16 Nov test demonstrated the adapter on two bounded tasks; the **22 Nov 46-case comparison of 4B and 9B has now been completed** and revealed both systematic performance limitations and one critical synthetic prompt-injection failure in 9B. Those results are documented with machine-readable aggregate metrics and an explicit post-run source quarantine fix in the [local benchmark report](/library/docs/platform/ai-local-benchmark-2026-11-22). **Independent human expert review remains pending and no model output is automatically publishable.** Embedding-only models (for example `qwen3-embedding:0.6b`) are not chat models; select a chat model with `HPI_AI_MODEL`. Sample run on the researcher's machine:

```
ollama list
HPI_AI_PROVIDER=local npm run ai:local
HPI_AI_PROVIDER=local HPI_AI_MODEL=qwen3.5:4b-q4_K_M HPI_AI_MAX_OUTPUT_TOKENS=1600 HPI_AI_MAX_REQUESTS=1 npm run ai:extract -- --ids E08
HPI_AI_PROVIDER=local HPI_AI_MODEL=qwen3.5:9b HPI_AI_MAX_OUTPUT_TOKENS=1600 npm run ai:run -- source-classification --ids E08
HPI_AI_PROVIDER=local HPI_AI_MODEL=qwen3.5:9b HPI_AI_MAX_OUTPUT_TOKENS=1600 HPI_AI_TIMEOUT_MS=300000 npm run ai:evaluate -- --tasks claim-extraction,evidence-gap-detection
npm run ai:review -- list
```

If a run reports `truncated`, raise `HPI_AI_LOCAL_NUM_CTX` (for example to 32768) and `HPI_AI_MAX_OUTPUT_TOKENS`, then try again. Never relax validation.

## Free-only policy (fixes the V1 OpenRouter blocker)

V1 refused `openrouter.ai` as a known paid host unless `HPI_AI_PAID_USE_APPROVAL_REF` was set. That rule is **kept for the generic adapter** (which has no free-only enforcement). The new `openrouter` provider needs no paid approval because it can only send requests that are verified free:

1. **Model identity.** Only catalogue IDs ending in `:free`. A zero price on any other ID is not free (live example: `google/lyria-3-*-preview` lists $0 tokens but music generation is billed per song). The random router `openrouter/free` is excluded (not reproducible; data policy of the chosen model cannot be checked in advance).
2. **Pricing verification.** Every price component in `GET /api/v1/models` must parse as a number and equal 0, with prompt and completion present and no per-provider overrides. Missing, malformed or ambiguous pricing fails closed. Before a run, `GET /api/v1/models/{id}/endpoints` must show every endpoint zero-priced.
3. **Freshness.** Inference is refused if the catalogue is older than `HPI_AI_CATALOG_MAX_AGE_HOURS` (default 24). A stale cache can still be displayed but cannot authorise inference. Refresh is explicit (`npm run ai:discover -- --refresh`) or happens only when the cache is stale.
4. **Request guard.** Every request carries `provider.max_price = {prompt:0, completion:0, request:0, image:0}`, `allow_fallbacks:false`, `data_collection:"deny"` and never a `models` fallback array (OpenRouter documents that fallback arrays bill paid models).
5. **Response verification.** The served `model` must be the requested free model and `usage.cost` must be 0. Any non-zero cost or unexpected model discards the output and opens the circuit breaker.
6. **Selection policy.** `research/ai/model-selection-policy.json` lists tested defaults per task, permitted free fallbacks and exclusions with evidence. Fallback is client-side, only within that list, and only on model-level unavailability.
7. **Budget.** The account's own state is read from `GET /api/v1/key` (free-request counter, spend). Evaluation records spend before and after.

**Account finding (16 Nov 2026):** the configured key belongs to an account that has purchased credits at some time (`is_free_tier:false`, 1,000 free requests/day) and the key has a **$5 credit limit with $5 remaining**, so the key itself *could* pay for paid models. HPI's protections above do not depend on the key limit. **Founder decision (16 Nov 2026): the $5 limit is kept deliberately**, to allow future tests with stronger paid models. Such tests are not authorised by this release: they need an explicit approval and budget recorded in #103 and a separate, capped paid mode that does not exist yet. The free-only provider has no paid path.

## Data routing and privacy

`research-tools/ai-assist/policy.mjs` classifies every input before a request is built:

| Data class | Local | Free cloud | Approved remote |
|---|---|---|---|
| Public research metadata (HPI-authored summaries and attributed figures already published) | ✓ | ✓ | ✓ |
| Redistributable excerpt (licence permits redistribution) | ✓ | ✓ | ✓ |
| Copyright-restricted material | ✓ | ✗ | ✗ |
| Internal research draft | ✓ | ✗ | ✗ |
| Sensitive or identifying information | ✗ | ✗ | ✗ |
| Real beneficiary or case record | ✗ | ✗ | ✗ |

Unclassified text defaults to *internal draft* (local only). Personal-data indicators (email, UK NI, NHS, CPF, codice fiscale, phone, case/claim references, date-of-birth phrases) reclassify text as sensitive. The evaluation and CLI send only evidence-ledger summaries and context dossiers built from figures already published on the HPI site; the qualified licence review of transcribed third-party figures (G-03) remains open.

**Provider data practices.** By default requests use `data_collection:"deny"` (OpenRouter routes only to endpoints it records as not storing prompts for training; OpenRouter notes this is its best knowledge, not a guarantee). `HPI_AI_OPENROUTER_DATA_POLICY=zdr` additionally requires OpenRouter's Zero Data Retention list. HPI claims ZDR only for that mode and only for endpoints on `GET /api/v1/endpoints/zdr` — on 16 Nov 2026 the only ZDR-listed free text model was `inclusionai/ling-3.2-flash:free`. Live probes showed NVIDIA, Liquid and Particle free endpoints fail the deny filter (they may train on prompts); they are excluded. OpenRouter may retain Safety-Retention data and screens all traffic for CSAM. No geographic restriction is enforced (in-region routing requires a paid OpenRouter plan); this is acceptable only for public research metadata.

**Before any hosted (public) use**: a privacy notice, a data-protection assessment, the accountable controller (WEB-03.6, #89), and explicit founder/legal approval in #103.

## Quotas, rate limits and errors

OpenRouter documents (16 Nov 2026): free variants 20 requests/minute; 50/day for accounts with fewer than 10 credits purchased, 1,000/day otherwise. Failed requests can count. HPI adds:

- per-run request and input ceilings (`HPI_AI_MAX_REQUESTS`, `HPI_AI_MAX_INPUT_CHARS`), output ceiling (`HPI_AI_MAX_OUTPUT_TOKENS`, plus a bounded reasoning allowance only for models whose reasoning cannot be disabled);
- a per-run attempt ceiling `maxRequests × (1+maxRetries) + models`, and an application daily ceiling `HPI_AI_DAILY_REQUEST_CEILING` (default 40, file ledger in `qa-artifacts/`);
- client pacing `HPI_AI_MIN_INTERVAL_MS` (default 3.5 s ≈ 17/min);
- error taxonomy: **account** (401 auth, 402 credit, daily quota, 403 budget/guardrail, non-zero cost, wrong model) opens the breaker — no further request to any model; **model** (shared-pool 429, no endpoint matching the data policy, gated, removed) may move to the next permitted free model and, after 3 consecutive failures, skips that model; **transient** (timeout, 5xx, per-minute limit with a short reset) gets one bounded retry with backoff; **request** (context limit, refusal, invalid output, truncation) is recorded, never retried;
- capability-aware structured output: native `json_schema` (strict) where `structured_outputs` is supported, `json_object` where `response_format` is supported, otherwise prompt-constrained JSON; a 400 on a format parameter downgrades once. Output is always parsed strictly (bare JSON or a single code fence) and validated against the source; truncated, empty or reasoning-exhausted outputs are failures.

## Research workflows

Tasks (prompts versioned and fingerprinted in `safeguards.mjs`): `claim-extraction`, `source-classification`, `mechanism-tagging`, `evidence-gap-detection` (stage coverage for Newham, Recife, Naples dossiers), `contradiction-detection` (two sources). Pipeline: routing policy → injection quarantine → budget → request → validation (verbatim quotes of ≥3–4 words, every number in a claim present in the source, vocabularies, no recommendation/eligibility/certainty language, no instruction echo) → provenance (requested and served model, upstream provider, generation id, structured mode, parameters, prompt hash, cost verification, data classes) → private queue `qa-artifacts/ai-review-queue/`. `npm run ai:review -- decide …` records a named reviewer's decision; nothing is promoted automatically — promotion is a human-authored PR to `research/platform/*.json`. Structured research-summary drafting is **not implemented** (sentence-level human evaluation would be required first).

## Commands

```
npm run ai:status                                   # offline, secret-free
HPI_AI_PROVIDER=openrouter OPENROUTER_API_KEY=… npm run ai:discover -- --refresh
HPI_AI_PROVIDER=openrouter OPENROUTER_API_KEY=… npm run ai:quota
HPI_AI_PROVIDER=openrouter OPENROUTER_API_KEY=… npm run ai:extract -- --ids E08
HPI_AI_PROVIDER=openrouter OPENROUTER_API_KEY=… npm run ai:run -- contradiction-detection --pairs E29:E30
HPI_AI_PROVIDER=local HPI_AI_LOCAL_RUNTIME=ollama npm run ai:local
npm run ai:eval:set -- --check
HPI_AI_PROVIDER=openrouter OPENROUTER_API_KEY=… npm run ai:evaluate -- --models a:free,b:free --publish
npm run ai:review -- list
```

Keep the key in a local secret store or a git-ignored `.env`; never in the repository, the browser or the build. Node's built-in `fetch` does not use `HTTPS_PROXY` unless `NODE_USE_ENV_PROXY=1` is set (needed in proxied environments such as the cloud session that ran the evaluation).

## Public gateway activation

The gateway accepts only `{task, sourceIds}` (1–3 public evidence-ledger IDs; no URL, model, prompt or free text), authenticates bearer tokens against SHA-256 digests, enforces per-user per-minute, per-user daily and shared daily ceilings in a store that must declare `durable:true` with an atomic increment, returns results only to the caller with `Cache-Control: no-store`, and inherits all free-only protections. It refuses to run (HTTP 503, no network) unless **all** hold:

1. `HPI_AI_GATEWAY_ENABLED=true`;
2. `HPI_AI_GATEWAY_APPROVAL_REF` → GitHub issue recording founder, privacy and legal approval (#103);
3. a durable quota store (for example a free-tier Redis-compatible KV) registered as a tracked resource under GOV-01 with owner, cost, review date and rollback — **not created**;
4. `HPI_AI_GATEWAY_TOKEN_SHA256` listing issued researcher tokens (anonymous public use would need an identity provider and abuse controls — not available);
5. the OpenRouter key as a server-side secret only;
6. a fresh catalogue available to the function.

Then add `api/ai-research.js` wrapping `createResearchGateway`, set a function duration within the Vercel plan limit (observed free-model latency is seconds to tens of seconds), and run the gateway tests plus a manual smoke test. A single shared free key cannot serve worldwide traffic (1,000 requests/day for this account); the shared daily ceiling must stay below it, and the page must explain when shared capacity is used up.

## Temporary resource register (GOV-01)

| Resource | Owner | Linked | Created | Cost / quota | Review | Cleanup / rollback |
|---|---|---|---|---|---|---|
| OpenRouter API key stored as a network secret on the founder's personal cloud environment "HPI portfolio (HPI + HubOS)" for `openrouter.ai` | Founder | #101 | 2026-11-16 | $0 spent; free-request quota only; key credit limit $5 kept by founder decision for possible future approved paid tests | 2026-11-23 | Remove the secret in the environment settings or revoke the key in OpenRouter; no code depends on it |

No database, Vercel project, deployment, CircleCI job or subscription was created.
