# RT-02.6 — International Prosperity Data Explorer: 21 November 2026 desk reassessment V0.2

**Classification:** public-source discovery only. **Decision: NO-GO for building or releasing a new international data explorer.** This report does not authorise ingestion, licensing, spending, user recruitment, personal-data processing or scientific claims. The existing [V0.1 feasibility report](RT-02-6-data-explorer-discovery-v0.1.md) remains the historical baseline; the latest official statistical release is considered here.

## The actual user problem — hypotheses, not observed user demand

Three *hypothetical* audiences might need a comparison tool: (1) researchers verifying the definition behind each official statistic, (2) local practitioners checking what aggregate context can and cannot establish, and (3) analysts comparing methods and collection periods across countries. **No interviews, usability sessions, survey responses, letters of support or actual organisational adoptions have occurred.** Do not present these personas as validated users, and do not approach potentially vulnerable community members without the HPI safeguarding and institutional gates.

Our existing [Source Catalogue](/research/source-catalog), [Newham research case](/projects/newham), and [Reproducibility](/research/reproducibility) already serve transparent public-source discovery without pretending that incompatible population measures are comparable. Any added explorer must demonstrate additional value over these functioning first-party tools.

## Five concrete official source entry points and restrictions

| Source inspected | Possible scope and value | Explicit comparability / rights limitations before reuse |
| --- | --- | --- |
| [DWP 2023/24 potentially eligible Pension Credit local model](https://www.gov.uk/government/statistics/households-potentially-eligible-for-pension-credit-2023-to-2024/analysis-of-households-potentially-eligible-for-pension-credit-and-eligible-households-in-receipt-of-pension-credit-2023-to-2024) | Modelled eligible households by local authority, including Newham's historical **78% household receipt** model | Not independently verified eligibility or payment outcomes in an HPI cohort; no lawful individual-level access assumed. Preserve modelling assumptions, table version, household denominator, exclusions and local-authority geography. |
| [DWP national income-related benefit take-up, FYE 2025 (published 22 October 2026)](https://www.gov.uk/government/statistics/income-related-benefits-estimates-of-take-up-financial-year-ending-2025) and [methodology](https://www.gov.uk/government/statistics/income-related-benefits-estimates-of-take-up-financial-year-ending-2025/background-information-and-methodology-for-financial-year-ending-2025) | National take-up ranges and methods for income-related benefits | This is a **different period, survey/model methodology and population unit** from Newham's local 2023/24 household receipt figure. Do not plot them on one axis as equivalent local-versus-national take-up. Distinguish caseload from expenditure, survey from administrative records and uncertainty bands. |
| [ONS reuse licence guidance](https://www.ons.gov.uk/methodology/geography/licences/) | Official geographies and statistical series, frequently reusable under the [Open Government Licence](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) | Verify each dataset, map, third-party contributor, OGL attribution, geographic boundary version, redistribution and API terms. An ONS site-wide licence summary is not proof that every linked asset is covered. |
| [London Datastore guidance](https://data.london.gov.uk/guidance) | London and borough-level published open datasets and data dictionaries | Dataset-specific uploader/owner licensing, release versions, small-cell privacy and access permissions may differ. “Available to view” does **not** by itself license redistribution. |
| [World Bank Poverty & Equity dataset catalogue](https://datacatalog.worldbank.org/search/dataset/0038020/poverty-and-equity-database-poverty-and-inequality-platform) | National poverty/inequality research for a later *separate* country-level view | Verify current PIP methodology, survey vintage, currency/PPP base, licence and provenance per series before plotting or downloading; not comparable by default with a UK local Pension Credit denominator. |

This table links **potential sources**, not vetted production feeds. No third-party bulk data are imported or copied into HPI here; licences and per-file reuse still need a qualified review (RT-GATE-01 G-03).

## Reproducible source-to-chart contract — proposed, not implemented

Before allowing a single real aggregate series, require these fields and check each against the source: `publisher`, `source_url`, `source_publication_date`, `retrieved_at`, `dataset_version`, `file_sha256`, `rights_and_attribution`, `geography_id`, `geography_level`, `population_unit`, `denominator`, `metric_definition`, `time_period`, `data_collection_method`, `value`, `unit`, `uncertainty`, `missingness`, `supersedes`, `review_state`. Unknowns stay explicitly unknown, not zeros.

**Cross-series rule:** default to *separate contextual panels* when units or methods differ. A shared chart/ratio requires a source-supported crosswalk, independent methodological sign-off and meaningful compatible units; do not combine or average incompatible local household and national benefit-unit estimates. Never imply causal attribution to HPI.

**Privacy rule:** licence permission is not sufficient for aggregate safety. Before data import or open sharing require a small-cell and linkage-risk assessment, no identifying case records, lawful data access, transparent corrections and a qualified human data-controller/ethics decision where applicable.

## Decision, bounded alternatives and budget

**Current decision: NO-GO BUILD.** The conditions for a launch are unmet: no independently confirmed user need, no approved per-dataset licence ledger, no defensible cross-geo metric equivalence, no independent methods review, no privacy sign-off and no funded/owned maintenance programme.

The *incremental external API spending authorised for this discovery is £0*. The deliverable is source-linked desk research using the existing GitHub repository and free hosting. **A future build budget is unknown**, not £0: it would need actual storage, request-rate, hosting, security, data-licence, accessibility, human-maintenance and source-update costs. No new provider or paid subscription is requested.

A reasonable next scoped gate, **only after real sponsor and qualified reviewer authorisation**, would be one legally reusable *public aggregate* series, a provenance-forward static display, two independently reviewed user tasks and manual/automatic accessibility verification. It may still conclude NO-GO if existing tools already suffice.

### Decisions that remain with people, not the software

- Actual partner/analyst user-demand review and consent-safe feedback process: **not performed** (RT-02.6 T01).
- Per-file source licence and potential dataset transfer risk: **not signed off** (RT-GATE #67).
- Scientific crosswalk/claims and affected-community oversight: **not obtained** (#19, #82).
- Institution/controller, safeguarding and public-user acceptance: **not established** (#26, #51, WEB-03.5).
- Explorer build authorisation: **NO-GO**, pending the preceding evidence.

**This V0.2 closes the autonomous *desk reassessment* only, not the human user-research, licensing, legal or fieldwork gates.** No research participant data, outreach or invented partners were used.
