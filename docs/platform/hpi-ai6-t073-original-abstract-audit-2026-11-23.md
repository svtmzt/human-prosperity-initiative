# HPI-AI.6-T07.3 — Original publisher abstract, quantitative checks and rights-first full-text gate

**Date:** 23 November 2026. **Status:** first original-source quantitative audit and restricted publisher access preflight **implemented and exercised**. The broader T07.3 programme (rights-compliant full-paper methods, raw-data replication, five-task autonomous science) is **still in progress**.

**Scientific integrity:** HPI uses AI autonomously to make progress during internal research. Agreement among models, registration in Crossref/OpenAlex, and deterministic arithmetic from an original paper's abstract are not the same as independently reproducing a study's full methods, estimates and causal inference. Original articles and datasets require correct version/rights handling; publishing novel scientific conclusions or intervening with beneficiaries is a separate gated decision.

## 1. Technical source-verification sequence

The T07.2 prerequisite checks that an original DOI/title/year is independently corroborated by both Crossref and OpenAlex, with source digests and a restricted metadata transport. **T07.3 now additionally:**

1. Parses the **publisher-deposited original JATS abstract in memory**, discarding the text after extraction. Records a SHA-256 source digest, numeric field offsets, explicit endpoint labels, total sample size (distinctly labelled individuals vs observations), follow-up and author-reported study design. Arbitrary text is not stored, transmitted to cloud models or reproduced in the public report.
2. For clear, explicitly labelled treatment/control percentages, performs **independent arithmetic** (difference in percentage points and rate ratio). Refuses to invent arm denominators, p-values, standard errors, confidence intervals, a point estimate for a null effect, or a causal inference beyond the reported study design.
3. Checks for **reversal of an original reported null outcome**. "We find no evidence of an effect" is **not** the statement that the effect is exactly zero. Model claims that convert a reported null finding into an increase are quarantined.
4. Challenges **AI endpoint specificity** against original publisher-abstract fields: SNAP enrolment at nine months cannot establish *sustained participation*; claiming a tax credit is not interchangeable with payment receipt. The model's earlier errors remain recorded, even if subsequent AI rechecks converge.
5. Preserves full original document rights uncertainty. A separate **publisher version-of-record CC BY preflight** requires matching Crossref **CC BY 4.0 / VOR** declaration and OpenAlex primary-location **CC BY**. It then probes a *constructed and explicitly pinned Springer article URL* with **HEAD only**, never GET or a redirect, no credentials. A 303 identity-provider redirect, a zero-byte response or incomplete licence signals stop the process. Even a successful HEAD would **not** authorise downloading or sending the full text to cloud AI.
6. Produces auditable **private machine-readable findings** in Git-ignored, mode-0600 files inside mode-0700 folders on the authorised Mac. Only the technical architecture and deliberately limited quantitative calculations appear in this public document.

The source text and model outputs cannot trigger general-purpose external web requests. DOI and source URLs are validated; publisher access is limited to a hard-coded, constructed HTTPS origin. Full PDF/text retrieval and paywall circumvention are not implemented in this phase.

## 2. Actual source-based results

