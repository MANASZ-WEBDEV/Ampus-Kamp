# F-0 Feasibility Spikes

> These spikes must be completed before F-3 (Extraction) and F-7 (QR verify) begin.
> Fill in the results here — they drive two architecture decisions.

---

## Spike 1 — NPTEL QR Auto-Verify

**Date:** _[fill in]_  
**Who ran it:** _[fill in]_

### What we did
1. Downloaded a real NPTEL Elite certificate (PDF).
2. Used `jsQR` / `zbar` to decode the QR code.
3. Made a server-side HTTP GET to the decoded URL.
4. Inspected the response HTML for student name, course, roll, session fields.

### Results
- QR decoded URL: `_[paste URL here]_`
- HTTP status from NPTEL: `_[200 / 4xx / 5xx]_`
- HTML contains `name` field: `[ ] Yes  [ ] No`
- HTML contains `course` field: `[ ] Yes  [ ] No`
- HTML contains `roll number` field: `[ ] Yes  [ ] No`
- HTML contains `session` field: `[ ] Yes  [ ] No`
- Fuzzy string match feasible: `[ ] Yes  [ ] No`
- NPTEL terms of service checked: `[ ] Yes  [ ] No`

### Decision
`[ ] QR auto-verify pipeline proceeds (FR-52–56 are in scope)`  
`[ ] QR auto-verify DROPPED — fall back to faculty "Verify on issuer site" button only`

---

## Spike 2 — LLM Extraction

**Date:** _[fill in]_  
**LLM provider used:** _[Gemini Flash / Groq / GPT-4o-mini / other]_

### Raw announcement pasted
```
[paste the announcement text you tested with]
```

### Raw LLM JSON response
```json
{
  "title": null,
  "type": null,
  "organizer": null,
  "deadline": null,
  "eventDate": null,
  "eligibility_branches": [],
  "eligibility_years": [],
  "teamSize_min": null,
  "teamSize_max": null,
  "fee": null,
  "link": null,
  "summary": null
}
```

### Field-level accuracy
| Field | Correct | Notes |
|-------|---------|-------|
| title | [ ] | |
| type | [ ] | |
| organizer | [ ] | |
| deadline | [ ] | |
| eventDate | [ ] | |
| eligibility_branches | [ ] | |
| teamSize | [ ] | |
| fee | [ ] | |
| link | [ ] | |
| summary | [ ] | |

### Observations
- Latency (p50): `_[ms]_`
- Fields returned as `null`: `_[list]_`
- JSON validity: `[ ] Always valid  [ ] Sometimes invalid`
- Mixed Hindi/English handled: `[ ] Yes  [ ] No  [ ] Untested`

### Decision
`[ ] LLM extraction proceeds as primary method`  
`[ ] Regex-first with LLM as enhancement`  
`[ ] LLM too unreliable — regex-only baseline for MVP`

---

## Spike 3 — Real Announcements Collected

**Date:** _[fill in]_  
**Count collected:** _[N]_ / target 10 (need 150–300 by Week 8)

### Sources
- [ ] WhatsApp group export
- [ ] Email screenshot / forward
- [ ] Faculty-provided messages
- [ ] Public hackathon listing copy-paste

### Labeling plan
- Tool: Google Sheets / CSV
- File path: `scripts/labeled-dataset.csv`
- Columns: `id, rawMessage, title, type, organizer, deadline, eventDate, branches, years, teamSizeMin, teamSizeMax, fee, link, summary`

---

## Open Decisions after Spikes

| Decision | Status | Spike |
|----------|--------|-------|
| QR auto-verify in scope? | `[ ] Yes / [ ] No` | Spike 1 |
| LLM as primary extractor? | `[ ] Yes / [ ] No` | Spike 2 |
| Prompt version v1 frozen? | `[ ] Yes` | Spike 2 |
| Dataset labeling started? | `[ ] Yes / [ ] No` | Spike 3 |
