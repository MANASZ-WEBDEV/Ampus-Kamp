# Campus Innovation Platform - App Flow Document

*Working-backwards flow design: personas, journeys, team formation, states, failure paths and guardrails. October 2026.*

## 1. Working-Backwards Summary

**Press release (draft).** The platform launches at the college as one place where every hackathon, contest and sports event is posted once, students find teammates in minutes, and every verified achievement counts toward a fair department ranking. Faculty paste the announcement they received and publish in under a minute. Students see what is closing soon, join or invite teammates, and add proof after the event. Departments see verified, size-adjusted rankings without anyone building a spreadsheet.

| Question | Answer |
| --- | --- |
| Why not WhatsApp or Unstop? | Not college-specific, no verification, no department analytics, no internal team finder |
| What if the AI extracts a field wrongly? | Faculty confirm every card, uncertain fields are highlighted, raw text is kept |
| How are fake certificates stopped? | Proof upload, duplicate certificate-ID check, faculty verification before anything counts |
| Is the ranking fair to large departments? | Yes, the headline metric is a rate per student, not a raw count |
| Can strangers contact me? | Only logged-in college students, with no contact details shared until I accept |

## 2. Customers and Promises

| Customer | Promise | Success signal |
| --- | --- | --- |
| Student | Never miss an opportunity, never be alone on a team | Event-to-team time under 1 day |
| Faculty | Post an event in under 60 seconds | Cards confirmed without edits |
| Verifier (faculty) | Decide on a proof in one screen | Decision within 3 days |
| Admin / department head | A trustworthy ranking in one click | Report exported without manual fixes |

## 3. Core Loop

```
Faculty pastes text -> extracted card -> faculty confirms -> published
-> student notified -> opens event -> decides
-> needs a team? post / request / invite / connect -> accepted -> WhatsApp
-> event happens -> student uploads proof -> faculty verifies
-> counted in analytics -> department rank updates
```

Each step feeds the next, so a slow step anywhere stalls the loop.

## 4. Persona Journeys

### 4.1 Student, first session (value in under 60 seconds)

1. Open the link, log in with enrollment number, college ID and password.
2. Land on the feed sorted by closing soon, filtered to own branch and year.
3. Open an event: deadline, eligibility, fee, team size, link.
4. Choose Apply (external link) or Find teammates.
5. After the event date, a prompt appears: 'Did you take part? Add your result.'

### 4.2 Faculty posts an event (under 60 seconds)

1. Tap Post event and paste the organizer's text.
2. The system returns a card; uncertain fields are highlighted.
3. Fix highlighted fields, then Publish.
4. Students matching branch and year are notified.

### 4.3 Verifier reviews a credential

1. Open the verification queue, oldest first.
2. See the proof beside the submitted fields (course, session, tier, certificate ID).
3. Approve, or reject with a reason chosen from a short list.

**Verification method by credential type**

| Credential | Checked by | How |
| --- | --- | --- |
| NPTEL and other issuers with a QR code or link | Faculty of the student's department | A 'Verify on issuer site' button opens the certificate link, then the verifier approves |
| College events, sports, internal certificates | Faculty of the student's department | Checks the proof against the event record |
| Disputed or unusual items | Admin | Final decision |

Each course or event type has a `verificationMethod` field so a record goes to the right queue. Automatic reading of issuer pages is not built; the button gives most of the benefit with little risk.

**Auto-verification of QR certificates (NPTEL first, subject to a feasibility test)**

No AI model decides whether a certificate is genuine. The issuer's own record does. The flow is:

1. The student uploads the certificate and the system reads the QR code.
2. The link must be on the issuer's allowed domain (for NPTEL, an nptel.ac.in address) and use https.
3. The server fetches the official record and compares name, course, roll number and session with the uploaded fields and with the student's profile name.
4. Full match: the credential is marked verified with method 'issuer-qr', and the link, time and match result are saved as evidence.
5. Mismatch: rejected with a reason the student can see.
6. Page cannot be fetched or read: the record falls back to the faculty queue and its 'Verify on issuer site' button.

Auto-verified items stay in the monthly spot-check sample. In week 1, test the flow with a real certificate before building the rest; if the official page cannot be read automatically, keep the faculty button as the method.

### 4.4 Admin or department head

1. Open the dashboard with the current year preselected.
2. See the rank under the headline metric, with the option to switch metric.
3. Open 'why this rank' for the breakdown, then export the report.

## 5. Team Formation Flows

Teams can form in three ways, so a student never needs to have posted anything to be reachable.

