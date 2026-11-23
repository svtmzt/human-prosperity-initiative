# HPI-AI.6-T07.2 — Autonomous original-publication discovery, DOI provenance and rights signals

**Engineering release:** 23 November 2026. **Scope:** bibliographic identity verification and bounded related-study discovery for AI-first research. **Not:** verified empirical claims, full-text reuse authorisation, approval for fieldwork, or scientific publication of generated conclusions.

## Architecture: automatic research without intermediate human bottlenecks

The existing private HPI research controller now performs these stages in one bounded run:

1. **Select** 1–3 preversioned, publicly classified HPI summaries with non-identifying source text. Internal reference labels are excluded from model inputs.
2. **Verify original DOI registration** through pinned, unauthenticated **Crossref and OpenAlex** HTTPS APIs. Check canonical DOI, both catalogue titles, publisher, journal, year, title similarity, retraction/correction warnings and retrieval digests. If either registry is unavailable, or registrations conflict, the controller **refuses inference**.
3. **Assess version-specific licences and access:** Crossref's licence declarations and OpenAlex's publisher/repository metadata are separate. An open manuscript does not automatically grant permission to download or reuse the publisher's version of record.
4. **Inspect numbers in a deposited abstract without retaining its text.** Percentage tokens occurring in both the HPI summary and Crossref-deposited abstract are counted in memory. This only indicates token presence, not whether effects, comparators, populations, direction or causality match.
5. **Execute the existing local AI-first cycle:** two independently prompted Qwen source-only analyses, a 9B adversarial critic, and one tightly bounded source-only recheck for disputed cases. Candidate results remain private and non-publishable.
6. **Discover related publications autonomously for remaining disputes**, through Crossref title-based search. Validate up to two registered candidates against OpenAlex; prefer journal-article registrations and deduplicate preprint/journal title variants. Related papers become future reading candidates and are never auto-counted as independent supporting evidence.

No human approval is required to start ordinary lawful internal research. Actual final scientific publication and any real-world beneficiary intervention remain subject to the relevant separate end-stage scientific, legal, rights and ethics safeguards.

## Reproduction

From the authorised HPI Mac:

- Plan, no network: **npm run ai:science:primary -- plan --item-ids claim:E08,claim:E13**
- Verify original bibliographic records, no model calls: **npm run ai:science:primary -- verify --item-ids claim:E08,claim:E13**
- Discover related sources from the EITC study: **npm run ai:science:primary -- discover --seed claim:E13**
- Full pipeline: **npm run ai:science:auto -- run --allow-local-inference --item-ids claim:E08,claim:E13**
- Regression suite: **npm run check**

The registry client pins the API hostnames api.crossref.org and api.openalex.org, uses GET over HTTPS, no credentials, no redirects, bounded response size and 12-second timeouts. The integrated controller permits at most five public metadata reads per selected HPI source case. Publisher links, model output and untrusted source URLs are never fetched as arbitrary destinations.

AI inference is confined to native Ollama at 127.0.0.1:11434, without LiteLLM, OpenRouter, paid model fallback or cloud access. All detailed registries and model proposals are saved only in Git-ignored private Mac directories (0700) and files (0600). No protected publisher text is stored, uploaded to CI or published. Instead, the tool keeps bibliographic fields, versioned rights declarations, numeric-token counts and SHA-256 metadata digests.

## Real verification — 23 November 2026

| HPI case | Confirmed original publication | Crossref + OpenAlex | Rights/abstract diagnostic | Scientific truth status |
| --- | --- | --- | --- | --- |
| E08 — SNAP access | *Take-Up and Targeting: Experimental Evidence from SNAP*, *Quarterly Journal of Economics*, Oxford University Press (2019) | Agree on DOI, title and year | Crossref lists OUP standard publication terms; OpenAlex lists a repository version under CC BY-NC-SA (non-commercial/share-alike). Three percentages from the HPI summary appear in the deposited abstract (3/3); their scientific meaning has NOT been checked | **Effect/direction not independently verified** |
| E13 — EITC nudges | *Can Nudges Increase Take-Up of the EITC? Evidence from Multiple Field Experiments*, *American Economic Journal: Economic Policy*, American Economic Association (2022) | Agree on DOI, title and year | OpenAlex identifies an open working-paper copy but no specific version licence; the HPI summary has no percentage tokens to cross-check | **Effect/direction not independently verified; AI disagreement unresolved** |

Authoritative identifier links: [E08 DOI](https://doi.org/10.1093/qje/qjz013) and [E13 DOI](https://doi.org/10.1257/pol.20200603). The bibliographic registry records are evidence of publication identity, not proof of a study's estimates.

### Detecting duplicate publication versions

The E13 title-guided search initially returned both an SSRN registration and a journal version of **the same related study**. They must not count as two independent publications or as evidence supporting E13. After title/version deduplication, one related DOI with corroborated bibliographic identity remained in the bounded sample: [10.17310/ntj.2019.2.04](https://doi.org/10.17310/ntj.2019.2.04), *Does Informing Employees About Tax Benefits Increase Take-Up? Evidence from EITC Notification Laws*.

This is a **candidate for the next autonomous reading**, not a verified claim, methodological contradiction or new independent scientific gold record. Distinct papers may assess incomparable populations, interventions, denominators or follow-up periods; their differences cannot be interpreted automatically as one study being wrong.

## What T07.2 does and does not complete

**Engineering completed:** safe DOI extraction; dual bibliographic registration checks; correction/retraction warning quarantine; access and licence/version signals; in-memory original abstract percentage-token checks; bounded, pinned metadata fetching; autonomous topical related-study search with preprint/journal deduplication; versioned source provenance and integration with local AI research/rechecks; private audit logs and regression tests.

**Remaining substantive work (T07.3):** autonomous, rights-compliant retrieval of original abstracts or legally reusable full texts, extraction of methods, populations, outcomes, denominators and effect estimates; evidence-level comparisons and independently reproducible calculations; better multi-family AI model challenges and scale-out across five scientific tasks. A paywall, absent licence, missing primary evidence or ambiguous method must lead to restricted metadata/abstract-only analysis or an explicit unresolved result, never a fabricated final validation.

T07 stays **in progress**; T08 new paid-model experiments require separate explicit spending authority; T09 AI scientific publication and beneficiary-affecting actions remain **NO-GO** without applicable final approvals. Scientific claims cannot be certified simply because model answers agree or metadata percentages match.

Reference APIs: [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/), [Crossref access and licence notes](https://www.crossref.org/documentation/retrieve-metadata/rest-api/text-and-data-mining-for-researchers/), [OpenAlex access locations](https://help.openalex.org/data/locations/), [OpenAlex OA licence distinctions](https://help.openalex.org/data/works/open-access/).
