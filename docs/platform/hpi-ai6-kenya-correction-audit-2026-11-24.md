# HPI-AI.6-T07.3b2 — Correction-aware Kenya cash-transfer evidence audit

24 November 2026. This milestone delivers reproducible original-source and corrected-analysis feasibility checks, not a rerun of the Kenya RCT.

## Scientific findings and correction requirements

[Haushofer and Shapiro (2016)](https://doi.org/10.1093/qje/qjw025) used randomisation at village and household levels. The original deposited abstract reports monthly household consumption of $158 and $193 PPP for the comparison nine months after transfers began. The derived difference is $35 PPP (22.15% of the lower rounded amount). This is arithmetic on reported rounded figures, not a new estimated causal coefficient, nor a before/after household comparison.

The [2017 erratum](https://doi.org/10.1093/qje/qjx039), also described in [Princeton's publication record](https://collaborate.princeton.edu/en/publications/erratum-the-short-term-impact-of-unconditional-cash-transfers-to-/), requires:
- Tables I–II: 10,000 rather than 1,000 bootstrap iterations for family-wise-error-rate-adjusted p-values.
- Table III: remove inappropriate household/village weights from the psychological-wellbeing spillover index.
- Table III: include the full original sample when assessing differential attrition for Lee bounds, including observations with missing outcomes. Corrected bootstrap standard errors may also differ.

A naive independent-row regression or the earlier resume-study adapter cannot reproduce this design. The correction link is curated from publication evidence: Crossref did not provide a populated relation field in the inspected records.

[Wang, Qiu and Luo (2019), 3ie Replication Paper 20](https://doi.org/10.23846/RPS0020) independently reported broadly consistent short-term results for consumption, assets, income, food security and psychological wellbeing across robustness checks. Their [publication summary](https://3ieimpact.org/evidence-hub/publications/replication-papers/impact-unconditional-cash-transfers-replication-study) also raises measurement questions concerning some composite indices. This is an external published replication, not one executed by HPI and not a new independent trial.

## Live archive access and reproducibility

The [author archive](https://doi.org/10.7910/DVN/M2GAZN), Harvard Dataverse released V2.0 CC0, lists 11 files including four tabular datasets and Erratum.tar. The [3ie replication archive](https://doi.org/10.7910/DVN/WUUJUO), released V1.0, lists four SAS/Stata scripts and no standalone dataset files. No explicit SPDX licence was present in the second manifest. Neither archive's scripts were run.

Initial HEAD probes using Python returned 403 for the aggregate village file and correction archive; subsequent fixed Node HEAD probes returned 303 redirects. Neither response demonstrates access to the actual file. No redirect was followed and no file contents or participant data were downloaded. The original archive's CC0 declaration does not establish that its records are free of personal information. Manifest checksums were validated as declarations, not compared against downloaded bytes.

The local audit checks the three publication identities and two specific released archives, exact file manifest fields, rights signal and correction requirements. It records response SHA-256 digests, recomputes only reported arithmetic, and performs HEAD-only access probes for two designated files. A changed version, licence, expected file, publication or reported figures stops the run. Even HTTP 200 HEAD does not enable retrieval or claim verification. Corrections and the external replication interpretation are curated source-backed facts, not an automatic interpretation of the erratum full text.

    npm run ai:science:kenya -- plan
    npm run ai:science:kenya -- run --allow-public-metadata

Five fixed public metadata GETs and two HEAD attempts, zero AI calls, no paid spend. Private aggregate report only. No raw source abstract retained or forwarded to models.

## Remaining scope

T07.3b2 remains open. The Kenya corrected analysis requires verified lawful file access, appropriate privacy assessment, data dictionary, assignment/attrition, direct versus spillover estimands and corrected inferential procedures. If unobtainable, pursue a separate genuinely accessible poverty trial rather than bypassing restrictions or substituting synthetic records. Five-task/model-family evaluation and final publication gates remain separate.