| Path | Who starts | Entry point | Needs a team post? |
| --- | --- | --- | --- |
| A. Request to join | Student looking for a team | A team post on the event page | Yes, the leader's post |
| B. Invite from profile | Team leader | A student's profile or the people search | No, the leader needs a team and an event |
| C. Direct connect | Any student | Profile of a student who has not posted anything | No |

### 5.1 Path A: request to join

1. Student opens a team post and taps Request to join, with an optional message.
2. Leader gets a notification, opens the requester's profile, then accepts or declines.
3. On accept, the spot count drops and the contact reveal runs (section 5.4).

### 5.2 Path B: leader invites someone from their profile

1. Leader opens a student's profile from search (filter by skills, branch, year) or from the event's looking-for-team list.
2. Leader taps Invite to team and picks which of their teams or events the invite is for, with a short message.
3. Student gets a notification with the team, event and message, and can Accept, Decline or Not now.
4. On accept, the leader's spot count drops and the contact reveal runs.

### 5.3 Path C: someone wants to reach a student who has not posted (the Mohit case)

1. Priya finds Mohit through search or the event's looking-for-team list.
2. On his profile she sees Invite to team if she leads a team, otherwise Connect. Connect takes an optional event and a message of up to 200 characters.
3. Mohit is notified and can Accept, Decline, Not now or Block.
4. On accept, contact is revealed according to Mohit's phone-visibility setting. If he keeps his number hidden, Priya shares a WhatsApp group link and he sees it after accepting.
5. Nothing is revealed to Priya, and no chat is opened, before he accepts.

**Lightweight signal.** To make cold contact rare, a student can tap I'm looking for a team on any event in one tap, with no post needed. They then appear in that event's looking-for-team list, which leaders can invite from.

### 5.4 Contact reveal (same for all paths)

- Shown only after acceptance, and only if the person's phone-visibility setting allows it.
- Otherwise the team owner posts a WhatsApp group link, shown to accepted members only.
- Contact details are generated server-side at that moment and never appear in earlier responses.

### 5.5 Rules and guardrails

| Rule | Value |
| --- | --- |
| Who can be found | Logged-in college users, showing name, branch, year and skills only |
| Opt-out | Setting 'Allow invites and connect requests', default on; off removes the Invite and Connect buttons |
| Daily limit | 10 invites plus connects per user per day |
| Duplicates | One pending item per pair per event |
| Expiry | Pending items expire after 7 days |
| Declines | The same sender cannot resend for the same event for 30 days |
| Safety | Block and Report on every incoming item; admin can suspend users |
| Message | Plain text only, 200 characters, links blocked |

### 5.6 Event Registration (individual and team)

Students and teams can register for events through the app, and every event shows how many students and teams have registered, similar to Unstop.

**Two kinds of events**

| Kind | Example | What the app does |
| --- | --- | --- |
| Register in app | College hackathon, sports, workshop | Full registration in the app, with roster and counts |
| External | SIH, other colleges' contests | The student registers on the organizer's site, then taps 'I registered' with an optional registration ID. Counted as tracking, not as a registration |

The app cannot register a student on an outside website for them. Each event stores its registration mode, minimum and maximum team size, and registration deadline.

**Team registration flow**

1. The leader taps Register team on the event. Solo events show Register instead.
2. The leader enters a team name and adds members, either from accepted teammates (team finder) or by enrollment number.
3. Each added member gets a notification and must Confirm. Nobody is added without consent. This reuses the same inbox as requests and invites.
4. When the confirmed team size is within the event's limits, the leader taps Submit.
5. Faculty see the roster. The leader can edit or withdraw until the deadline, and registrations lock at the deadline.

**Rules**

- One active registration per student per event, so nobody can be on two teams for the same event. A student already registered sees a clear message.
- A member who declines frees the spot.
- Event cards and detail pages show 'N students, M teams registered' (for external events, 'N tracking'). Only counts are public; names are visible to teammates and faculty.
- After the event date, registered students are prompted to add a result and proof, with a pre-filled participation record.
- Faculty can export the roster as CSV.

**States**

```
Registration: draft -> submitted -> withdrawn | locked (deadline)
Member:       invited -> confirmed | declined
```

**Data and API**

```js
Registration { eventId, type: 'individual'|'team', teamName, leaderId,
               members: [{ userId, status }], status, submittedAt }
Event        { ..., registrationMode, minTeamSize, maxTeamSize,
               registrationDeadline, registeredStudents, registeredTeams, trackingCount }
```

The counters on the event update when a registration is submitted or withdrawn. Endpoints: POST /events/:id/registrations, PATCH /registrations/:id (edit, submit, withdraw), PATCH /registrations/:id/members/:userId (confirm or decline), GET /events/:id/registrations (faculty roster), GET /events/:id/registrations/export (CSV), POST /events/:id/tracking.

## 6. Object State Machines

