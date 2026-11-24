# HPI-AI.6 — Bounded source-only rechecks across five scientific tasks

24 November 2026. A private engineering diagnostic, not independent scientific validation.

PR #125 is merged in main 19a0ca7419c7287e027fe92318bb5673e821867e. Its initial diagnostic used one internally curated case per task and two local model families.

The new command resumes that fixed five-task diagnostic from a private archived baseline. It validates the baseline against the same dataset and selection digest, realigns each task and model report, recomputes initial reference matches (rather than trusting saved score summaries), and selects only cases with at least one incomplete or mismatched output. Each selected case receives at most one new logical call on the exact native loopback Ollama Qwen 3.5 9B route, with no cloud or paid route. Only the original source input is passed to the research runner: neither previous model answers nor reference answers are included. Initial reports remain unchanged. Rechecked responses pass through the task-specific validators and internal-reference scoring. Even a full reference match is not scientific validation.

    npm run ai:science:five:recheck -- plan --baseline 2026-11-24T16-12-21-536Z.json
    npm run ai:science:five:recheck -- run --baseline 2026-11-24T16-12-21-536Z.json --allow-local-inference

The command reads a regular private file from the authorised Mac research archive; output is written to a separate private directory with single-flight lock and 0600 reports. Baseline canonical JSON SHA-256: b06a06ad90db7f0d232f4fe306ebde7c8d2000233eb1110cd580dff3bb905db8. This binds the recorded comparison to the baseline used; it is not a cryptographically signed independent audit receipt.

## Real execution

Three selected cases, three logical local model invocations:
- Claim extraction E08: valid structured output, internal-reference endpoint/direction mismatch.
- Mechanism tagging E08: abstained, not a complete reference match.
- Newham evidence-gap detection: complete internal-reference match.

The other two tasks were not re-run because both initial candidates matched the fixed internal labels. One of three selected cases matches the internal reference after recheck; two remain unresolved. The 9B model is a larger model of the Qwen family, not a third distinct model family. Its 1600 output-token limit differs from the initial 1100-token limit, so this is not a controlled comparison of parameter count. These are selected cases from the existing internal benchmark, not a representative accuracy estimate. No independent primary-publication re-verification is performed by this new recheck command; the original source is the HPI versioned summary/dossier. No independent scientific validation, novel scientific publication or beneficiary intervention authorised.

## Remaining

Add original-source checks specific to each task, resolve endpoint and mechanism vocabulary issues, and extend the evaluation with new source-verified cases. Benchmark larger and distinct model families under explicitly authorised cost/privacy controls, without silently promoting a match to truth. Kenya and other poverty-trial empirical replication remain open. The five-task recheck is available as a separate resumable command, not yet a universal research scheduler.
