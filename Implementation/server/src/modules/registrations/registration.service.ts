import mongoose from 'mongoose';
import { Registration, type IRegistration, type IMember } from '@/models/registration.model';
import { Event }        from '@/models/event.model';
import { User }         from '@/models/user.model';
import type { AuthUser } from '@/shared/types';
import type {
  CreateRegistrationBody,
  UpdateRegistrationBody,
  MemberRespondBody,
  CreateTrackingBody,
  RosterQuery,
} from './registration.schema';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '@/shared/errors';

// ── Response shapes ───────────────────────────────────────────────────────────

export interface MemberCard {
  userId:      string;
  name:        string;
  status:      IMember['status'];
  respondedAt?: string;
}

export interface RegistrationCard {
  id:             string;
  eventId:        string;
  type:           IRegistration['type'];
  status:         IRegistration['status'];
  teamName?:      string;
  leader:         { id: string; name: string };
  members:        MemberCard[];
  externalRegId?: string;
  submittedAt?:   string;
  createdAt:      string;
}

// ── Helper: shape Registration doc into RegistrationCard ─────────────────────

function shapeReg(
  reg: IRegistration & {
    leaderId:   { _id: mongoose.Types.ObjectId; name: string };
    members:    Array<IMember & { userId: { _id: mongoose.Types.ObjectId; name: string } }>;
  },
): RegistrationCard {
  return {
    id:       reg._id.toString(),
    eventId:  reg.eventId.toString(),
    type:     reg.type,
    status:   reg.status,
    teamName: reg.teamName,
    leader:   { id: reg.leaderId._id.toString(), name: reg.leaderId.name },
    members:  reg.members.map(m => ({
      userId:      (m.userId as unknown as { _id: mongoose.Types.ObjectId; name: string })._id.toString(),
      name:        (m.userId as unknown as { _id: mongoose.Types.ObjectId; name: string }).name,
      status:      m.status,
      respondedAt: m.respondedAt?.toISOString(),
    })),
    externalRegId: reg.externalRegId,
    submittedAt:   reg.submittedAt?.toISOString(),
    createdAt:     reg.createdAt.toISOString(),
  };
}

/** Populate a registration for response shaping */
async function populateReg(id: mongoose.Types.ObjectId | string) {
  return Registration.findById(id)
    .populate<{ leaderId: { _id: mongoose.Types.ObjectId; name: string } }>('leaderId', 'name')
    .populate<{ members: Array<IMember & { userId: { _id: mongoose.Types.ObjectId; name: string } }> }>(
      'members.userId', 'name',
    )
    .lean();
}

// ── POST /api/v1/events/:id/registrations ────────────────────────────────────
//
// SDE3 design:
//   1. Event guard: must be published + registrationMode='in_app' + not past deadline.
//   2. Leader added as members[0] with status='confirmed'.
//   3. Invited members added with status='invited' (consent not yet given).
//   4. Partial unique index catches duplicate active registration → 11000 → 409.
//   5. type='tracking' uses createTracking() — separate function, not this one.