| HPI case | Primary abstract-level checks | Computable quantities | Unresolved science |
| --- | --- | --- | --- |
| E08: [Take-Up and Targeting: Experimental Evidence from SNAP](https://doi.org/10.1093/qje/qjz013), *Quarterly Journal of Economics* (2019) | Publisher-deposited abstract reports a randomised field experiment of **30,000 older individuals**, control enrolment **6%**, information-only **11%**, information plus application assistance **18%**, and **nine months** of follow-up | Relative to the original reported control arm: information only **+5 percentage points**, ratio **1.83333×**; information plus assistance **+12 percentage points**, ratio **3×** | Arm-specific sample sizes, statistical uncertainty, attrition, balance, study-specific welfare assessment and independent replication of effects from data **not available from abstract alone** |
| E13: [Can Nudges Increase Take-Up of the EITC?](https://doi.org/10.1257/pol.20200603), *American Economic Journal: Economic Policy* (2022) | Abstract reports **six preregistered field experiments** and **1 million observations**. Authors report **no evidence of an effect** on tax filing or claiming the credit | **No valid treatment-effect point estimate** to calculate from the deposited abstract; no inference of precisely zero effect | No independently reproduced confidence intervals, individual treatment contrasts, subgroup effects or evidence about more intensive assistance; model disagreement remains |

These are **publisher-deposited source claims and arithmetic based on the reported rates**, not validated results from reading the entire original publication or re-running its statistical analysis.

### Real AI comparison: the errors were not hidden

With native Qwen 3.5 4B and 9B (one model family), the earlier first-pass models assigned E08 different endpoint classes; the 9B used *sustained participation* although the source reports enrolment at nine months. T07.3 now explicitly records this **original abstract endpoint mismatch** even after an automated recheck produced agreement on a provisional category. E13's model labelled *receipt* although its original abstract discusses **filing and claiming**, not receiving money; its abstention and uncertainty remain unresolved. The automatic supervisor does not silently promote either to scientifically approved evidence.

A complete bounded local replay made eight local inference invocations on E08/E13, including two source-only rechecks, plus read-only Crossref/OpenAlex metadata lookups. No paid AI/cloud calls. The original publisher abstracts are **not passed to cloud models** or persisted in the report.

## 3. Actual licensed full-text feasibility preflight

- **E14:** [Non-take-up of social benefits: experimental evidence from in-person and digital outreach](https://doi.org/10.1007/s13209-026-00331-6), Springer (2026). Crossref advertises **CC BY 4.0 for the version of record** and OpenAlex identifies the publisher version as CC BY. The exact, no-redirect **HEAD** check of the Springer article returned **HTTP 303 to an identity provider**. Technical access **NOT established**: the system did **not** follow the redirect or download the article.
- **E08:** a separate repository manuscript has a reported **CC BY-NC-SA** version-specific licence; the publisher version of record has no corroborated CC BY grant. Thus the publisher full-text adapter **refused the request without accessing Springer or any other publisher**.

These checks avoid equating *open access*, *a registered licence signal* and *permission plus technical ability to use this exact version*. Explicit copyright licence/attribution and authentication requirements remain distinct.

## 4. Reproduction on the authorised HPI Mac

- Original abstract audit: **npm run ai:science:original -- audit --item-ids claim:E08,claim:E13**
- Version-of-record licence/access preflight: **npm run ai:science:original -- preflight --item-ids claim:E14,claim:E08**
- Zero-network plan: **npm run ai:science:original -- plan --item-ids claim:E08,claim:E13**
- Integrated AI cycle with source cross-check: **npm run ai:science:auto -- run --allow-local-inference --item-ids claim:E08,claim:E13**
- Build/tests: **npm run check**

Privacy/cost invariants: no new paid AI spend; no cloud AI inference; no third-party transfer of personal or beneficiary data; no source abstracts or protected publisher text committed to Git; no direct public access to research candidates; no automatic scientific publication.

## 5. What remains before T07.3 can be fully closed

The implemented component is a real step beyond bibliography-only verification, but it covers **original deposited abstracts and precisely scoped quantitative examples**, not arbitrary scientific articles. The remaining work requires automatically obtaining truly reusable publisher/repository texts or equivalent lawful datasets (with version-level permission and actual access), extracting population, inclusion criteria, group denominators, intervention, outcomes, unit, timeframe, causal design, bias/uncertainty and exact text locators; independently recomputing figures from datasets where available; extending source-grounded critical evaluation across all five HPI scientific tasks and more independent model families.

Unsupported articles and unresolved results must remain explicit **research blockers**, not reasons to fabricate estimates or pause all other lawful AI research. T07.3 remains *in progress*. T09 remains the applicable final scientific publication and beneficiary-action gate, not an intermediate research bottleneck.

Provider references: [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/), [Crossref deposited abstracts](https://www.crossref.org/documentation/principles-practices/best-practices/abstracts), [OpenAlex abstract legal limitations](https://help.openalex.org/data/works/attributes/), and [Creative Commons CC BY 4.0 licence](https://creativecommons.org/licenses/by/4.0/).
