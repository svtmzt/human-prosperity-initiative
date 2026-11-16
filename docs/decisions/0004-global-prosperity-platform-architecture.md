# ADR 0004 — Global Prosperity Platform on the existing static architecture

**Status:** Accepted for bounded technical implementation (HPI-SCALE), 16 November 2026.
**Scope:** software architecture, data contracts and public presentation. Does **not** authorise fieldwork, personal data processing, partnerships, paid services, new infrastructure or scientific approval of any method.

## Context

HPI is moving from isolated case studies to a four-pillar platform (Intelligence, Solutions, Adoption, Systems Lab). The existing system is a dependency-free Node.js 22 static generator on Vercel with a strict Content-Security-Policy, CircleCI build and browser-accessibility gates, and offline, content-addressed research artifacts ([ADR-0003](0003-offline-research-pipeline.md)). The [RT-02.6 decision](../RT-02-6-data-explorer-discovery-v0.1.md) set a NO-GO on building a real-data cross-country explorer until licences, comparability and user need are verified.

## Decision

1. **Extend, do not migrate.** Keep the static generator. New pages are produced by `scripts/platform-*.mjs` modules called from `scripts/build.mjs`. No React/Next.js, no runtime server, no new dependency.
2. **Versioned JSON knowledge base, no database.** `research/platform/*.json` (schema 1.0) holds contexts, programmes, figures, measurement gaps, claims, mechanisms, interventions, problems, solutions, adoption, Systems Lab and corrections. All content is public, small and reviewed through pull requests; there is no concurrent, authorised write path that would justify Neon or another database. Revisit only if authenticated multi-user curation becomes a verified need.
3. **The build is the validator.** `research-tools/prosperity-platform.mjs` enforces the data contract; any violation fails `npm run build` and therefore CircleCI and Vercel. Exports are byte-deterministic and digested in `/platform-manifest.json`.
4. **Scope relative to RT-02.6.** The Intelligence pillar is a **citation-and-provenance knowledge base**, not a dataset explorer: it records published figures with attribution and declared rights, and links to sources. The RT-02.6 NO-GO on ingesting or redistributing third-party datasets, automated source feeds and pooled cross-country comparison **remains in force**. Comparisons are rendered only where measures are compatible; otherwise the incompatibility is explained.
5. **Shared deterministic modules.** The household model and evaluation planner are browser-safe ES modules published verbatim (`/systems-lab-model.js`, `/evaluation-design.js`) and also used at build time, so precomputed and interactive results come from the same code.
6. **AI behind a disabled-by-default adapter.** `research-tools/ai-assist/` supports OpenAI-compatible endpoints (local runtimes by default), refuses known paid hosts without a recorded approval, validates and citation-checks output, and writes only to a git-ignored review queue. Production has no inference provider; the site discloses this.
7. **Navigation.** One primary item, *Platform*, leads to a hub for the four pillars, keeping seven top-level items rather than ten. Mobile navigation lists the pillars directly. Existing routes are unchanged.
8. **Localisation.** English is the primary language. An Italian platform summary is published and labelled as partial and unreviewed. Full localisation needs a reviewed message catalogue and is deferred rather than duplicating pages.

## Alternatives considered

- **Framework migration** — rejected: no capability requires it and it would risk the accessibility and CSP baseline.
- **Neon/Postgres knowledge base** — rejected for now: adds secrets, preview-isolation concerns (GOV-01) and cost without a stateful need.
- **Live API ingestion (World Bank, ONS, IBGE, INPS)** — deferred: RT-02.6 gates; licences and comparability unverified; build-time network access would make outputs non-reproducible.
- **Paid hosted LLM** — rejected without explicit cost approval.

## Consequences

- Adding coverage is a pull request to JSON files plus `npm run check`.
- Contributors must declare missing provenance explicitly; this slows data entry deliberately.
- Larger corpora (thousands of records) may eventually need incremental builds; not a current constraint.

## Verification

Accepted only when `npm run check` and `scripts/browser-qa.mjs` pass locally and CircleCI `website-quality` and `browser-accessibility` plus the Vercel status pass on the reviewed commit.
