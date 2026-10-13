# Campus Innovation Platform - Backend Schemas

*Mongoose (Node.js and MongoDB) schemas for every collection, with indexes, constraints and the rules the server must enforce. October 2026.*

## 1. Collections at a Glance

| Group | Collection | Purpose |
| --- | --- | --- |
| Identity | StudentRoster | Pre-loaded valid students (enrollment number, college ID, branch, year) |
| Identity | User | Accounts for students, faculty, department heads and admins |
| Identity | Otp | Short-lived email OTP codes (auto-deleted) |
| Identity | Department | Departments and student strength for fair ranking |
| Credentials | Course | Catalog of issuer courses with category and verification method |
| Credentials | Credential | A student's uploaded certificate and its verification |
| Events | Event | Events and contests, with registration settings and counters |
| Events | Registration | Individual, team and external-tracking registrations |
| Events | Participation | Results and proof after an event |
| Teams | TeamPost | A leader's call for teammates |
| Teams | TeamLink | Requests, invites and connects between users |
| Teams | LookingFlag | 'I'm looking for a team' marker on an event |
| Teams | Block, Report | Safety tools |
| Platform | Setting | Admin-editable limits and ranking weights |
| Platform | Notification, PushSubscription | In-app notifications and web push endpoints |
| Platform | AuditLog | Who did what and when |

## 2. Conventions

- All schemas use `timestamps: true` (`createdAt`, `updatedAt`) unless noted.
- References are `ObjectId` with a `ref`. Status fields use string enums.
- Sensitive fields (`passwordHash`, `phone`) use `select: false` so they never leave the database by accident.
- Department on a credential or participation is copied from the user record on the server, never from the request.
- Limits and weights live in `Setting`, not in code.
- Counters on `Event` are denormalized for fast event cards and are updated in the same operation as the registration change.

```js
const { Schema, model } = require('mongoose');
const oid = (ref) => ({ type: Schema.Types.ObjectId, ref });
```

## 3. Schemas

### 3.1 Identity

```js
const StudentRoster = new Schema({
  enrollmentNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
  collegeId:    { type: String, required: true, unique: true, trim: true },
  name:         { type: String, required: true },
  department:   oid('Department'),
  year:         { type: Number, min: 1, max: 4 },
  email:        { type: String, lowercase: true },   // official email, if the roster has one
  claimedBy:    oid('User')                          // set when the student registers
}, { timestamps: true });

const User = new Schema({
  enrollmentNo: { type: String, unique: true, sparse: true, uppercase: true },
  collegeId:    String,
  name:         { type: String, required: true },
  email:        { type: String, unique: true, sparse: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role:         { type: String, enum: ['student', 'faculty', 'dept_head', 'admin'], default: 'student', index: true },
  department:   { ...oid('Department'), index: true },
  year:         { type: Number, min: 1, max: 4 },
  skills:       [{ type: String, lowercase: true, trim: true }],
  phone:        { type: String, select: false },
  phoneVisible: { type: Boolean, default: false },   // hidden by default
  allowInvites: { type: Boolean, default: true },    // controls Invite and Connect buttons
  status:       { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  emailVerified:{ type: Boolean, default: false },
  lastLoginAt:  Date,
  firstOpenedAt: Date,                               // first-minute metric
  firstEventOpenedAt: Date
}, { timestamps: true });
User.index({ department: 1, year: 1 });
User.index({ skills: 1 });

const Otp = new Schema({
  userId:   oid('User'),
  purpose:  { type: String, enum: ['signup', 'reset'] },
  codeHash: String,
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, index: { expires: 0 } }   // TTL: removed at expiresAt
});

const Department = new Schema({
  code:            { type: String, unique: true, uppercase: true },  // CSE, ECE
  name:            String,
  studentStrength: { type: Number, default: 0 },
  headId:          oid('User')
}, { timestamps: true });
```

### 3.2 Catalog and Credentials

