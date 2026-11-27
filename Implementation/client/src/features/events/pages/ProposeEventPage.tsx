import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import type { EventType } from '../types';

type ProposalStatus = 'pending' | 'under_review' | 'approved' | 'declined';

interface ProposalComment {
  userId:    string;
  name:      string;
  role:      string;
  text:      string;
  createdAt: string;
}

interface EventProposal {
  _id:             string;
  title:           string;
  type:            EventType;
  proposedDate?:   string;
  description:     string;
  resourcesNeeded?: string;
  proposedBy:      { _id: string; name: string } | string;
  status:          ProposalStatus;
  comments:        ProposalComment[];
  createdAt:       string;
}

const STATUS_META: Record<ProposalStatus, { label: string; cls: string }> = {
  pending:      { label: 'Pending',      cls: 'bg-amber-50 text-amber-700' },
  under_review: { label: 'Under Review', cls: 'bg-primary/10 text-primary' },
  approved:     { label: 'Approved',     cls: 'bg-emerald-50 text-emerald-700' },
  declined:     { label: 'Declined',     cls: 'bg-error-container text-on-error-container' },
};

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'hackathon',   label: 'Hackathon' },
  { value: 'workshop',    label: 'Workshop' },
  { value: 'competition', label: 'Competition' },
  { value: 'seminar',     label: 'Seminar / Talk' },
  { value: 'sports',      label: 'Sports & Athletics' },
  { value: 'other',       label: 'Research / Other' },
];