export async function createRegistration(
  actor: AuthUser,
  eventId: string,
  body: CreateRegistrationBody,
): Promise<RegistrationCard> {
  if (!mongoose.isValidObjectId(eventId)) throw new NotFoundError('Event');

  // ── Guard: event must be valid for in-app registration ───────────────────
  const event = await Event.findOne({
    _id: eventId,
    status: 'published',
    deletedAt: { $exists: false },
  })
    .select('registrationMode registrationDeadline teamSize title')
    .lean();

  if (!event) throw new NotFoundError('Event');

  if (event.registrationMode !== 'in_app') {
    throw new ForbiddenError('This event uses external registration. Use the event link to register.');
  }

  if (event.registrationDeadline && new Date() > event.registrationDeadline) {
    throw new ForbiddenError('Registration deadline has passed.');
  }

  // ── Validate and resolve invited members ─────────────────────────────────
  const invitedIds: string[] = [];
  if (body.type === 'team' && body.memberUserIds?.length) {
    // Validate: no self-invite, no dupes, all users must exist+active
    const unique = [...new Set(body.memberUserIds)];

    if (unique.includes(actor.id)) {
      throw new ForbiddenError('You cannot invite yourself as a member.');
    }

    // Max check against teamSize.max (leader counts as 1 slot)
    const maxInvites = (event.teamSize?.max ?? 10) - 1;
    if (unique.length > maxInvites) {
      throw new ValidationError(
        `Max team size is ${event.teamSize?.max}. You can invite at most ${maxInvites} members.`,
      );
    }

    // Validate all user IDs exist + are active students
    const validIds = unique.filter(id => mongoose.isValidObjectId(id));
    if (validIds.length !== unique.length) {
      throw new ValidationError('One or more member IDs are invalid.');
    }
    const existingCount = await User.countDocuments({
      _id: { $in: validIds },
      role: 'student',
      status: 'active',
    });
    if (existingCount !== validIds.length) {
      throw new NotFoundError('One or more invited users do not exist or are not active students.');
    }

    invitedIds.push(...validIds);
  }

  // ── Build members array: leader confirmed first, then invited ─────────────
  const members: Array<{ userId: string; status: IMember['status'] }> = [
    { userId: actor.id, status: 'confirmed' },
    ...invitedIds.map(id => ({ userId: id, status: 'invited' as const })),
  ];

  // ── Create registration (partial unique index handles duplicate guard) ────
  let reg: IRegistration;
  try {
    reg = await Registration.create({
      eventId,
      type:     body.type,
      teamName: body.teamName,
      leaderId: actor.id,
      members,
      status:   'draft',
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      throw new ConflictError(
        'You already have an active registration for this event. Withdraw it before creating a new one.',
      );
    }
    throw err;
  }

  const populated = await populateReg(reg._id);
  return shapeReg(populated as unknown as Parameters<typeof shapeReg>[0]);
}

// ── POST /api/v1/events/:id/tracking ─────────────────────────────────────────
//
// SDE3 note: tracking increments Event.counters.tracking atomically inside
// a session, but NOT counters.students (can't verify external registrations).

export async function createTracking(
  actor: AuthUser,
  eventId: string,
  body: CreateTrackingBody,
): Promise<RegistrationCard> {
  if (!mongoose.isValidObjectId(eventId)) throw new NotFoundError('Event');

  const event = await Event.findOne({
    _id: eventId,
    status: 'published',
    deletedAt: { $exists: false },
  })
    .select('registrationDeadline counters')
    .lean();

  if (!event) throw new NotFoundError('Event');
  if (event.registrationDeadline && new Date() > event.registrationDeadline) {
    throw new ForbiddenError('Registration deadline has passed.');
  }

  // ── Create tracking + increment counter atomically ────────────────────────
  const session = await mongoose.startSession();
  // captured outside callback so TypeScript can see it post-transaction
  let createdReg: IRegistration | null = null;
  try {
    await session.withTransaction(async () => {
      const [created] = await Registration.create(
        [{
          eventId,
          type:         'tracking',
          leaderId:     actor.id,
          members:      [{ userId: actor.id, status: 'confirmed' }],
          externalRegId: body.externalRegId,
          status:       'submitted',
          submittedAt:  new Date(),
        }],
        { session },
      );
      createdReg = created as unknown as IRegistration;

      await Event.findByIdAndUpdate(
        eventId,
        { $inc: { 'counters.tracking': 1 } },
        { session },
      );
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      throw new ConflictError('You have already tracked your registration for this event.');
    }
    throw err;
  } finally {
    session.endSession();
  }

  if (!createdReg) throw new ConflictError('Failed to create tracking registration.');
  const populated = await populateReg((createdReg as IRegistration)._id);
  return shapeReg(populated as unknown as Parameters<typeof shapeReg>[0]);
}

// ── PATCH /api/v1/registrations/:id ──────────────────────────────────────────
//
// Handles three sub-actions: submit, withdraw, edit.
// Only the leaderId can call this.

export async function updateRegistration(
  actor: AuthUser,
  regId: string,
  body: UpdateRegistrationBody,
): Promise<RegistrationCard> {
  if (!mongoose.isValidObjectId(regId)) throw new NotFoundError('Registration');

  const reg = await Registration.findById(regId).lean();
  if (!reg) throw new NotFoundError('Registration');

  // Only the leader can edit / submit / withdraw
  if (reg.leaderId.toString() !== actor.id) {
    throw new ForbiddenError('Only the team leader can modify this registration.');
  }

  if (reg.status === 'locked') {
    throw new ConflictError('This registration is locked and cannot be modified.');
  }

  // ── EDIT ──────────────────────────────────────────────────────────────────
  if (body.action === 'edit') {
    if (reg.status !== 'draft') {
      throw new ConflictError('Only draft registrations can be edited. Withdraw and re-register to make changes.');
    }

    const updates: Partial<IRegistration> = {};
    if (body.teamName !== undefined) updates.teamName = body.teamName;

    if (body.memberUserIds !== undefined) {
      // Replacement strategy: keep all confirmed members, replace invited list.
      const confirmed = reg.members.filter(m => m.status === 'confirmed');
      const confirmedIds = new Set(confirmed.map(m => m.userId.toString()));

      // Validate new invites (exclude already-confirmed members)
      const newInviteIds = [...new Set(body.memberUserIds)].filter(
        id => !confirmedIds.has(id) && id !== actor.id,
      );

      if (newInviteIds.length) {
        const event = await Event.findById(reg.eventId).select('teamSize').lean();
        const maxTotal = event?.teamSize?.max ?? 10;
        if (confirmed.length + newInviteIds.length > maxTotal) {
          throw new ValidationError(`Max team size is ${maxTotal}.`);
        }

        const validIds = newInviteIds.filter(id => mongoose.isValidObjectId(id));
        const existingCount = await User.countDocuments({
          _id: { $in: validIds }, role: 'student', status: 'active',
        });
        if (existingCount !== validIds.length) {
          throw new NotFoundError('One or more invited users do not exist or are not active students.');
        }
      }

      updates.members = [
        ...confirmed,
        ...newInviteIds.map(id => ({
          userId: new mongoose.Types.ObjectId(id),
          status: 'invited' as const,
        })),
      ];
    }

    const updated = await Registration.findByIdAndUpdate(regId, { $set: updates }, { new: true });
    if (!updated) throw new NotFoundError('Registration');
    const populated = await populateReg(updated._id);
    return shapeReg(populated as unknown as Parameters<typeof shapeReg>[0]);
  }

  // ── SUBMIT ────────────────────────────────────────────────────────────────
  if (body.action === 'submit') {
    if (!['draft'].includes(reg.status)) {
      throw new ConflictError(`Cannot submit a registration with status '${reg.status}'.`);
    }

    // Fetch event for deadline + teamSize validation
    const event = await Event.findOne({
      _id: reg.eventId,
      status: 'published',
      deletedAt: { $exists: false },
    })
      .select('registrationDeadline teamSize counters')
      .lean();

    if (!event) throw new NotFoundError('Event (closed or deleted)');
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      throw new ForbiddenError('Registration deadline has passed.');
    }

    // Count confirmed members (leader always confirmed)
    const confirmedCount = reg.members.filter(m => m.status === 'confirmed').length;
    const { min = 1, max = 10 } = event.teamSize ?? {};

    if (reg.type === 'team') {
      if (confirmedCount < min) {
        throw new ValidationError(
          `Need at least ${min} confirmed member${min > 1 ? 's' : ''} to submit. ` +
          `Currently ${confirmedCount} confirmed. Pending invites do not count.`,
        );
      }
      if (confirmedCount > max) {
        throw new ValidationError(`Max team size is ${max}. ${confirmedCount} members are confirmed.`);
      }
    }

    // ── Atomic submit + counter increment in a session ─────────────────────
    //
    // SDE3 note: counters.students tracks confirmed participants.
    // counters.teams tracks submitted team registrations.
    // Both updated in the same transaction — no eventual consistency lag.
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Registration.findByIdAndUpdate(
          regId,
          { $set: { status: 'submitted', submittedAt: new Date() } },
          { session },
        );

        const counterInc: Record<string, number> = {
          'counters.students': confirmedCount,
        };
        if (reg.type === 'team') {
          counterInc['counters.teams'] = 1;
        }

        await Event.findByIdAndUpdate(
          reg.eventId,
          { $inc: counterInc },
          { session },
        );
      });
    } finally {
      session.endSession();
    }

    const populated = await populateReg(regId);
    return shapeReg(populated as unknown as Parameters<typeof shapeReg>[0]);
  }

  // ── WITHDRAW ──────────────────────────────────────────────────────────────
  if (body.action === 'withdraw') {
    if (reg.status === 'withdrawn') {
      throw new ConflictError('Registration is already withdrawn.');
    }

    // If it was submitted, decrement counters atomically
    if (reg.status === 'submitted') {
      const confirmedCount = reg.members.filter(m => m.status === 'confirmed').length;
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await Registration.findByIdAndUpdate(
            regId,
            { $set: { status: 'withdrawn' } },
            { session },
          );

          const counterDec: Record<string, number> = {
            'counters.students': -confirmedCount,
          };
          if (reg.type === 'team') {
            counterDec['counters.teams'] = -1;
          }

          await Event.findByIdAndUpdate(
            reg.eventId,
            { $inc: counterDec },
            { session },
          );
        });
      } finally {
        session.endSession();
      }
    } else {
      // Draft withdraw: no counter change
      await Registration.findByIdAndUpdate(regId, { $set: { status: 'withdrawn' } });
    }

    const populated = await populateReg(regId);
    return shapeReg(populated as unknown as Parameters<typeof shapeReg>[0]);
  }

  throw new ValidationError('Unknown action.');
}

