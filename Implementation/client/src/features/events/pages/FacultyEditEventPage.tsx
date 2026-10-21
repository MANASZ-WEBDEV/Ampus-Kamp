import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvent } from '../hooks/useEvent';
import { useUpdateEvent } from '../hooks/useUpdateEvent';
import { usePublishEvent } from '../hooks/usePublishEvent';
import { useCloseEvent } from '../hooks/useCloseEvent';
import type { UpdateEventInput, RegistrationMode } from '../types';
import { AppBar } from '@/components/layout/AppBar';
import { EventTypeBadge } from '../components/EventStatusBadge';

const BRANCH_OPTIONS = ['CSE', 'CSIT', 'IT', 'ECE', 'ME', 'CE', 'EE'];
const YEAR_OPTIONS   = [1, 2, 3, 4];

/**
 * FacultyEditEventPage — /events/:id/edit
 * Lets faculty owners edit, publish (draft→published), or close (published→closed).
 */
export default function FacultyEditEventPage() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();

  const { data: event, isLoading } = useEvent(id!);
  const { mutateAsync: updateEvent,  isPending: isSaving }    = useUpdateEvent(id!);
  const { mutateAsync: publishEvent, isPending: isPublishing } = usePublishEvent(id!);
  const { mutateAsync: closeEvent,   isPending: isClosing }   = useCloseEvent(id!);

  const [form, setForm]   = useState<UpdateEventInput>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Populate form from loaded event
  useEffect(() => {
    if (!event) return;
    setForm({
      title:            event.title,
      type:             event.type,
      organizer:        event.organizer,
      deadline:         event.deadline?.slice(0, 10),
      eventDate:        event.eventDate?.slice(0, 10),
      eligibility:      event.eligibility,
      teamSize:         event.teamSize,
      fee:              event.fee,
      link:             event.link,
      summary:          event.summary,
      registrationMode: event.registrationMode,
    });
  }, [event]);

  function set<K extends keyof UpdateEventInput>(key: K, value: UpdateEventInput[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toggleBranch(branch: string) {
    setForm(f => {
      const branches = f.eligibility?.branches ?? [];
      return {
        ...f,
        eligibility: {
          ...f.eligibility,
          branches: branches.includes(branch)
            ? branches.filter(b => b !== branch)
            : [...branches, branch],
        },
      };
    });
  }

  function toggleYear(year: number) {
    setForm(f => {
      const years = f.eligibility?.years ?? [];
      return {
        ...f,
        eligibility: {
          ...f.eligibility,
          years: years.includes(year)
            ? years.filter(y => y !== year)
            : [...years, year],
        },
      };
    });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await updateEvent(form);
      setSuccess('Changes saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    }
  }

  async function handlePublish() {
    setError(''); setSuccess('');
    try {
      await publishEvent();
      setSuccess('Event published! Students can now see it.');
      navigate('/events/my');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish event.');
    }
  }

  async function handleClose() {
    setError(''); setSuccess('');
    try {
      await closeEvent();
      setSuccess('Event closed.');
      navigate('/events/my');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close event.');
    }
  }

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-background pt-14 animate-pulse px-4">
        <AppBar title="Edit Event" subtitle="Faculty Portal" />
        <div className="mt-6 h-8 bg-surface-container rounded-xl w-48" />
        <div className="mt-4 flex flex-col gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-surface-container rounded-xl" />)}
        </div>
      </div>
    );
  }

  const isDraft     = event.status === 'draft';
  const isPublished = event.status === 'published';
  const isClosed    = event.status === 'closed' || event.status === 'archived';

  return (
    <div className="min-h-screen bg-background pb-20 pt-14">
      <AppBar title="Edit Event" subtitle="Faculty Portal" />

      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="pt-5 pb-4 flex items-start justify-between">
          <div>
            <h1 className="font-headline-lg text-xl text-on-surface font-bold">Edit Event</h1>
            <div className="flex items-center gap-2 mt-1">
              <EventTypeBadge type={event.type} />
              <span className={`font-label-sm text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isDraft     ? 'bg-surface-container-high text-on-surface-variant' :
                isPublished ? 'bg-primary-fixed text-on-primary-fixed-variant' :
                              'bg-error-container text-on-error-container'
              }`}>
                {event.status}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate(`/events/${event.id}`)}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Status alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-xs flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-body-sm text-xs flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
            {success}
          </div>
        )}

        {/* Action buttons (top) */}
        {!isClosed && (
          <div className="flex gap-3 mb-5">
            {isDraft && (
              <button
                id="publish-btn"
                type="button"
                disabled={isPublishing}
                onClick={handlePublish}
                className="flex-1 h-11 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isPublishing
                  ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Publishing…</>
                  : <><span className="material-symbols-outlined text-[18px]">publish</span> Publish Now</>
                }
              </button>
            )}
            {isPublished && (
              <button
                id="close-event-btn"
                type="button"
                disabled={isClosing}
                onClick={handleClose}
                className="h-11 px-4 rounded-xl bg-error-container text-on-error-container font-label-lg text-sm font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                Close Registration
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-4">

          {/* Title */}
          <div>
            <label htmlFor="edit-title" className="font-label-lg text-sm text-on-surface mb-1.5 block">
              Event Title <span className="text-error">*</span>
            </label>
            <input
              id="edit-title"
              required
              value={form.title ?? ''}
              onChange={e => set('title', e.target.value)}
              disabled={isClosed}
              className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm disabled:opacity-60"
            />
          </div>

          {/* Organizer */}
          <div>
            <label htmlFor="edit-organizer" className="font-label-lg text-sm text-on-surface mb-1.5 block">Organizer</label>
            <input
              id="edit-organizer"
              value={form.organizer ?? ''}
              onChange={e => set('organizer', e.target.value)}
              disabled={isClosed}
              className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm disabled:opacity-60"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-eventDate" className="font-label-lg text-sm text-on-surface mb-1.5 block">Event Date</label>
              <input
                id="edit-eventDate"
                type="date"
                value={form.eventDate ?? ''}
                onChange={e => set('eventDate', e.target.value)}
                disabled={isClosed}
                className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="edit-deadline" className="font-label-lg text-sm text-on-surface mb-1.5 block">Reg. Deadline</label>
              <input
                id="edit-deadline"
                type="date"
                value={form.deadline ?? ''}
                onChange={e => set('deadline', e.target.value)}
                disabled={isClosed}
                className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm disabled:opacity-60"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label htmlFor="edit-summary" className="font-label-lg text-sm text-on-surface mb-1.5 flex items-center justify-between">
              <span>Summary</span>
              <span className="font-label-sm text-xs text-on-surface-variant">{(form.summary ?? '').length}/200</span>
            </label>
            <textarea
              id="edit-summary"
              rows={3}
              maxLength={200}
              value={form.summary ?? ''}
              onChange={e => set('summary', e.target.value)}
              disabled={isClosed}
              className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm resize-none disabled:opacity-60"
            />
          </div>

          {/* Eligibility: branches */}
          <div>
            <label className="font-label-lg text-sm text-on-surface mb-1.5 block">Open to Branches</label>
            <div className="flex flex-wrap gap-2">
              {BRANCH_OPTIONS.map(b => {
                const sel = form.eligibility?.branches?.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => !isClosed && toggleBranch(b)}
                    disabled={isClosed}
                    className={`px-3 py-1.5 rounded-full font-label-lg text-xs transition-all disabled:opacity-50 ${
                      sel ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Eligibility: years */}
          <div>
            <label className="font-label-lg text-sm text-on-surface mb-1.5 block">Open to Years</label>
            <div className="flex gap-2">
              {YEAR_OPTIONS.map(y => {
                const sel = form.eligibility?.years?.includes(y);
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => !isClosed && toggleYear(y)}
                    disabled={isClosed}
                    className={`w-12 h-12 rounded-xl font-label-lg text-sm font-bold transition-all disabled:opacity-50 ${
                      sel ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fee */}
          <div>
            <label htmlFor="edit-fee" className="font-label-lg text-sm text-on-surface mb-1.5 block">Entry Fee</label>
            <input
              id="edit-fee"
              value={form.fee ?? ''}
              onChange={e => set('fee', e.target.value)}
              disabled={isClosed}
              placeholder="Leave blank if free"
              className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm disabled:opacity-60"
            />
          </div>

          {/* Registration mode */}
          <div>
            <label className="font-label-lg text-sm text-on-surface mb-1.5 block">Registration Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {(['in_app', 'external'] as RegistrationMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  disabled={isClosed}
                  onClick={() => set('registrationMode', mode)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all disabled:opacity-50 ${
                    form.registrationMode === mode
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant/30 bg-surface-container-lowest'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    {mode === 'in_app' ? 'app_registration' : 'open_in_new'}
                  </span>
                  <span className="font-label-lg text-xs text-on-surface font-bold">
                    {mode === 'in_app' ? 'In-App' : 'External'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {form.registrationMode === 'external' && (
            <div>
              <label htmlFor="edit-link" className="font-label-lg text-sm text-on-surface mb-1.5 block">External Registration URL</label>
              <input
                id="edit-link"
                type="url"
                value={form.link ?? ''}
                onChange={e => set('link', e.target.value)}
                disabled={isClosed}
                className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm font-code-sm disabled:opacity-60"
              />
            </div>
          )}

          {/* Save button */}
          {!isClosed && (
            <button
              type="submit"
              id="save-changes-btn"
              disabled={isSaving}
              className="w-full py-3.5 rounded-xl bg-surface-container-low text-on-surface font-label-lg text-sm font-bold hover:bg-surface-container transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 border border-outline-variant/30"
            >
              {isSaving
                ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Saving…</>
                : <><span className="material-symbols-outlined text-[18px]">save</span> Save Changes</>
              }
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
