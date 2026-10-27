import { useEffect, useRef } from 'react';
import { BottomNav }         from '@/components/layout/BottomNav';
import { AppBar }            from '@/components/layout/AppBar';
import { useNotifications, useMarkRead } from '../hooks/useNotifications';
import type { AppNotification, NotifType } from '../types';

// ── Relative time formatter ───────────────────────────────────────────────────

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function relativeTime(isoString: string): string {
  const delta   = (new Date(isoString).getTime() - Date.now()) / 1000;
  const absDelta = Math.abs(delta);
  if (absDelta < 60)   return rtf.format(Math.round(delta), 'second');
  if (absDelta < 3600) return rtf.format(Math.round(delta / 60), 'minute');
  if (absDelta < 86400) return rtf.format(Math.round(delta / 3600), 'hour');
  return rtf.format(Math.round(delta / 86400), 'day');
}

// ── Notification content builder ──────────────────────────────────────────────

interface NotifContent {
  icon:  string;
  title: string;
  body:  string;
}

function buildContent(n: AppNotification): NotifContent {
  const p = n.payload as Record<string, string>;

  switch (n.type as NotifType) {
    case 'event_new':
      return {
        icon:  'event',
        title: 'New Event',
        body:  p.eventTitle ?? 'A new event has been published for your department.',
      };

    case 'deadline':
      return {
        icon:  'schedule',
        title: `Deadline in ${p.hoursLeft}h`,
        body:  p.eventTitle ?? 'Registration deadline is approaching.',
      };

    case 'link_received':
      return {
        icon:  'person_add',
        title: 'Team Request',
        body:  p.fromName ? `${p.fromName} wants to connect with you.` : 'You have a new team request.',
      };

    case 'link_update':
      return {
        icon:  p.status === 'accepted' ? 'check_circle' : 'cancel',
        title: p.status === 'accepted' ? 'Request Accepted' : 'Request Declined',
        body:  p.status === 'accepted'
          ? 'Your team request was accepted!'
          : 'Your team request was declined.',
      };

    case 'credential_update':
      return {
        icon:  p.status === 'verified' ? 'workspace_premium' : 'report',
        title: p.status === 'verified' ? 'Certificate Verified ✓' : 'Certificate Needs Attention',
        body:  p.status === 'verified'
          ? 'Your certificate has been verified by faculty.'
          : 'A faculty member has reviewed your certificate. Check your badges.',
      };

    case 'link_expiring':
      return {
        icon:  'hourglass_bottom',
        title: 'Request Expiring Soon',
        body:  'One of your pending team requests expires tomorrow.',
      };

    default:
      return { icon: 'notifications', title: 'Notification', body: '' };
  }
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex gap-3 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-surface-container-high shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-surface-container-high rounded w-32" />
        <div className="h-3 bg-surface-container-high rounded w-56" />
      </div>
    </div>
  );
}

// ── Notification row ──────────────────────────────────────────────────────────

function NotifRow({ notif }: { notif: AppNotification }) {
  const { mutate: markRead } = useMarkRead();
  const { icon, title, body } = buildContent(notif);
  const isUnread = !notif.readAt;

  return (
    <button
      id={`notif-row-${notif.id}`}
      onClick={() => { if (isUnread) markRead(notif.id); }}
      className={`w-full flex gap-3 px-4 py-4 text-left transition-colors active:scale-[.99] ${
        isUnread
          ? 'bg-primary-container/20 hover:bg-primary-container/30'
          : 'hover:bg-surface-container-lowest'
      }`}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isUnread ? 'bg-primary/15' : 'bg-surface-container-high'
        }`}
      >
        <span
          className={`material-symbols-outlined text-[20px] ${
            isUnread ? 'text-primary' : 'text-on-surface-variant'
          }`}
          style={{ fontVariationSettings: `'FILL' ${isUnread ? 1 : 0}` }}
        >
          {icon}
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${isUnread ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'}`}>
            {title}
          </p>
          <span className="text-[10px] text-on-surface-variant shrink-0 mt-0.5">
            {relativeTime(notif.createdAt)}
          </span>
        </div>
        {body && (
          <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{body}</p>
        )}
      </div>

      {/* Unread dot */}
      {isUnread && (
        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
      )}
    </button>
  );
}

// ── NotificationsPage ─────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications();

  // IntersectionObserver on sentinel div — triggers next page load
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allNotifications = data?.pages.flatMap(p => p.notifications) ?? [];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <AppBar title="Notifications" />

      <main className="flex-1 overflow-y-auto pb-24 divide-y divide-outline-variant/20">

        {/* Loading skeleton */}
        {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <span className="material-symbols-outlined text-[48px] text-error mb-3">
              cloud_off
            </span>
            <p className="text-on-surface-variant text-sm">
              Couldn't load notifications. Please try again.
            </p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && allNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <span
              className="material-symbols-outlined text-[56px] text-on-surface-variant/40 mb-3"
            >
              notifications_none
            </span>
            <p className="text-on-surface font-semibold">No notifications yet</p>
            <p className="text-on-surface-variant text-sm mt-1">
              New events, team requests, and certificate updates will appear here.
            </p>
          </div>
        )}

        {/* List */}
        {allNotifications.map(n => (
          <NotifRow key={n.id} notif={n} />
        ))}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* End of list */}
        {!hasNextPage && allNotifications.length > 0 && (
          <p className="text-center text-on-surface-variant text-xs py-4">
            You're all caught up ✓
          </p>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