// ── PATCH /api/v1/registrations/:id/members/:uid ─────────────────────────────
//
// Only the specific member (uid === req.user.id) can respond.
// Confirm: status → 'confirmed'.
// Decline: member removed from members[] entirely — frees slot for replacement.

export async function respondMember(
  actor: AuthUser,
  regId: string,
  targetUid: string,
  body: MemberRespondBody,
): Promise<RegistrationCard> {
  if (!mongoose.isValidObjectId(regId)) throw new NotFoundError('Registration');

  // Permission: only the targeted member can respond
  if (actor.id !== targetUid) {
    throw new ForbiddenError('You can only respond to your own invitation.');
  }

  const reg = await Registration.findById(regId).lean();
  if (!reg) throw new NotFoundError('Registration');

  if (reg.status === 'locked') {
    throw new ConflictError('This registration is locked — no changes can be made.');
  }
  if (reg.status === 'withdrawn') {
    throw new ConflictError('This registration has been withdrawn.');
  }

  const memberIndex = reg.members.findIndex(m => m.userId.toString() === targetUid);
  if (memberIndex === -1) {
    throw new NotFoundError('You are not a member of this registration.');
  }
  const member = reg.members[memberIndex]!;
  if (member.status !== 'invited') {
    throw new ConflictError('You have already responded to this invitation.');
  }

  if (body.action === 'confirm') {
    await Registration.findByIdAndUpdate(regId, {
      $set: {
        [`members.${memberIndex}.status`]:      'confirmed',
        [`members.${memberIndex}.respondedAt`]: new Date(),
      },
    });
  } else {
    // Decline → remove member from array entirely (frees slot for replacement invite)
    await Registration.findByIdAndUpdate(regId, {
      $pull: { members: { userId: new mongoose.Types.ObjectId(targetUid) } },
    });
  }

  const populated = await populateReg(regId);
  return shapeReg(populated as unknown as Parameters<typeof shapeReg>[0]);
}

