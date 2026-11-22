# HPI-AI.6-T06 — Real-time free-cloud readiness, exact-variant ZDR and comparison gate

**Checked:** 22 November 2026, approx. 12:37–12:45 UTC. **Result:** **technical/privacy/catalogue preflight DONE; authenticated live cloud benchmark NOT DONE** because no HPI-scoped OpenRouter credential was available. No model inference, paid request, beneficiary data or scientific publication was performed. Keep HPI-AI.6-T06 **OPEN / blocked on credential** until actual responses are measured, scored and reviewed.

## What was independently verified via public, no-key GET requests

Sources: [OpenRouter model catalogue](https://openrouter.ai/api/v1/models), [exact endpoint-level ZDR registry](https://openrouter.ai/api/v1/endpoints/zdr), [model-specific endpoints API](https://openrouter.ai/docs/api/api-reference/models/get-models), and [provider controls](https://openrouter.ai/docs/guides/get-started/sovereign-ai). The current [22 November 2026 provider-privacy incident notice](https://openrouter.ai/blog/announcements/data-processing-incidents-on-inference-providers/) documents **125 endpoints removed from ZDR eligibility**, making stale cached badges insufficient.

- The **model-level** `GET /models?zdr=true` returned **8 free-suffixed models** among 336 models. **This is NOT evidence** that the `:free` variants themselves have ZDR endpoints: the parent paid model can independently be ZDR-eligible.
- The **endpoint-level** `GET /endpoints/zdr` returned exactly **3 free-suffixed model IDs** on this check, but two (`perplexity/pplx-decider-flash-v1.3:free` and `perplexity/pplx-decider-v1.3:free`) were **absent from the live public model catalogue**; HPI correctly rejects undiscoverable models.
- Therefore, among the inspected exact text-model variants, **only `inclusionai/ling-3.2-flash:free` satisfied the intersection** of current full-model catalogue, exact-variant ZDR registry, supported text-output mode and verified zero-priced model/endpoint metadata. It was served by the Ant Digital free endpoint in the public response.
- `baidu/ernie-5.5-flash-preview:free`: free endpoint pricing was zero, **but no ZDR endpoint** was listed for this exact model. Historical scientific accuracy scores do not override privacy.
- `google/gemma-4-31b-it:free` and `google/gemma-4-26b-a4b-it:free`: these free variants appeared on the **model-level** `zdr=true` list, but the ZDR endpoint registry entries were for the **paid base models without `:free`**, with non-zero token prices. The free variants **cannot inherit** base-model ZDR eligibility.
- A free list or a zero price is not a privacy guarantee. Even exact ZDR registry membership is OpenRouter/provider policy metadata, **not proof** that an actual provider honors the policy. New cloud calls must enforce `provider.zdr=true` and `provider.data_collection="deny"` at request time and fail closed if no endpoint matches.

**No ordering above represents measured HPI scientific accuracy.** We have a viable *metadata-eligible candidate* (Ling), not a validated scientific model.

## Actual runtime and credentials

The HPI repository and authorised Mac shell had no `OPENROUTER_API_KEY` or `HPI_AI_API_KEY` environment variable; no HPI-scoped `.env` was present and no HPI-named credential was found in the checked Keychain service. No secrets were read from LibreChat or other applications.

Consequently **no authenticated free-cloud request could legally/technically run** from the authorised HPI environment. Falsely claiming a benchmark from local model output, mocked responses or catalogue data would be misleading.

## Engineering implemented for this gate

- `research-tools/ai-assist/free-cloud-readiness.mjs`: bounded, no-auth, GET-only catalogue + exact ZDR registry + per-model endpoint zero-price inspection, with explicit reason codes and **zero inference**.
- `npm run ai:science -- cloud-preflight`: public JSON readiness report (without credentials, model prompts, beneficiary data or costs) showing exact candidate eligibility and whether an HPI key is present.
- `research-tools/ai-assist/runtime.mjs`: when `dataPolicy="zdr"`, reject selected models **before POST** if ZDR endpoint registry is missing or the *exact selected free model* lacks an exact zero-priced ZDR entry. Existing outgoing request additionally enforces both **ZDR and deny collection**, forbids fallback and `max_price:0`.
- `scripts/ai-scientific-panel.mjs`: reject **any explicit downgrade to `deny_collection`** for cloud scientific-panel runs and force a **fresh live catalogue/ZDR refresh** for each cloud candidate; stale cached privacy may not authorise a new experiment.
- New repeatable tests use synthetic public API fixtures, including the particularly dangerous **Gemma `:free` vs paid-base ZDR variant** mismatch. These mocked fixture tests establish guard behaviour, **not scientific model quality**.
- Existing local Qwen multi-model smoke and independent-review requirement remain unchanged. Public inference stays disabled.

## Precise next action once a legitimate HPI key is available

Make a **HPI-scoped** OpenRouter key available securely to the authorised HPI CLI (without committing, exposing, copying from another app, or publishing it). Start with **2–5 public-source-only HPI evaluation items**, compare **Ling Free versus local Qwen 4B** under the same versioned benchmark and record private per-model outputs/aggregate, call counts and actual provider usage. For example:

```sh
cd /path/to/authorised/human-prosperity-initiative
# OPENROUTER_API_KEY is supplied ONLY via your approved secret store/environment.
npm run ai:science -- cloud-preflight

HPI_AI_PROVIDER=local HPI_AI_OPENROUTER_DATA_POLICY=zdr \
 HPI_AI_DAILY_REQUEST_CEILING=10 HPI_AI_MAX_RETRIES=0 \
 npm run ai:science -- run --allow-inference \
 --task claim-extraction --item-ids claim:E08,claim:E13 \
 --models local::qwen3.5:4b-q4_K_M,openrouter::inclusionai/ling-3.2-flash:free

# For *aggregate reference scoring*, the existing HPI evaluator supports:
HPI_AI_PROVIDER=openrouter HPI_AI_OPENROUTER_DATA_POLICY=zdr \
 HPI_AI_MODEL=inclusionai/ling-3.2-flash:free \
 HPI_AI_DAILY_REQUEST_CEILING=10 HPI_AI_MAX_RETRIES=0 \
 npm run ai:evaluate -- --item-ids claim:E08,claim:E13 --no-repeat
```

The CLI must verify current metadata, provider routing and cost before sending anything. The first call should be to a **non-sensitive public-source-only** test. If Ling loses zero pricing/ZDR eligibility, there is **NO-GO** until another exact `:free` endpoint qualifies; never fall back to ERNIE, unqualified Gemma, random free routing, or a paid tier.

After results exist, expand **only within the authorised free quota**, use identical cases across tasks and compare task-specific extraction precision, recall, classification and error severity. Results remain internal with genuine expert review required before public scientific publication.

## State and accounting

| Gate | Result |
| --- | --- |
| Real-time public model/endpoint privacy and zero-price metadata | **PASS** (only Ling qualifies among available pilot candidates) |
| Automated fail-closed runtime and synthetic regressions | **PASS** locally |
| HPI-scoped OpenRouter key available | **NO** |
| Actual free-cloud prompt and model response | **NOT EXECUTED** |
| Real cloud-versus-local accuracy measured | **NOT EXECUTED** |
| Paid model requests or account charges | **NONE INITIATED** |
| Public model inference / scientific conclusion publication | **DISABLED** |
| Independent scientific validity and expert adjudication | **NOT DONE** |

Track: [HPI-AI.6 #111](https://github.com/svtmzt/human-prosperity-initiative/issues/111), [HPI-AI umbrella #101](https://github.com/svtmzt/human-prosperity-initiative/issues/101). This report deliberately does not mark HPI-AI.6-T06 complete without real inference.
