# HPI-AI.6-T07.3b2 — First empirical study reproduction

**24 November 2026.** This is a scoped reproduction of a published experimental result, not certification of a new scientific finding.

## Source and scope

Study: Bertrand and Mullainathan (2004), [American Economic Review, DOI 10.1257/0002828042002561](https://doi.org/10.1257/0002828042002561), Table 1, page 997, all sent resumes. The [authors' archive](https://doi.org/10.3886/E116023V1) is separately registered. We use the [documented OpenIntro teaching dataset](https://www.openintro.org/data/index.php?data=resume) from the [version-pinned openintro package](https://github.com/OpenIntroStat/openintro/tree/be3dc62dd51954975085c7520fd5967226a195b1), not a claim of byte-equivalence to the authors' original archive. The package declares GPL-3. We retain no dataset rows, do not redistribute data, and do not assume a separate licence for the original archive.

The fictional names were assigned to resumes; this experiment measures employer callbacks, not actual racial identity, hiring, wages or poverty reduction. No actual person is classified. An alternative CC0 postsecondary-credentials archive refused direct download with HTTP 403; the OpenIntro CSV URL also refused access (406). No access restriction was bypassed: the separately distributed package was used.

## Actual data and results

| Assigned name signal | Sent | Callbacks | Rate |
|---|---:|---:|---:|
| White-sounding names | 2435 | 235 | 9.65% |
| African-American-sounding names | 2435 | 157 | 6.45% |

4,870 observations, 1,323 advertisement clusters (1,112 clusters of four and 211 of two); both arms are balanced inside every advertisement. No missing assignment, outcome or advertisement identifiers in this release. Recomputed difference **3.203285 percentage points**, ratio **1.496815**, matching the published Table 1 at its displayed precision.

Additional independent inferential calculation (row-wise sandwich and a separate grouped-contrast formula agree): unadjusted two-arm OLS difference, advertisement-level CR1 sandwich variance, normal-reference interval and p-value. SE 0.619453 pp; approximate 95% CI **1.989179 to 4.417391 pp**; two-sided p approximately **2.32658e-7**. This is not a claim to exactly reproduce the authors' original p-value, other models, covariate choices, or the complete study. Clustering by advertisement does not identify possible dependence across separate adverts from the same employer. The historical setting limits external validity.

## Reproduction

Use an isolated Python 3.12 environment with pyreadr 0.5.4 (observed runtime pandas 3.1.1 and numpy 2.5.5). No downloaded executable research scripts are run.

    python3 scripts/ai-trial-reproduction.py plan
    python3 scripts/ai-trial-reproduction.py run --allow-public-data
    python3 tests/ai-trial-reproduction-test.py

The CLI uses three fixed, commit-addressed public source GETs, no redirects, SHA-256-pinned DESCRIPTION, licence and RDA bytes; temporarily reads the RDA locally and emits only aggregate statistics and provenance. It refuses unsupported designs, degenerate variance, missing outcomes or unexpected source hashes. No LLM calls or paid API calls are required. Do not commit private reports or source data. Synthetic test cases only check the calculation engine, not empirical evidence.

## Remaining work

This is the first empirical benchmark slice of T07.3b2. SNAP and EITC source microdata remain unavailable; no effect of either is certified. The current study is a separate opportunity-access example, not a substitute for those studies. Further work includes other poverty interventions with lawfully accessible datasets, independently implemented inference cross-checks, protocol-specific missingness and allocation, source versions, and automated evaluation over diverse AI families and the five HPI scientific tasks. No novel scientific publication or real-world intervention is authorised by this result.
