# WEB-03.3 / WEB-03.5 / RT-02.7 — Real-user and assistive-technology acceptance kit V0.2

**Prepared:** 21 November 2026. **Status:** reproducible acceptance scripts and technical automation prepared. **No actual human usability participant, founder visual sign-off, or genuine VoiceOver/NVDA/TalkBack acceptance is claimed.** The agent cannot certify these by inspecting a screenshot or passing axe automation.

## Technical design baseline to evaluate

The chosen **continuity-first evidence-led** design in [WEB-03.3 V0.1](WEB-03-3-responsive-design-direction-and-templates-v0-1.md) preserves HPI's navy/lime/sage system, six-area primary navigation, CSS-responsive documentation pages, keyboard skip link, native mobile menu, restrained design without fictitious impact KPIs, and real source-first status. There is no approved final founder design decision.

The existing [WEB-03.5 checklist](WEB-03-5-accessibility-and-real-user-acceptance-v0-1.md) defines automated versus human scope. The website's build/source QA and [GitHub Actions Chromium workflow](https://github.com/svtmzt/human-prosperity-initiative/actions) are objective **technical evidence only**. A passed automated WCAG-tagged rule scan does not prove universal WCAG 2.2 AA conformance or accessible comprehension.

## Four public tasks, prepared for genuine future testing

| Journey | Starting point and participant-safe task | Unassisted success signal | Conceptual misunderstanding to record |
| --- | --- | --- | --- |
| General visitor | From `/`, find whether HPI has measured any real effect on poverty, and open the Newham project | Reaches `/projects/newham` and correctly explains **desk model only, no impact or field authorisation** | Mistakes modelled 2023/24 local household receipt for current individual benefit eligibility or HPI success |
| Independent researcher | Locate one original cited methodological source, its time/geography/denominator and HPI independent-review status | Navigates `/research`, Source Catalogue and the published Newham methods dossier, and identifies missing external sign-off | Treats a public PDF, test pass, published dataset or modelled statistic as peer review |
| Research-tools user | Use a **fictional** Outcome Lab preset with adverse or missing results; reset to positive, export synthetic CSV and interpret the label | Can tab to controls, understand bounds and synthetic-only download, describe why no causal claim follows | Assumes simulated numbers reflect real people, verified entitlement or real-world programme effects |
| Prospective open-source contributor | Find a way to suggest a non-sensitive correction and locate privacy/help limits | Reaches first-party Help/Contact and public GitHub contribution route, without submitting personal records | Believes GitHub is a confidential privacy/safeguarding support inbox |

**Script opening (future human moderator, not a current recruited volunteer):** Ask participants to use only information visible on public HPI pages. Do not ask for or collect their health, disability, finances, entitlement histories, precise home address, identity documents or vulnerable personal narratives. No Newham resident recruitment or benefits advice is authorised. Only real approved study coordinators may arrange protected community/user participation when appropriate.

## Platform and accessibility matrix — blank real-world evidence rows

| Device / AT | Task | Verification and evidence required | Result |
| --- | --- | --- | --- |
| Safari/macOS + actual VoiceOver | All four journeys | Record OS/browser/AT versions, commit, date, keyboard order, landmark/list announcements, headings, accessible name, zoom, blockers | **NOT PERFORMED** |
| Windows + actual NVDA (Chrome or Firefox) | Navigation, research tables, legal pages, presets and errors | Confirm headings, row/column semantics, live announcements, error feedback and keyboard-only control | **NOT PERFORMED** |
| Android + actual TalkBack (Chrome) | Mobile menu, projects, Help/Contact, Outcome Lab | Confirm expanded state, logical focus, no inaccessible overlays, numeric labels, status messages and 200% font size | **NOT PERFORMED** |
| Real native browser zoom and text resizing | 200%/400%, 320/390/768/1440 CSS px equivalent | Confirm no content cut off, overlapping menus, inaccessible controls or horizontal page scroll | **NOT PERFORMED WITH ACTUAL USER/OS ZOOM** |
| Founder visual acceptance | Home/project/research/tools/help/legal templates | Annotated dated screen set, selected design direction, concrete accepted/rejected changes | **PENDING FOUNDER REVIEW** |

## Minimum evidence record for each actual session

- **Session ID / authorised owner / participant consent documentation:** PENDING (do not publish private identifiers)
- **Date, target commit SHA, route, task, device, browser, AT version:** PENDING
- **Actions attempted, completion/abandonment, time only if ethically appropriate:** PENDING
- **Observed obstacle, reproducible steps, severity, user quote only with safe permission:** PENDING
- **Fix issue, exact PR/checks/deployment, retest outcome:** PENDING
- **Review disposition, rationale and dissent:** PENDING
- **Human approval/waiver authority:** NOT ESTABLISHED

Keep private data off GitHub; a confidential recording/feedback intake does not currently exist. Non-sensitive defects can be represented as technical summaries without identifying participants.

## Automated tests accompanying this package

The public Chromium QA script checks desktop/mobile layouts, landmark structure, keyboard skip/navigation, zoom-equivalent reflow, axe-core WCAG-tagged rules, first-party trust pages, and the RT-02.4 **fictional** preset, adverse outcome, missingness, zero outcome, invalid input and CSV-disabled/error recovery paths. Record the **actual green SHA and run URL** only after the changes pass; do not claim results from a proposed PR.

## Acceptance and next actions

- WEB-03.3 technical templates: delivered previously; this kit adds reviewable criteria. **Founder design acceptance still OPEN**.
- WEB-03.5 automated/technical tests: conditional on passing real CI and release; **human AT and user comprehension still OPEN**.
- RT-02.7 automated research-tool QA: conditional on passing CI; **real user/AT feedback and legal source-rights gates still OPEN**.
- WEB-03.6 controller/safeguarding review is **independent of** this accessibility exercise.
- No field study, sensitive data collection or human welfare service is authorised. Related [HPI WEB-03 #85](https://github.com/svtmzt/human-prosperity-initiative/issues/85), [Research Tools #86](https://github.com/svtmzt/human-prosperity-initiative/issues/86), [Trust #89](https://github.com/svtmzt/human-prosperity-initiative/issues/89), [RT-GATE #67](https://github.com/svtmzt/human-prosperity-initiative/issues/67).