```
Event:       draft -> published -> closed (deadline passed) -> archived
TeamPost:    open -> full | closed | expired
TeamLink:    pending -> accepted | declined | withdrawn | expired
             (direction = request | invite | connect)
Credential:  pending -> verified | rejected(reason) -> resubmitted -> pending
Participation: pending -> verified | rejected(reason)
```

Rules: only verified items count in analytics. A closed event accepts no new team posts. A rejected credential always shows its reason and a resubmit button. Accepting a link on a full team is refused with a clear message.

## 7. Screen Map

| Role | Screens |
| --- | --- |
| All | Login, notifications, settings |
| Student | Home, Events feed, Event detail, Team posts, Looking-for-team list, People search, Profile (own and others), Requests and invites inbox, Add achievement, My achievements |
| Faculty | Post event (paste, review), My events, Verification queue |
| Department head | Department dashboard, ranking breakdown |
| Admin | Institute dashboard, user approval, course catalog and aliases queue, ranking settings, reports |

Student bottom navigation: Events, Teams (with People search and the requests and invites inbox), a + button for posting, Badges, Profile.

## 8. Permissions Matrix

| Action | Student | Faculty | Dept head | Admin |
| --- | --- | --- | --- | --- |
| View events | Yes | Yes | Yes | Yes |
| Post and edit events | No | Yes | Yes | Yes |
| Create team post, invite, connect | Yes | No | No | No |
| Upload credential or participation | Yes | Yes | No | No |
| Verify credentials | No | Yes (assigned scope) | Yes (own department) | Yes |
| View own department dashboard | Summary | Summary | Full | Full |
| Manage catalog, weights, users | No | No | No | Yes |

## 9. Failure Paths

| Situation | What the user sees |
| --- | --- |
| LLM call fails or is rate limited | Falls back to the regex baseline, or an empty form beside the pasted text |
| Date or deadline is uncertain | Field highlighted, never silently guessed |
| Duplicate certificate ID | Clear message with a link to the existing record |
| Course not in catalog | 'Other' goes to an admin queue; student sees 'under review' |
| Team full or event closed | Buttons disabled with the reason shown |
| Student keeps phone hidden | Group link shared by the owner after acceptance |
| Invite expires with no reply | Sender is told it expired and can resend after the cool-down |
| Push blocked, or iPhone without install | Falls back to email |
| Verifier is slow | Item flagged after 3 days and shown to admin |

## 10. Notifications

| Trigger | Channel | Goal |
| --- | --- | --- |
| New event matching branch and year | Push, email digest | Discovery |
| 48 hours and 4 hours before a deadline | Push | Action |
| Request, invite or connect received | Push, email | Keep teams moving |
| Item accepted or declined | Push | Close the loop |
| Credential verified or rejected | Push, email | Close the loop |
| Item expiring tomorrow | Push | Reduce stale items |

Keep to these six. Add a per-type mute in settings and a daily cap on non-urgent notifications.

## 11. Data and API Changes

Replace the separate JoinRequest with one collection that covers all three paths.

```js
TeamLink  { direction: 'request'|'invite'|'connect',
            fromUserId, toUserId, eventId?, teamPostId?,
            message, status, expiresAt, respondedAt }
LookingFlag { userId, eventId, createdAt }   // I'm looking for a team
Block       { userId, blockedUserId }
```

Indexes: unique on (fromUserId, toUserId, eventId) for pending items, and on (toUserId, status) for the inbox.

| Endpoint | Purpose |
| --- | --- |
| GET /people?skills=&branch=&year=&eventId= | Search discoverable students |
| POST /links | Create a request, invite or connect |
| PATCH /links/:id | Accept, decline, withdraw |
| GET /links?box=in or out | Inbox and sent items |
| PUT/DELETE /events/:id/looking | Toggle the looking flag |
| GET /events/:id/looking | List students looking for a team |
| POST /blocks, POST /reports | Safety actions |

Server rules: enforce daily limits, one pending per pair per event, expiry by scheduled job, and compute department from the user record, never from the request.

## 12. Metrics

| Stage | Metric |
| --- | --- |
| Discovery | Weekly active students; share who open an event |
| Action | Viewed events leading to an apply or team action |
| Teams | Acceptance rate and time to first response for each path |
| Faculty | Time to post; cards confirmed without edits |
| Verification | Hours from upload to decision |
| Safety | Reports and blocks per 100 links |

The single number to watch: students who joined a team through the platform each month.

## 13. Build Order (8 weeks)

