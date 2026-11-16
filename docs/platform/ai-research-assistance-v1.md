# AI research assistance V1 — architecture and safeguards

**Status:** historical V1 record (16 November 2026, morning). **Superseded for providers, routing and evaluation by [V2](ai-research-assistance-v2.md)**, which adds local and verified-free OpenRouter inference and a live evaluation. The safeguards below remain in force. The public website still performs no inference and publishes no AI-generated content.

## Design principle

AI may make research cheaper; it must never make it less trustworthy. Model output is a queue of hypotheses for human review, never evidence, approval or a decision about any person. The platform is fully useful with AI disabled.

## Components

| Module | Role |
|---|---|
| `research-tools/ai-assist/config.mjs` | Reads environment configuration; disabled by default; loopback hosts allowed; remote hosts must be HTTPS and allowlisted; known paid hosts refused without `HPI_AI_PAID_USE_APPROVAL_REF` pointing to an approval issue; never exposes the key |
| `research-tools/ai-assist/providers.mjs` | Disabled provider (no network) and OpenAI-compatible adapter (`/v1/chat/completions`, temperature 0, JSON response format, timeout, no redirects); every failure maps to an explicit non-success status; request and input-size budget |
| `research-tools/ai-assist/safeguards.mjs` | Versioned, fingerprinted prompts; data delimiters; prompt-injection screening; output validation with verbatim quote checks, vocabulary checks and rejection of recommendation, eligibility or certainty language |
| `research-tools/ai-assist/assistant.mjs` | Extraction workflow (quarantine → budget → call → validate → review queue) and a deterministic, rule-based source profiler |
| `scripts/ai-assist.mjs` | CLI: `status`, `baseline`, `extract` |

## Reliability controls

Strict source grounding; citation verification by verbatim quote; schema-constrained output; confidence in [0,1] and explicit abstention; human review queue (`qa-artifacts/ai-review-queue/`, git-ignored, never published); versioned prompts with SHA-256; labels `ai_generated_hypothesis`, `pending_human_review`, `not_evidence_until_human_verified`; correction handling through `corrections.json`; injection defence by quarantine before any request; safe URL rules; per-run request and input ceilings; explicit provider state in `/platform-ai-status.json`.

## Prohibited uses

Certifying research validity; approving interventions; decisions about individuals; publishing model output as evidence.

## Activation (local, no paid API)

```
HPI_AI_PROVIDER=openai_compatible
HPI_AI_BASE_URL=http://127.0.0.1:11434
HPI_AI_MODEL=<local model name>
npm run ai:extract -- --ids E04,E12
```

Optional: `HPI_AI_API_KEY`, `HPI_AI_ALLOWED_HOSTS`, `HPI_AI_MAX_REQUESTS` (default 20), `HPI_AI_MAX_INPUT_CHARS` (12000), `HPI_AI_MAX_OUTPUT_TOKENS` (800), `HPI_AI_TIMEOUT_MS` (30000). The CLI exits non-zero unless validated items were queued.

## Disabling

Unset `HPI_AI_PROVIDER` or set it to `disabled`. The website build does not call any provider; it only reports configuration state.

## What is not yet done

No live model has been tested; no extraction error rates are known. Before relying on any output: run on a held-out set of ledger records with known claims, publish precision and rejection rates, and keep human review mandatory.
