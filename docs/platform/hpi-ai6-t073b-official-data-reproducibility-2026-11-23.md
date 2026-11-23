# HPI-AI.6-T07.3b — Autonomous reproducible public data and original author package audit

**Date:** 23 November 2026. **Engineering slice:** live original public aggregate data ingestion, reproducible descriptive calculations, scientific source tracing, and strict original-study replication-package availability testing. **Not** a validated novel causal result, experimental microdata rerun, independently expert-reviewed conclusion or approval to intervene with people.

**Founder-approved operating model:** HPI uses AI and deterministic software to conduct lawful internal research autonomously, with no routine outside expert bottleneck. Qualified final sign-off is reserved for actual publication/beneficiary-impact/legal and ethical release gates as required. This implementation makes genuine automated research progress without substituting model agreement for scientific evidence.

## What was implemented

The new **npm run ai:science:replicate** command executes two original public research evidence lanes, with a strict maximum of five GET requests, no external credentials, no participant data, no scripts executed, no publisher full texts downloaded and no AI cloud/paid inference:

1. **Official aggregate data computation:** four fixed, unauthenticated HTTPS JSON endpoints on api.worldbank.org retrieve two original World Development Indicators (WDI) series and their metadata: poverty headcount ratio **SI.POV.DDAY**, officially defined as **$3.00/day (2021 PPP)** and expressed in percent of population; and **SP.POP.TOTL**, a de facto midyear population count. The program validates source ID **2**, indicator name/units, country ISO3 **BRA**, shared observation years, missing values, pagination, update dates, finite percentage range, nonnegative integer populations and SHA-256 response digests. A mismatched country, a revised definition, a missing year or a source anomaly **fails closed** rather than interpolating values.
2. **Author replication-package discovery:** one metadata-only official Harvard Dataverse API read for the original SNAP E08 study's registered replication DOI **10.7910/DVN/8AWKIL**. The program validates package release state, title, catalogue dataset ID, explicit **CC0 1.0** metadata licence, file restrictions and manifest checksums; classifies source code vs documentation vs data files. Checksums are **declared** (not proof of downloaded byte integrity). No file contents are downloaded or Stata programs executed. Script availability alone does not constitute a reproducible research finding.

Each result is written to a **local 0600 Git-ignored report inside a 0700 directory**, with a single-flight lock, bounded request sizes and no raw provider responses retained. The public text below contains only reproducible **aggregate descriptive arithmetic** and replication-readiness metadata.

The original private HPI AI research controller supports an optional **--with-public-evidence** switch. It runs this reproducibility audit as an isolated **separate evidence context** after the source and adversarial AI checks. The World Bank series is **NOT** treated as evidence supporting or refuting the causal effects of SNAP/EITC programmes, nor as gold labels for training or ranking AI models. The SNAP author package indicates replicability constraints; it is NOT proof that the experimental estimates were replicated.

## Actual official World Bank original data run

