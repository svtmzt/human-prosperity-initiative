# Economic Systems Lab and MODEL-HHR-01 V1

**Status:** implemented and tested, 16 November 2026. **Illustrative model with synthetic inputs.** Not a forecast, not calibrated, not independently reviewed, not evidence about any policy.

## Research agenda

Six bounded questions (RQ-ESL-01 to 06) connect growth, productivity, labour income, essential costs, household resilience, income distribution and institutional conditions. For RQ-ESL-01 (why growth does not always become household security) five competing explanations are registered with testable implications and measurement caveats: partial productivity pass-through; essential costs outpacing general prices; growth concentrated away from low-income households; hours instability; and non-indexed transfers. None is assumed correct.

## Model

For each synthetic household archetype and scenario:

- wage multiplier = 1 + nominal wage change + productivity growth × pass-through share
- hours multiplier per earner = 1 + hours change + automation hours change × automation exposure (floored at zero)
- employment share = original share + change, clamped to [0, 1]
- gross earnings = Σ hourly wage × wage multiplier × monthly hours × hours multiplier × employment share
- disposable income = gross earnings × (1 − effective tax and contribution rate) + transfers × (1 + transfer change)
- essential costs = housing, energy, food and other essentials, each × (1 + its change)
- residual income = disposable income − essential costs
- essentials share = essential costs ÷ disposable income (undefined when disposable income ≤ 0)
- buffer months = savings ÷ (−residual) when residual is negative
- status = deficit (residual below zero), fragile (residual below the fragility threshold × disposable income, default 10%), otherwise margin

Implementation: `research-tools/household-resilience-model.mjs` (MIT), published unchanged at `/systems-lab-model.js`. Parameters are validated against declared bounds; archetypes must be explicitly synthetic.

## Assumptions and limitations

Price changes pass fully into expenses (no rationing or substitution); constant effective tax rate; transfers do not respond automatically; automation exposure is an illustrative multiplier; the fragility threshold is a convention, not a poverty line. No general-equilibrium effects, no probabilistic uncertainty, no representativeness, no causal identification.

## Scenarios and distributional outputs

Five presets: baseline; growth with low pass-through; essential-cost shock; AI productivity with exposure-weighted hours displacement; broad-based gains. Results are shown per archetype with changes versus baseline and status; the Lab deliberately publishes no average because averages hide who falls into deficit.

## Sensitivity

One-at-a-time ±step perturbation of each assumption (10 percentage points, or 0.1 for pass-through), reporting residual swings and status changes; fragility-threshold sensitivity at 5%, 10% and 15%.

## Reproduction

`npm test` runs model tests (identities, zero and negative cases, bounds, monotonicity, determinism, sensitivity). `/systems-lab-results.json` contains every precomputed result.

## Pathway to advanced models

Calibrate to official household survey microdata via a qualified partner; add tax-benefit microsimulation; register explanations and test them against distributional national accounts; obtain independent review (G-05) before any empirical use.
