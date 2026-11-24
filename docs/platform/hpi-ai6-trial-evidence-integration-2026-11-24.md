# HPI-AI.6 — Empirical evidence lane in the autonomous research cycle

24 November 2026. The previously released scoped experimental reproduction (PR #122) is now available as a separately enabled evidence lane of the autonomous research controller. It does not certify SNAP/EITC or publish new science.

## Reproduce

Use the same isolated Python 3.12 environment with pyreadr 0.5.4 documented in the previous experimental report. Set HPI_TRIAL_PYTHON to its trusted absolute interpreter path if it is not already available as python3.

    npm run ai:science:auto -- plan --with-trial-evidence
    HPI_TRIAL_PYTHON=/absolute/path/to/venv/bin/python npm run ai:science:auto -- run --allow-local-inference --with-trial-evidence --item-ids claim:E08,claim:E13

The new option invokes the fixed Python source script using an argument vector, no shell, a bounded 90-second timeout and 32 KiB output limit. It accepts only the expected study DOI, teaching release, SHA-256 source hashes, exact observed counts, numerical checks, sample balance and privacy/publication invariants. The output is projected onto a closed aggregate schema; extra fields and any raw rows are discarded. Failure is explicit; no model replaces the calculation. Three additional public source GETs are budgeted separately. The trial is evaluated after the existing claim verdicts have been formed and cannot change them. Neither raw data nor the supplementary result is inserted into the model prompts by this lane.

The result reproduces the published rounded Table 1 callback comparison (4,870 fictional applications, 1,323 advertisement clusters; difference 3.203285 percentage points) with independent formulas for advertisement-clustered CR1 inference, not all original statistical models or a new independently validated scientific finding. It is not a finding about actual hires, income, SNAP, EITC or poverty reduction. Source: [original publication](https://doi.org/10.1257/0002828042002561); [prior technical report](https://human-prosperity-initiative.vercel.app/library/docs/platform/hpi-ai6-t073b2-experimental-reproduction-2026-11-24).

## Prioritised next poverty-study candidates (metadata-only discovery)

The [Haushofer and Shapiro Kenya cash-transfer experiment](https://doi.org/10.1093/qje/qjw025) is a priority direct poverty intervention. Its [Harvard Dataverse package](https://doi.org/10.7910/DVN/M2GAZN) V2.0 released manifest declares CC0-1.0 and lists 11 unrestricted files: four tabular files including UCT_FINAL_CLEAN.tab and UCT_Village_Collapsed.tab, and seven tar archives including Erratum.tar. The [published correction](https://doi.org/10.1093/qje/qjx039) must be reconciled before choosing outcomes and analysis specifications. The original trial uses village and household assignment; neither a naive independent-row contrast nor the prior resume-adapter design is appropriate without design-specific review. File content, availability of each actual download and absence of identifying/sensitive participant fields have NOT been checked. No participant data or code downloaded. Metadata alone is not permission to share personal data or proof of replication.

Two additional CC0 package candidates were inspected via Harvard Dataverse metadata: [Targeting the Poor in Indonesia](https://doi.org/10.7910/DVN/M7SKQZ) V6.0 (one ZIP, 36,190,063 bytes); [Cash Transfers, Behavioral Changes, and Cognitive Development](https://doi.org/10.7910/DVN/TN109Y) V1.1 (one ZIP, 1,272,576 bytes). Contents not inspected; no assertions about raw dataset availability or replicability. These are candidates only, and packages must not be executed automatically. Metadata retrieved 24 November 2026.

## Remaining work

Implement a design-specific lawful dataset/aggregate adapter for a direct poverty experiment, verifying corrected version, variable dictionary, randomisation unit, selection, spillovers, outcome and inferential method; keep sensitive records local or excluded. Then extend task-specific AI benchmarking, distinct model families and calibration. T07.3b2 remains in progress. No automatic publication or real-world action is authorised.