Sources: [World Bank SI.POV.DDAY indicator](https://data.worldbank.org/indicator/SI.POV.DDAY?locations=BR), [World Bank population indicator SP.POP.TOTL](https://data.worldbank.org/indicator/SP.POP.TOTL?locations=BR), and [WDI source/licence catalogue](https://datacatalog.worldbank.org/search/dataset/0037712/world-development-indicators).

**Source data metadata update:** 11 November 2026 at retrieval. Rates follow the World Bank's **2021 PPP** poverty-line definition; older 2017 PPP editions cannot be compared as if they used the same threshold.

| Year | Headcount ratio below $3/day (2021 PPP) | De facto midyear population | Estimated people below threshold, arithmetic only |
| --- | ---: | ---: | ---: |
| 2022 | 4.9% | 210,306,415 | 10,305,014 |
| 2023 | 3.8% | 211,140,729 | 8,023,348 |
| 2024 | 3.0% | 211,998,573 | 6,359,957 |

The exact rerunnable formula is **round(official midyear population × reported poverty percentage / 100)**, using corresponding observation years. Between the selected endpoints, the reported poverty headcount ratio changes **−1.9 percentage points**; the two **derived**, rounded headcount approximations differ by **−3,945,057** people.

**Scientific limitations:** these calculated people counts are **NOT** the World Bank's separately published official count of poor people. The inputs come from different statistical products (survey-based poverty rates and national midyear population). Neither the arithmetic nor the trend identifies an intervention, control group, causal effect, statistical significance or a confidence interval. Survey sampling error, PPP revisions, country methodology and source vintage must be addressed in further research. This output cannot be used to claim that an HPI action improved national prosperity.

**Legal attribution:** © World Bank, *World Development Indicators*, via World Bank Indicators API, dataset catalogued under **CC BY 4.0**, accessed 23 November 2026. Changes: HPI performed arithmetic recombination and rounded estimates; no World Bank endorsement is asserted.

## Actual original SNAP author-replication manifest

Author publication: [Finkelstein and Notowidigdo (2019), SNAP randomised field experiment](https://doi.org/10.1093/qje/qjz013). Official author package: [Harvard Dataverse DOI 10.7910/DVN/8AWKIL](https://doi.org/10.7910/DVN/8AWKIL), dataset version 1, registry metadata published as **CC0 1.0**.

The verified public package manifest contains **13 files**: **11 Stata .do scripts**, **2 README/documentation files**, and **zero .dta/.csv/.parquet/.sav/.xlsx/other structured data files**. The manifest is an authentic published release, and each file has a declared identifier/size/checksum (actual content hashes were NOT independently recomputed because files were deliberately not downloaded).

**Precise finding:** the authors published replication **code**. The examined package does **not** itself provide the experimental microdata needed to rerun the intervention and verify causal confidence intervals. The result of the automated assessment is **code_and_documentation_only_no_reproduction_microdata**. Do not infer that the authors failed to reproduce it or that no raw data exists elsewhere; access may be restricted because administrative data concerns real beneficiaries. HPI has neither downloaded nor attempted to access participant microdata, nor run unchecked Stata scripts.

## Reproduce on the authorised Mac

Plan, without network access:

    npm run ai:science:replicate -- plan

Execute the two original-data lanes, using only pinned read-only public APIs:

    npm run ai:science:replicate -- run --allow-public-data

Execute the existing full autonomous local AI evidence challenge and append this independent descriptive context without using it as claim truth:

    npm run ai:science:auto -- run --allow-local-inference --with-public-evidence --item-ids claim:E08,claim:E13

Test the full website, integrity gates and new scientific units:

    npm run check

The data-only command uses **5 public GET requests**, **0 LLM calls**, **0 paid API requests**; the optional integrated AI command uses its independently bounded native local Ollama models, **not** any provider cloud inference. The package manifest and official WDI response digests are retained for traceability, but original data responses and any publisher/participant content are not persisted or rehosted.

## Remaining T07.3b / T07 work

This is a **completed reproducible-data *vertical slice***, not completion of the full scientific roadmap. To reproduce **study-level causal estimates**, the next engine needs explicit linkage from an article to a lawfully accessible **actual original analysis dataset**, trustworthy variable dictionary, trial arm allocation, exclusions and attrition, code/runtime reproducibility, standard errors and confidence intervals, plus an independent calculations check. The original SNAP participant dataset was not present in the inspected manifest. Code-only packages and paywalled studies must remain **pending original data** rather than fabricating estimates.

For HPI's larger mission, extend the public-source/data audit to multiple official poverty indicators/countries with calibrated uncertainty and explain missingness, then support other four evidence tasks, model-family diversity, automated source comparison and reproducible applied methods, all under explicit privacy and model cost ceilings. Do not represent descriptive national trends as proof of what any intervention caused.

**Roadmap flags:** T07.3b original experimental replicability remains **in progress** beyond this first slice. Parent T07 remains **in progress**. T09 AI-origin novel-scientific-publication or real-world beneficiary intervention remains **NO-GO** until genuinely applicable final review/approval, but internal lawful AI research continues autonomously.

### Related E13 replication package — catalog discovery, not a downloaded dataset

The American Economic Association's E13 article provides a [replication package link](https://benny.aeaweb.org/articles?id=10.1257/pol.20200603) to the author-deposited [openICPSR project 142221, V1, DOI 10.3886/E142221V1](https://doi.org/10.3886/E142221V1). The public catalog identifies its data type as **program source code**, with studies based on administrative Franchise Tax Board and California Department of Social Services records. This is evidence that scripts and instructions exist; it is **not an accessible participant-level dataset** and is not proof of independent re-estimation of the six experiments. Direct machine access to the openICPSR page on the authorised HPI Mac returned a browser-protection HTTP 403, so the new machine audit **does not** claim to have retrieved or validated its manifest and does not bypass the protection.

The E13 package is a **documented discovery candidate** for a future provider-specific, permitted metadata adapter, not an independently executed empirical replication. Author-produced protected administrative records must never be silently substituted with synthetic data or imported without appropriate permission.