| Weeks | Slice | Demoable result |
| --- | --- | --- |
| 1-2 | Auth, profiles, manual event form, feed, deploy | Students log in and browse real events |
| 3-4 | Paste-to-post extraction, confirmation, email notifications | Faculty publish from pasted text |
| 5-6 | Team posts, TeamLink (request, invite, connect), looking flag, inbox | A team forms end to end |
| 6-7 | Credential upload, catalog, verification queue | A certificate is verified |
| 7-8 | Dashboard, ranking, pilot, evaluation | A department rank updates from verified data |

If time runs short, ship request and invite first, and move Connect and the looking flag to the end.

## 14. First-Minute Experience and Home Screen

'Value' means the first moment the app is useful to a student: seeing a real event or team post that matters to them, not logging in or filling a profile. The target is under 60 seconds from opening the link to opening a first event.

**First-session rules**

1. After the enrollment number is entered, pre-fill name, branch and year from the student list. The student only sets a password.
2. Show the feed straight after login, filtered to their branch and year.
3. Ask for skills later, the first time they tap Request to join or 'I'm looking for a team'.
4. No tutorial screens. Real, seeded events are the onboarding.
5. Keep sessions for about 30 days so a return visit takes seconds.
6. Measure the time from first open to first event opened.

**Home screen rules (from the current design)**

| Block | Rule |
| --- | --- |
| Greeting and stats | Name, branch, year, verified badge count. Show points only if they come from verified records under the same rules as the ranking |
| Pending requests banner | Shown only when something needs review |
| Closing soon | Ongoing events by nearest deadline. Hide the block if there are none |
| Teammates needed | Matched on skills. A new student with no skills falls back to branch and year |
| Post request card | Shortcut to the same action as the + menu |
| Empty state | Say there are no events and offer an action: turn on notifications, or tap 'I'm looking for a team' |

Design decisions:

- The chat icon on team cards opens the poster's profile with a short note field. There is no in-app chat, and contact stays hidden until acceptance.
- The + button opens a menu: Post team request, I'm looking for a team, Add achievement.
- People search and the requests and invites inbox live under the Teams tab.
- The checkmark beside a name means the identity matched the student list.
- Replace sample college names and projects with real data before the demo.
- The home screen loads from one endpoint, GET /home.

**Four states for every screen**

| State | Question | Example on the Team posts screen |
| --- | --- | --- |
| Next action | What should the user do from here? | Buttons: Create team post, Request to join |
| Empty | What shows when there is nothing yet? | 'No team posts for this event yet. Be the first.' with a button |
| Loading | What shows while data loads? | Grey placeholder cards |
| Error | What if it fails? | 'Couldn't load posts. Tap to retry' |

**No dead ends**

| Situation | Exit |
| --- | --- |
| Request or invite nobody answers | Expires after 7 days; the sender can withdraw it |
| Rejected certificate | Reason shown and a Resubmit button |
| Team post stays open | Closes at the event deadline; the owner can close it earlier |
| Account waiting for approval | Status screen, email confirmation, admin reminded after 3 days |
| Wrong course on a pending credential | Student can edit it or withdraw it |

**Fraud and inflation controls**

- Proof upload is required for every record and certificate IDs are unique.
- The same proof file cannot be reused for two records.
- Verifiers use the issuer's QR code or verification link when one exists.
- Nobody verifies their own record, and every decision stores who verified it and when.
- Editing a verified record sends it back to pending.
- Uploads are limited to 5 per 24 hours and 15 pending at once (admin settings), and unusual activity, such as repeated rejected uploads, is flagged.
- The admin spot-checks about 10 percent of verified items each month.
- Participation rate is the headline rank, which limits what any single student can add.

## 15. Review Checklist and Decisions

- Can a first-time student reach value in under a minute? Addressed in section 14; confirm by timing real users in the pilot.
- Does every screen have a next action, plus empty, loading, and error states? Rule added in section 14; still to do: write the four states for each screen while building.
- Can any user be stuck in a state with no exit? Addressed in section 14; still to do: build the expiry and auto-close jobs.
- Can a result be faked or inflated? Layered controls added in section 14; NPTEL certificates carry a QR code, and a department faculty member runs the monthly spot check.
- Can someone be contacted without their consent? Closed: no contact before acceptance, enforced on the server.

**Decisions**

- Discoverability: on by default for logged-in college students, showing name, branch, year, and skills only, asked once at first login. Contact details are never visible.
- Limits (admin settings): 10 invites and connects per user per day, and 5 certificate uploads per 24 hours with at most 15 pending at once.
- Verification: faculty verify their own department's items. For now only department faculty verify items; the admin handles disputes, and a department faculty member does the monthly spot check.

**Still open**

- Mentor's view on the decisions above, if they have one.
- The default ranking metric the department prefers.
- Other issuers: check whether they print a QR code or link (NPTEL does).
- Spot check owner: a department faculty member for now.
