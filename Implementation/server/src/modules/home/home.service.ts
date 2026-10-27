import mongoose                              from 'mongoose';
import { User }                              from '@/models/user.model';
import { Credential }                        from '@/models/credential.model';
import { TeamLink }                          from '@/models/teamLink.model';
import { TeamPost }                          from '@/models/teamPost.model';
import { Event }                             from '@/models/event.model';
import { Notification }                      from '@/models/notification.model';
import { getCache, setCache, invalidateCache, invalidateCachePrefix } from '@/shared/cache';
import { NotFoundError }                     from '@/shared/errors';

// ── Public types ──────────────────────────────────────────────────────────────

export interface HomeUser {
  name:               string;
  branch:             string;
  year:               number | null;
  verifiedBadgeCount: number;
}

interface EventSummary {
  id:       string;
  title:    string;
  deadline: string;
  type:     string;
}

interface TeamPostSummary {
  id:             string;
  eventId:        string;
  title:          string;
  requiredSkills: string[];
}

export interface HomeData {
  user:                    HomeUser;
  unreadNotificationsFlag: boolean;
  hasSkillsMatch?:         boolean;   // true if teamPosts matched via skills (vs dept/year fallback)
  pendingRequestCount?:    number;
  closingSoonEvents?:      EventSummary[];
  matchedTeamPosts?:       TeamPostSummary[];
}

// ── Cache key helper ──────────────────────────────────────────────────────────

export function homeKey(userId: string): string {
  return `home:${userId}`;
}

/**
 * invalidateHomeCache — targeted invalidation for a single user's home.
 * Call this from link.service on link created/updated.
 */
export function invalidateHomeCache(userId: string): void {
  invalidateCache(homeKey(userId));
}

/**
 * invalidateAllHomeCaches — wipe all home:* entries.
 * Call this from event.service on publishEvent (new event relevant to all students).
 */
export function invalidateAllHomeCaches(): void {
  invalidateCachePrefix('home:');
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * getHomeData — personalised home feed, cached 30s per userId.
 *
 * One parallel Promise.all — single aggregation round-trip.
 * Empty fields are omitted from the response (spec: "empty arrays omitted").
 */
export async function getHomeData(userId: string): Promise<HomeData> {
  const cacheKey = homeKey(userId);
  const cached   = getCache<HomeData>(cacheKey);
  if (cached) return cached;

  // Fetch user first — needed for dept/year/skills context
  const user = await User.findById(userId)
    .populate<{ department: { _id: mongoose.Types.ObjectId; name: string } }>('department', 'name')
    .lean();

  if (!user) throw new NotFoundError('User');

  const now          = new Date();
  const fortyEightH  = new Date(now.getTime() + 48 * 3600 * 1000);
  const hasSkills    = Array.isArray(user.skills) && user.skills.length > 0;

  // All parallel — no sequential waterfalls
  const [
    verifiedBadgeCount,
    pendingRequestCount,
    closingSoon,
    skillTeamPosts,
    fallbackTeamPosts,
    unreadFlag,
  ] = await Promise.all([
    // Verified credential count for badge chip
    Credential.countDocuments({
      studentId:             new mongoose.Types.ObjectId(userId),
      'verification.status': 'verified',
    }),

    // Pending links in either direction (inbox + outbox)
    TeamLink.countDocuments({
      $or:    [{ fromUserId: userId }, { toUserId: userId }],
      status: 'pending',
    }),

    // Events closing in next 48h
    Event.find({
      deadline: { $gte: now, $lt: fortyEightH },
      status:   'published',
      deletedAt: { $exists: false },
    })
      .sort({ deadline: 1 })
      .limit(5)
      .select('_id title deadline type')
      .lean(),

    // Skill-matched open team posts
    hasSkills
      ? TeamPost.find({ rolesNeeded: { $in: user.skills }, status: 'open' })
          .limit(5)
          .select('_id eventId title rolesNeeded')
          .lean()
      : Promise.resolve([]),

    // Dept+year fallback — only used if skills produced no results
    TeamPost.find({ status: 'open' })
      .limit(5)
      .select('_id eventId title rolesNeeded')
      .lean(),

    // Unread flag — Notification.exists is lean and indexed
    Notification.exists({ userId, readAt: null }),
  ]);

  // Prefer skill matches; fall back to dept/year
  const useSkillsMatch  = hasSkills && skillTeamPosts.length > 0;
  const teamPosts       = useSkillsMatch ? skillTeamPosts : fallbackTeamPosts;

  // Build response — empty-key omission per spec
  const data: HomeData = {
    user: {
      name:               user.name,
      branch:             (user.department as { name?: string })?.name ?? '',
      year:               user.year ?? null,
      verifiedBadgeCount,
    },
    unreadNotificationsFlag: !!unreadFlag,
    hasSkillsMatch:          useSkillsMatch,
  };

  if (pendingRequestCount > 0) {
    data.pendingRequestCount = pendingRequestCount;
  }

  if (closingSoon.length > 0) {
    data.closingSoonEvents = closingSoon.map(e => ({
      id:       e._id.toString(),
      title:    e.title,
      deadline: (e.deadline as Date | undefined)?.toISOString() ?? '',
      type:     e.type,
    }));
  }

  if (teamPosts.length > 0) {
    data.matchedTeamPosts = teamPosts.map(p => ({
      id:             p._id.toString(),
      eventId:        p.eventId.toString(),
      title:          p.title,
      requiredSkills: (p as unknown as { rolesNeeded?: string[] }).rolesNeeded ?? [],
    }));
  }

  setCache(cacheKey, data, 30); // 30s TTL — mirrors spec
  return data;
}
