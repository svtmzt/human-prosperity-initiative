# WEB-03.6 — Bounded public production browser/storage observation (21 November 2026)

**Status: technical observation, NOT provider-wide privacy audit, legal advice, PECR exemption, consent determination, UK GDPR compliance evidence, or controller approval.**

## Environment and reproducibility

- Target: `https://human-prosperity-initiative.vercel.app`, live public production (Vercel).
- Date: **21 November 2026**.
- Browser: headless Chromium launched with the Playwright 1.64.1 client on macOS, **fresh isolated browser context**, 390×844 viewport, service workers blocked. No authenticated account, signed-in browser profile or test cookies were imported.
- Pages visited **sequentially** in one fresh context: `/`, `/privacy`, `/cookies`, `/research/outcome-lab`, `/tools`, `/help`, `/contact`.
- Observation method: HTTP response status, `document.cookie`, Playwright context cookie jar, `localStorage.length`, `sessionStorage.length`, loaded/requested third-party origins, response `Set-Cookie` headers and unhandled JavaScript errors. It inspected **normal page load only**; no consent flow or optional account state exists and the user did not submit any real data.
- Avoided capturing IP addresses, IDs, complete header values or browsing profiles. Only aggregate technical results below are published.

## Results in this exact browser/context

| Route | HTTP | Browser cookies | localStorage | sessionStorage | External request hostnames | Set-Cookie responses | Unhandled JS errors |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 200 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/privacy` | 200 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/cookies` | 200 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/research/outcome-lab` | 200 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/tools` | 200 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/help` | 200 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/contact` | 200 | 0 | 0 | 0 | 0 | 0 | 0 |

**Narrow finding:** no first-party storage, observed cookie setting, or third-party resource requests appeared in the tested page loads. This is consistent with the source design and its lack of analytics/advertising scripts. It does **not** demonstrate that cookies or other access technologies never appear for other visitors, regions, protection states or browser configurations.

## Limitations and required real-world checks

- Not tested: other regions and browsers (Safari/Firefox/TalkBack/iOS), CDN challenge/protection paths, consent choices, iframe use, authenticated routes (none declared), all request bodies, hosting backend telemetry and logs, Vercel processing agreements, third-party provider retention, international transfers, or synthetic user interaction beyond loading pages.
- Even when the observed browser cookie jar is empty, **Vercel can process network/connection and access-log metadata independently of browser storage**. Responsible controller, lawful bases, actual data flows and retention are not established.
- PECR applies to storage/access technologies beyond cookies. The [ICO's final April 2026 guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/) requires purpose-specific assessment, not an assumption that an empty cookie jar proves exemption.
- A staffed, restricted privacy-rights and safeguarding channel, qualified independent legal review, and any appropriate consent UI are not provided by this test. There must be no fictional provider details, contact, authorisation or compliance declaration.

**Gate:** WEB-03.6 technical browser observation **done, bounded**; the umbrella [WEB-03.6 #89](https://github.com/svtmzt/human-prosperity-initiative/issues/89), real human accessibility and institution/data-controller requirements remain **OPEN**. No fieldwork or personal data submission is authorised.
