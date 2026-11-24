# HPI-AI.6 — Five scientific tasks, two local model families

24 November 2026. A bounded engineering diagnostic, not independent scientific certification.

## Scope

The existing scientific panel can now execute one fixed case per task in one unattended, explicitly opted-in local run. The five tasks are claim extraction, source classification, mechanism tagging, evidence-gap detection and contradiction detection. The reference is the existing HPI-curated evaluation snapshot (not new or independently adjudicated gold labels). Claim, classification and mechanism cases share E08; results are not statistically independent samples.

The runner verifies the dataset SHA-256, case IDs, source classification, injection screening, input size and exact native loopback Ollama route. It uses Qwen 3.5 4B and Nemotron 3 Nano 4B, one logical invocation per case/model, ten total; a logical invocation may entail native adapter fallback. The two model families are distinct, not assumed independent in training or reasoning. Reference answers are withheld from prompts. Only fully accepted outputs matching the complete internal reference count as matches, including all required mechanism tags and stages; abstentions, rejected proposals, partial outputs and provider failures do not count. For claim extraction the comparison is direction/endpoint labels, not independent semantic proof. The contradictory-pair label is internal curation, not validated equivalence of populations, designs and follow-up.

Each disagreement creates an explicit next-action designation for autonomous source/model rechecking; this diagnostic does not yet execute those rechecks across all five tasks. The older two-case original-source/critic/recheck research cycle remains separate. No raw model answers are published. No model consensus establishes science or real-world permission.

    npm run ai:science:five -- plan
    npm run ai:science:five -- run --allow-local-inference

The private report contains provenance, both panels and scores, stored in a mode-0700 folder with mode-0600 files and a single-flight lock. No cloud or paid model calls. Local inference only.

## Further poverty study discovery

Three additional public Harvard Dataverse manifests were inspected on 24 November:
- [Tanzania cash transfers, trust and inter-household transfers](https://doi.org/10.7910/DVN/JNIXA4), V1.0 CC0, ten files including a village-level aggregate table (19,678 bytes) and README. Both fixed HEAD probes returned 303; no redirects followed. Household-level records were not retrieved.
- [Indonesia self-targeting](https://doi.org/10.7910/DVN/6ZUIUC), V1.3 CC0, three files including a data ZIP. HEAD returned 400.
- [Seasonal poverty and consumption smoothing](https://doi.org/10.7910/DVN/9IENYR), V1.1 CC0, one ZIP. HEAD returned 303.

These are metadata-only discovery candidates. A repository licence and unrestricted listing are not proof of file access or absence of identifying information. No new participant data downloaded; no new experiment replicated. The Kenya corrected-data access remains unresolved. Next: find lawfully accessible aggregate or de-identified trial data from the original source, then verify assignment, denominators, uncertainty and design-specific estimands.

## Remaining scope

Expand to at least 100 new source-verified engineering evaluation cases per task, separate source verification from curation, avoid repeated-source leakage, implement bounded independent rechecks on all tasks, and benchmark additional model families with explicit budget and privacy gates. All five task types are now runnable in a single diagnostic; this is not completion of the scientific research programme. Final publication and beneficiary-impact gates remain unchanged.

## Observed execution, 24 November 2026

The actual Mac run completed ten logical local model invocations with no paid/cloud calls. Complete matches against the fixed internal reference:

| Task | Qwen 3.5 4B | Nemotron 3 Nano 4B |
| --- | --- | --- |
| Claim extraction E08 | Match | Mismatch |
| Source classification E08 | Match | Match |
| Mechanism tagging E08 | Partial, not a match | Partial, not a match |
| Newham gaps | Match | Partial, not a match |
| E08/E19 contradiction | Match | Match |

Qwen 4/5 and Nemotron 2/5. In the mechanism case both accepted the same incomplete subset; the diagnostic therefore must not mistake panel agreement for a completed answer. The final presentation explicitly labels partial/unvalidated output, preserving the original panel interpretation separately. Three tasks require a recheck; no automatic scientific approval. These are five selected internally curated cases, not an estimate of population accuracy. The post-run interpretation change is deterministic and covered by tests; it did not generate new inference results.

Selection SHA-256: 9d6d5d9ff786871662c79724a27e033cb17c0a1f1910844e2ccddf07ce75c6a7.