export default function ProposeEventPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isReviewer = user?.role === 'faculty' || user?.role === 'dept_head' || user?.role === 'admin';

  // Form state
  const [title, setTitle]                     = useState('');
  const [type, setType]                       = useState<EventType>('hackathon');
  const [proposedDate, setProposedDate]       = useState('');
  const [description, setDescription]         = useState('');
  const [resourcesNeeded, setResourcesNeeded] = useState('');
  const [formError, setFormError]             = useState('');
  const [submittedNote, setSubmittedNote]     = useState('');

  // Per-proposal comment draft
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: EventProposal[] }>('/proposals');
      return res.data.data;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: EventProposal }>('/proposals', {
        title:           title.trim(),
        type,
        proposedDate:    proposedDate.trim() || undefined,
        description:     description.trim(),
        resourcesNeeded: resourcesNeeded.trim() || undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setTitle('');
      setProposedDate('');
      setDescription('');
      setResourcesNeeded('');
      setFormError('');
      setSubmittedNote('Proposal submitted! Faculty & department heads can now review and discuss it.');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } } | null)
          ?.response?.data?.error?.message;
      setFormError(msg || 'Failed to submit proposal.');
    },
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProposalStatus }) => {
      const res = await apiClient.patch<{ data: EventProposal }>(`/proposals/${id}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals'] }),
  });

  const commentMut = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const res = await apiClient.post<{ data: EventProposal }>(`/proposals/${id}/comments`, { text });
      return res.data.data;
    },
    onSuccess: (_data, vars) => {
      setCommentDrafts(prev => ({ ...prev, [vars.id]: '' }));
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmittedNote('');
    if (title.trim().length < 3) {
      setFormError('Please enter a proposal title (at least 3 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Please describe your event idea (at least 10 characters).');
      return;
    }
    createMut.mutate();
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle="Campus Event Proposals" />

      <main className="w-full pt-16 max-w-5xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-on-surface-variant py-4">
          <button onClick={() => navigate('/events')} className="hover:text-primary transition-colors">
            Events
          </button>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-surface font-semibold">Event Proposals</span>
        </nav>

        <div className="mb-6">
          <h1 className="font-headline-xl text-2xl lg:text-3xl text-on-surface font-bold tracking-tight">
            {isReviewer ? 'Student Event Proposals' : 'Propose a Campus Event'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
            {isReviewer
              ? 'Review student-pitched campus events, update review statuses, and discuss logistics directly.'
              : 'Have an idea for a hackathon, workshop, seminar, or sports tournament? Pitch it here so faculty and department admins can review and discuss it.'}
          </p>
        </div>

        {/* ── Proposal Form (available to students and anyone pitching) ── */}
        {!isReviewer && (
          <form
            onSubmit={handleSubmit}
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-5 sm:p-6 flex flex-col gap-4 mb-8"
          >
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">New Event Proposal</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="prop-title" className="block text-xs font-semibold text-on-surface mb-1">
                  Event Title *
                </label>
                <input
                  id="prop-title"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Inter-Department GenAI Mini-Hackathon"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label htmlFor="prop-type" className="block text-xs font-semibold text-on-surface mb-1">
                  Category *
                </label>
                <select
                  id="prop-type"
                  value={type}
                  onChange={e => setType(e.target.value as EventType)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="prop-date" className="block text-xs font-semibold text-on-surface mb-1">
                  Proposed Timeline / Date (optional)
                </label>
                <input
                  id="prop-date"
                  type="text"
                  value={proposedDate}
                  onChange={e => setProposedDate(e.target.value)}
                  placeholder="e.g. Mid-January 2027 (Weekend)"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label htmlFor="prop-res" className="block text-xs font-semibold text-on-surface mb-1">
                  Labs / Grants / Resources Needed (optional)
                </label>
                <input
                  id="prop-res"
                  type="text"
                  value={resourcesNeeded}
                  onChange={e => setResourcesNeeded(e.target.value)}
                  placeholder="e.g. Auditorium + Wi-Fi + 2 faculty mentors"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label htmlFor="prop-desc" className="block text-xs font-semibold text-on-surface mb-1">
                Idea &amp; Format Description *
              </label>
              <textarea
                id="prop-desc"
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Explain the objective, target audience, team format, and expected outcomes…"
                className="w-full p-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {formError && (
              <p className="text-sm text-error font-medium">{formError}</p>
            )}
            {submittedNote && (
              <p className="text-sm text-emerald-700 font-medium">{submittedNote}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('/events')}
                className="px-4 py-2 rounded-xl border border-outline-variant/40 text-sm font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Back to Events
              </button>
              <button
                type="submit"
                disabled={createMut.isPending}
                className="px-6 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-all disabled:opacity-50"
              >
                {createMut.isPending ? 'Submitting…' : 'Submit Proposal'}
              </button>
            </div>
          </form>
        )}

        {/* ── Proposals List & Discussion ────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">
              {isReviewer ? `All Proposals (${proposals.length})` : `My Proposals (${proposals.length})`}
            </h2>
          </div>

          {isLoading ? (
            <p className="text-sm text-on-surface-variant">Loading proposals…</p>
          ) : proposals.length === 0 ? (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 text-center">
              <p className="text-sm text-on-surface-variant">
                {isReviewer ? 'No student event proposals submitted yet.' : 'You have not submitted any event proposals yet.'}
              </p>
            </div>
          ) : (
            proposals.map(p => {
              const st = STATUS_META[p.status];
              const authorName = typeof p.proposedBy === 'object' ? p.proposedBy.name : 'Student';
              const draft = commentDrafts[p._id] ?? '';
              return (
                <article
                  key={p._id}
                  className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-5 flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-xs font-semibold uppercase">
                          {p.type}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <h3 className="font-headline-sm text-base font-bold text-on-surface mt-1.5">{p.title}</h3>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Proposed by <strong>{authorName}</strong>
                        {p.proposedDate ? ` · Target: ${p.proposedDate}` : ''}
                        {' · '}
                        {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {isReviewer && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(['under_review', 'approved', 'declined'] as ProposalStatus[]).map(nextStatus => (
                          <button
                            key={nextStatus}
                            type="button"
                            disabled={p.status === nextStatus || statusMut.isPending}
                            onClick={() => statusMut.mutate({ id: p._id, status: nextStatus })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${
                              p.status === nextStatus
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                            }`}
                          >
                            {STATUS_META[nextStatus].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-on-surface leading-relaxed">{p.description}</p>
                  {p.resourcesNeeded && (
                    <p className="text-xs text-on-surface-variant">
                      <strong>Resources requested:</strong> {p.resourcesNeeded}
                    </p>
                  )}

                  {/* Discussion thread */}
                  <div className="pt-3 border-t border-outline-variant/15 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      Discussion ({p.comments.length})
                    </p>
                    {p.comments.map((c, idx) => (
                      <div key={idx} className="px-3 py-2 rounded-xl bg-surface-container-low/70 text-sm">
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                          <strong className="text-on-surface">{c.name}</strong>
                          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-surface-container">{c.role}</span>
                        </div>
                        <p className="text-sm text-on-surface mt-0.5">{c.text}</p>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={draft}
                        onChange={e => setCommentDrafts(prev => ({ ...prev, [p._id]: e.target.value }))}
                        placeholder="Add a comment or feedback…"
                        className="flex-1 h-9 px-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        disabled={!draft.trim() || commentMut.isPending}
                        onClick={() => commentMut.mutate({ id: p._id, text: draft.trim() })}
                        className="px-4 h-9 rounded-xl bg-primary text-on-primary text-xs font-semibold disabled:opacity-40"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>

      <BottomNav active="events" />
    </div>
  );
}