// ── GET /api/v1/registrations/mine?eventId= ──────────────────────────────────

export async function getMyRegistration(
  actor: AuthUser,
  eventId: string,
): Promise<RegistrationCard | null> {
  if (!mongoose.isValidObjectId(eventId)) return null;

  const reg = await Registration.findOne({
    'members.userId': actor.id,
    eventId,
    status: { $in: ['draft', 'submitted', 'locked'] },
  }).lean();

  if (!reg) return null;

  const populated = await populateReg(reg._id);
  return shapeReg(populated as unknown as Parameters<typeof shapeReg>[0]);
}

// ── GET /api/v1/events/:id/registrations (faculty+) ──────────────────────────
//
// Keyset pagination on _id. status='all' returns everything.

export async function getRoster(
  eventId: string,
  query: RosterQuery,
): Promise<{ items: RegistrationCard[]; nextCursor?: string; hasMore: boolean }> {
  if (!mongoose.isValidObjectId(eventId)) return { items: [], hasMore: false };

  const { status, limit, cursor } = query;

  const filter: Record<string, unknown> = { eventId };
  if (status !== 'all') filter.status = status;
  if (cursor) filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };

  const raw = await Registration.find(filter)
    .populate<{ leaderId: { _id: mongoose.Types.ObjectId; name: string } }>('leaderId', 'name')
    .populate<{ members: Array<IMember & { userId: { _id: mongoose.Types.ObjectId; name: string } }> }>(
      'members.userId', 'name',
    )
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore    = raw.length > limit;
  const items      = hasMore ? raw.slice(0, limit) : raw;
  const nextCursor = hasMore ? items[items.length - 1]?._id.toString() : undefined;

  return {
    items: items.map(r => shapeReg(r as unknown as Parameters<typeof shapeReg>[0])),
    nextCursor,
    hasMore,
  };
}