```js
const Course = new Schema({
  issuer:   { type: String, required: true, index: true },      // NPTEL, AWS
  name:     { type: String, required: true },
  code:     String,
  category: { type: String, required: true, index: true },      // Programming, AI/ML, Cloud
  language: String,
  aliases:  [String],                                           // typed names mapped by admin
  verificationMethod: { type: String, enum: ['issuer_qr', 'faculty'], default: 'faculty' },
  active:   { type: Boolean, default: true }
}, { timestamps: true });
Course.index({ issuer: 1, name: 1 }, { unique: true });
Course.index({ name: 'text', aliases: 'text' });

// Shared by Credential and Participation
const Verification = new Schema({
  status:     { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending', index: true },
  method:     { type: String, enum: ['issuer_qr', 'faculty', 'admin'] },
  verifiedBy: oid('User'),
  verifiedAt: Date,
  reason:     String,                                            // required when rejected
  evidence:   { url: String, fetchedAt: Date, matchScore: Number, matched: Schema.Types.Mixed }
}, { _id: false });

const Credential = new Schema({
  studentId:  { ...oid('User'), required: true, index: true },
  department: { ...oid('Department'), required: true },         // copied from the user
  courseId:   oid('Course'),
  otherCourseName: String,                                       // set when 'Other' was chosen
  issuer:     { type: String, required: true },
  session:    String,                                            // e.g. Jan-Mar 2025
  year:       { type: Number, required: true, index: true },
  tier:       { type: String, enum: ['pass', 'elite', 'elite_silver', 'elite_gold', 'other'] },
  certificateId: { type: String, uppercase: true, trim: true },  // NPTEL roll number
  proofUrl:   { type: String, required: true },
  proofHash:  { type: String, required: true },                  // SHA-256 of the file
  qr:         { url: String, host: String },
  verification: { type: Verification, default: () => ({}) }
}, { timestamps: true });
Credential.index({ issuer: 1, certificateId: 1 },
  { unique: true, partialFilterExpression: { certificateId: { $type: 'string' } } });
Credential.index({ proofHash: 1 }, { unique: true });
Credential.index({ department: 1, year: 1, 'verification.status': 1 });
Credential.index({ studentId: 1, createdAt: -1 });
```

### 3.3 Events, Registrations and Participation

```js
const Event = new Schema({
  title:     { type: String, required: true },
  type:      { type: String, enum: ['hackathon', 'competition', 'sports', 'workshop', 'seminar', 'other'], index: true },
  organizer: String,
  deadline:  Date,
  eventDate: Date,
  eligibility: { branches: [String], years: [Number], notes: String },
  teamSize:  { min: { type: Number, default: 1 }, max: { type: Number, default: 1 } },
  fee:       String,
  link:      String,
  summary:   String,
  registrationMode:     { type: String, enum: ['in_app', 'external'], default: 'external' },
  registrationDeadline: Date,
  counters:  { students: { type: Number, default: 0 }, teams: { type: Number, default: 0 }, tracking: { type: Number, default: 0 } },
  rawMessage: String,                                            // original pasted text
  extraction: { model: String, editedFields: [String], usedFallback: Boolean },
  postedBy:  oid('User'),
  status:    { type: String, enum: ['draft', 'published', 'closed', 'archived'], default: 'draft', index: true }
}, { timestamps: true });
Event.index({ status: 1, deadline: 1 });
Event.index({ type: 1, deadline: 1 });

const Registration = new Schema({
  eventId:  { ...oid('Event'), required: true, index: true },
  type:     { type: String, enum: ['individual', 'team', 'tracking'], required: true },
  teamName: String,
  leaderId: oid('User'),
  members:  [{ _id: false, userId: oid('User'),
               status: { type: String, enum: ['invited', 'confirmed'], default: 'invited' } }],
  externalRegId: String,                                         // for tracking records
  status:   { type: String, enum: ['draft', 'submitted', 'withdrawn', 'locked'], default: 'draft' },
  submittedAt: Date
}, { timestamps: true });
// one active registration per student per event (leader is also in members)
Registration.index({ eventId: 1, 'members.userId': 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['draft', 'submitted', 'locked'] } } });

const Participation = new Schema({
  eventId:        { ...oid('Event'), required: true, index: true },
  registrationId: oid('Registration'),
  teamName:       String,
  members:        [{ _id: false, userId: oid('User'), department: oid('Department') }],
  result:         { type: String, enum: ['participated', 'finalist', 'runner_up', 'winner', 'other'] },
  resultNote:     String,
  proofUrl:       String,
  proofHash:      String,
  verification:   { type: Verification, default: () => ({}) }
}, { timestamps: true });
Participation.index({ 'members.userId': 1, 'verification.status': 1 });
Participation.index({ 'members.department': 1, 'verification.status': 1 });
```

