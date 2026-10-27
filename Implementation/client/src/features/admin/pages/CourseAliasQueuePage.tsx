import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseQueue, useMapCourse } from '../hooks/useAdmin';
import type { CourseQueueItem } from '../types';

// ── Map form ──────────────────────────────────────────────────────────────────

function MapForm({
  item,
  onSubmit,
  isPending,
  onCancel,
}: {
  item: CourseQueueItem;
  onSubmit: (body: { existingCourseId?: string; newCourseName?: string; newCourseCategory?: string; issuer?: string }) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [existingCourseId, setExistingCourseId] = useState('');
  const [newCourseName, setNewCourseName] = useState(item.otherCourseName);
  const [newCourseCategory, setNewCourseCategory] = useState('');
  const [issuer, setIssuer] = useState(item.issuer);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'existing') {
      onSubmit({ existingCourseId });
    } else {
      onSubmit({ newCourseName, newCourseCategory, issuer });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-outline-variant flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['new', 'existing'] as const).map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-colors
              ${mode === m ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
          >
            {m === 'new' ? 'Create new course' : 'Map to existing'}
          </button>
        ))}
      </div>

      {mode === 'existing' ? (
        <input
          required
          value={existingCourseId}
          onChange={(e) => setExistingCourseId(e.target.value)}
          placeholder="Existing Course ID (ObjectId)"
          className="w-full px-3 py-2 rounded-xl bg-surface-container text-sm text-on-surface
                     placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary"
        />
      ) : (
        <>
          <input
            required
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="Course name"
            className="w-full px-3 py-2 rounded-xl bg-surface-container text-sm text-on-surface
                       placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            required
            value={newCourseCategory}
            onChange={(e) => setNewCourseCategory(e.target.value)}
            placeholder="Category (e.g. programming, data_science)"
            className="w-full px-3 py-2 rounded-xl bg-surface-container text-sm text-on-surface
                       placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="Issuer (e.g. NPTEL)"
            className="w-full px-3 py-2 rounded-xl bg-surface-container text-sm text-on-surface
                       placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary"
          />
        </>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2 rounded-xl border border-outline text-on-surface text-sm font-medium">
          Cancel
        </button>
        <button type="submit" disabled={isPending}
          className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-50">
          {isPending ? 'Mapping…' : 'Submit mapping'}
        </button>
      </div>
    </form>
  );
}

// ── Queue item card ───────────────────────────────────────────────────────────

function QueueCard({ item }: { item: CourseQueueItem }) {
  const [expanded, setExpanded] = useState(false);
  const mapMutation = useMapCourse();

  return (
    <div className="bg-surface-container rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-on-surface truncate">{item.otherCourseName}</p>
          <p className="text-xs text-on-surface-variant">{item.issuer}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {item.studentId.name} · {item.studentId.enrollmentNo}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="material-symbols-rounded text-on-surface-variant transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
        >
          expand_more
        </button>
      </div>

      {expanded && (
        <MapForm
          item={item}
          isPending={mapMutation.isPending}
          onCancel={() => setExpanded(false)}
          onSubmit={(body) => mapMutation.mutate({ credId: item._id, body })}
        />
      )}
    </div>
  );
}

// ── CourseAliasQueuePage ──────────────────────────────────────────────────────

export default function CourseAliasQueuePage() {
  const navigate = useNavigate();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useCourseQueue();

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-surface-container-high px-4 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => navigate('/admin')}
          className="material-symbols-rounded text-on-surface-variant">arrow_back</button>
        <h1 className="text-xl font-bold text-on-surface">Course Alias Queue</h1>
        <span className="ml-auto text-sm text-on-surface-variant">{items.length} items</span>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-container animate-pulse" />
            ))
          : items.length === 0
            ? (
              <div className="text-center py-20">
                <span className="material-symbols-rounded text-5xl text-on-surface-variant/40 block mb-2">
                  checklist
                </span>
                <p className="text-on-surface-variant">Queue is empty — no unresolved aliases</p>
              </div>
            )
            : items.map((item) => <QueueCard key={item._id} item={item} />)
        }

        {hasNextPage && (
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="py-3 rounded-2xl bg-surface-container text-on-surface-variant text-sm font-medium disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  );
}
