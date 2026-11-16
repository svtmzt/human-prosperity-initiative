# HPI current-state audit — 16 November 2026

**Purpose:** an evidence-backed baseline taken before the Global Prosperity Platform transformation (HPI-SCALE). Every statement below was checked in this session against source code, GitHub, CircleCI or repository data; where something could not be checked it is marked as such.

## Repository and release state

| Item | Verified state | Evidence |
|---|---|---|
| Canonical repository | `svtmzt/human-prosperity-initiative`, default branch `main` | GitHub API |
| `main` HEAD | `9b22acdf079e5219a123488333f2fe1a10c43d7a` (RT-02, PR #95, 12 Nov 2026) | GitHub commit list |
| Open pull requests | None | GitHub API |
| Open issues | 16, including human gates #10, #19, #26, #51, #67, #82, #85, #86, #89 | GitHub API |
| Production revision | Matches `main` 9b22acd: the scheduled CircleCI `public-operations-watch` compares `/publication.json` with GitHub `main` and the CircleCI and Vercel commit statuses, and passed daily from 13 to 16 Nov 2026 (last run 16 Nov 07:02 UTC) | CircleCI pipeline history |
| Direct production check from this session | **Not possible**: the session's network policy blocks the production host | Proxy refusal |
| Local baseline tests | `npm run check` passed: 166 of 166 tests | Local run |

## Architecture (unchanged foundation)

- Custom Node.js 22 static generator (`scripts/build.mjs`), ES modules, no runtime dependencies; output in `dist/`.
- Vercel static hosting with a restrictive Content-Security-Policy (`default-src 'none'`, `script-src 'self'`, no inline styles or scripts).
- Two read-only serverless functions (`api/freshness.js`, `api/issues.js`) for publication freshness and the public issue feed.
- CircleCI `website-quality` then `browser-accessibility` (Playwright 1.64.1, axe 4.14.0); a scheduled `public-operations-watch`. No GitHub Actions.
- `db/migrations/001_research_registry.sql` exists but there is no HPI application database in use; ADR-0003 kept research offline and file-based.

## Research assets reused by the platform

| Asset | State |
|---|---|
| Evidence ledger | 39 references (E01–E39) across benefit access, essential costs and economic opportunity, plus global context |
| Structured extraction | 34 abstract-level rows; no formal risk-of-bias assessment |
| Indicator catalogue | 15 draft F0-03 indicators, all `proposed_not_validated` |
| Newham | DWP 2023/24 local model row byte-verified (SHA-256 recorded) in NEW-02; fieldwork NO-GO |
| Recife, Naples | Desk shortlist with official links and a few transcribed figures; no local eligible-but-not-receiving measure |
| Source Catalogue, Synthetic Outcome Lab, Reproducibility Pipeline, Responsible Tools | Published and tested (RT-01, RT-02) |
| Governance gates | G-01 to G-08 all pending |
| RT-02.6 | Explicit NO-GO on building a real-data cross-country explorer until licences, comparability and user need are verified |

## Cross-system state

- **HubOS:** HPI exists once, as company record `human-prosperity-initiative` of type `public-initiative`, with F0 initiatives and the RT-01 mirror (HubOS repository at `2aef0b9`). Production writes require a CAS-guarded Neon transaction. **No Neon or HubOS production access is available in this session.**
- **SolOS:** read-only HPI projection; not modified.
- **Vercel:** one HPI project; no Vercel API access from this session. Hobby tier; deployment quota previously reached.
- **AI inference:** no local model endpoint is reachable in this environment; no provider credentials are configured for HPI.
- **Mac:** no connected Mac was available; all work ran in a cloud Linux container.

## Implications for the transformation

1. Extend the static generator; no framework migration or database is justified.
2. Respect RT-02.6: build a citation-and-provenance knowledge base, not a dataset explorer.
3. HubOS synchronisation must be delivered as a precise pending manifest, not claimed.
4. AI must ship as a tested adapter with a transparently disabled production state.
5. Production verification must rely on CircleCI and Vercel commit statuses plus the ops watch, because the site host is unreachable from this session.