### 3.4 Teams and Safety

```js
const TeamPost = new Schema({
  eventId:     { ...oid('Event'), required: true },
  ownerId:     { ...oid('User'), required: true, index: true },
  title:       String,
  description: String,
  rolesNeeded: [String],
  spotsTotal:  Number,
  spotsLeft:   Number,
  status:      { type: String, enum: ['open', 'full', 'closed', 'expired'], default: 'open' },
  expiresAt:   Date                                              // event deadline
}, { timestamps: true });
TeamPost.index({ eventId: 1, status: 1 });

const TeamLink = new Schema({
  direction:  { type: String, enum: ['request', 'invite', 'connect'], required: true },
  fromUserId: { ...oid('User'), required: true },
  toUserId:   { ...oid('User'), required: true },               // for a request: the post owner
  eventId:    oid('Event'),
  teamPostId: oid('TeamPost'),
  message:    { type: String, maxlength: 200 },
  status:     { type: String, enum: ['pending', 'accepted', 'declined', 'withdrawn', 'expired'], default: 'pending' },
  expiresAt:  Date,                                              // created + 7 days
  respondedAt: Date
}, { timestamps: true });
TeamLink.index({ toUserId: 1, status: 1, createdAt: -1 });     // inbox
TeamLink.index({ fromUserId: 1, status: 1, createdAt: -1 });   // sent
TeamLink.index({ fromUserId: 1, toUserId: 1, eventId: 1 },     // one pending per pair per event
  { unique: true, partialFilterExpression: { status: 'pending' } });
TeamLink.index({ expiresAt: 1 }, { partialFilterExpression: { status: 'pending' } });

const LookingFlag = new Schema({
  userId:  { ...oid('User'), required: true },
  eventId: { ...oid('Event'), required: true },
  note:    { type: String, maxlength: 120 }
}, { timestamps: true });
LookingFlag.index({ userId: 1, eventId: 1 }, { unique: true });
LookingFlag.index({ eventId: 1 });

const Block = new Schema({
  userId:        { ...oid('User'), required: true },
  blockedUserId: { ...oid('User'), required: true }
}, { timestamps: true });
Block.index({ userId: 1, blockedUserId: 1 }, { unique: true });

const Report = new Schema({
  reporterId: { ...oid('User'), required: true },
  targetUserId: oid('User'),
  linkId:    oid('TeamLink'),
  reason:    { type: String, maxlength: 500 },
  status:    { type: String, enum: ['open', 'reviewed', 'actioned'], default: 'open' }
}, { timestamps: true });
```

### 3.5 Platform

```js
const Setting = new Schema({
  key:   { type: String, unique: true },
  value: Schema.Types.Mixed,
  updatedBy: oid('User')
}, { timestamps: true });

const Notification = new Schema({
  userId:  { ...oid('User'), required: true },
  type:    { type: String, enum: ['event_new', 'deadline', 'link_received', 'link_update', 'credential_update', 'link_expiring'] },
  payload: Schema.Types.Mixed,
  readAt:  Date
}, { timestamps: true });
Notification.index({ userId: 1, readAt: 1, createdAt: -1 });

const PushSubscription = new Schema({
  userId:   { ...oid('User'), required: true, index: true },
  endpoint: { type: String, unique: true },
  keys:     { p256dh: String, auth: String }
}, { timestamps: true });

const AuditLog = new Schema({
  actorId:    oid('User'),
  action:     String,                                            // credential.verify, link.accept
  entityType: String,
  entityId:   Schema.Types.ObjectId,
  meta:       Schema.Types.Mixed
}, { timestamps: { createdAt: 'at', updatedAt: false } });
AuditLog.index({ entityType: 1, entityId: 1, at: -1 });
```