// ── GET /api/v1/events/:id/registrations/export (faculty+) ───────────────────
//
// Returns a CSV-ready array of rows. The controller pipes this to a streaming
// response. Using .cursor() avoids loading all docs into memory.
// Fields: regId, type, status, teamName, leaderName, members (pipe-separated name:status)

export interface CsvRow {
  regId:       string;
  type:        string;
  status:      string;
  teamName:    string;
  leaderName:  string;
  members:     string;
  submittedAt: string;
}

export async function streamRosterCsv(
  eventId: string,
  onRow:    (row: CsvRow) => void,
): Promise<void> {
  if (!mongoose.isValidObjectId(eventId)) return;

  const cursor = Registration.find({ eventId })
    .populate<{ leaderId: { _id: mongoose.Types.ObjectId; name: string } }>('leaderId', 'name')
    .populate<{ members: Array<IMember & { userId: { _id: mongoose.Types.ObjectId; name: string } }> }>(
      'members.userId', 'name',
    )
    .sort({ createdAt: 1 })
    .cursor();

  for await (const reg of cursor) {
    const r = reg as unknown as IRegistration & {
      leaderId: { _id: mongoose.Types.ObjectId; name: string };
      members:  Array<IMember & { userId: { _id: mongoose.Types.ObjectId; name: string } }>;
    };
    onRow({
      regId:       r._id.toString(),
      type:        r.type,
      status:      r.status,
      teamName:    r.teamName ?? '',
      leaderName:  r.leaderId.name,
      members:     r.members
        .map(m => `${(m.userId as unknown as { name: string }).name}:${m.status}`)
        .join(' | '),
      submittedAt: r.submittedAt?.toISOString() ?? '',
    });
  }
}