**Default settings**

| Key | Default | Meaning |
| --- | --- | --- |
| uploadsPer24h | 5 | Certificate uploads per student per 24 hours |
| pendingCap | 15 | Pending credentials per student at once |
| linksPerDay | 10 | Invites plus connects per user per day |
| linkExpiryDays | 7 | Days before a pending link expires |
| declineCooldownDays | 30 | Wait before resending to the same person for the same event |
| sessionDays | 30 | Login token lifetime |
| spotCheckPercent | 10 | Share of verified items re-checked each month |
| rankingMetric | participation\_rate | Headline department rank |
| tierPoints | pass 1, elite 2, elite\_silver 3, elite\_gold 4 | Points per NPTEL tier |

## 4. Relationships

```
Department 1---* User 1---* Credential *---1 Course
User 1---* TeamPost *---1 Event 1---* Registration (members -> User)
User 1---* TeamLink (from and to), LookingFlag, Block, Report
Event 1---* Participation (members -> User, Department)
Credential and Participation share the Verification sub-document
```

## 5. Key Indexes and Constraints

| Rule | Where |
| --- | --- |
| One account per enrollment number | `User.enrollmentNo` unique |
| No duplicate certificate | `Credential` unique on (issuer, certificateId) and on `proofHash` |
| One active registration per student per event | `Registration` unique on (eventId, members.userId), partial on active status |
| One pending link per pair per event | `TeamLink` unique on (fromUserId, toUserId, eventId), partial on pending |
| One looking flag per student per event | `LookingFlag` unique on (userId, eventId) |
| OTP expiry | `Otp.expiresAt` TTL index |

## 6. Rules the Server Must Enforce in Code

- Check the enrollment number and college ID against `StudentRoster` before creating a `User`, and set `claimedBy`.
- Copy `department` from the user into every credential and participation member; ignore any value sent by the client.
- Enforce `uploadsPer24h`, `pendingCap` and `linksPerDay` using counts of recent documents and the `Setting` values.
- Reject the 30-day resend by checking for a declined `TeamLink` between the same pair for the same event.
- Never return `phone` unless a `TeamLink` or `Registration` between the two users is accepted or confirmed and `phoneVisible` is true.
- Verification: a user cannot verify their own record, editing a verified record resets it to pending, and every decision writes an `AuditLog` entry.
- Registration: when a member declines, remove them from `members` so they are free to join another team. Update `Event.counters` on submit and withdraw inside one transaction.
- Scheduled jobs: expire pending links past `expiresAt`, close team posts at the event deadline, lock registrations at `registrationDeadline`, and pick the monthly spot-check sample.
- Only verified credentials and participations feed analytics.

## 7. Ranking Query (participation rate and certificates per 100 students)

```js
Credential.aggregate([
  { $match: { 'verification.status': 'verified', year: 2026, issuer: 'NPTEL' } },
  { $group: { _id: { dept: '$department', student: '$studentId' }, n: { $sum: 1 } } },
  { $group: { _id: '$_id.dept', students: { $sum: 1 }, certificates: { $sum: '$n' } } },
  { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'd' } },
  { $unwind: '$d' },
  { $match: { 'd.studentStrength': { $gt: 0 } } },
  { $project: {
      code: '$d.code', students: 1, certificates: 1,
      participationRate: { $multiply: [{ $divide: ['$students', '$d.studentStrength'] }, 100] },
      perHundred: { $multiply: [{ $divide: ['$certificates', '$d.studentStrength'] }, 100] } } },
  { $sort: { participationRate: -1 } }
])
```

For weighted points, join each credential to `tierPoints` from `Setting` before grouping. Show student count beside each score so very small departments are read with care.
