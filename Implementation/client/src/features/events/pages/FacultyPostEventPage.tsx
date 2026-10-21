import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEvent } from '../hooks/useCreateEvent';
import type { CreateEventInput, EventType, RegistrationMode } from '../types';
import { AppBar } from '@/components/layout/AppBar';

const EVENT_TYPES: { value: EventType; label: string; icon: string; color: string }[] = [
  { value: 'hackathon',   label: 'Hackathon',   icon: 'bolt',          color: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  { value: 'competition', label: 'Competition', icon: 'trophy',        color: 'bg-primary-fixed text-on-primary-fixed-variant' },
  { value: 'sports',      label: 'Sports',      icon: 'sports_soccer', color: 'bg-primary-fixed-dim text-on-primary-fixed-variant' },
  { value: 'workshop',    label: 'Workshop',    icon: 'build',         color: 'bg-secondary-fixed text-on-secondary-fixed' },
  { value: 'seminar',     label: 'Seminar',     icon: 'school',        color: 'bg-surface-variant text-on-surface-variant' },
  { value: 'other',       label: 'Other',       icon: 'more_horiz',    color: 'bg-surface-container text-on-surface-variant' },
];

const BRANCH_OPTIONS = ['CSE', 'CSIT', 'IT', 'ECE', 'ME', 'CE', 'EE'];
const YEAR_OPTIONS   = [1, 2, 3, 4];

/**
 * FacultyPostEventPage — /events/new
 *
 * Reference: Stitch 9._faculty_post_event + CIP FacultyPostEventScreen.tsx
 */
export default function FacultyPostEventPage() {
  const navigate = useNavigate();
  const { mutateAsync: createEvent, isPending } = useCreateEvent();

  const [form, setForm] = useState<CreateEventInput>({
    title:            '',
    type:             'hackathon',
    organizer:        '',
    deadline:         '',
    eventDate:        '',
    eligibility:      { branches: [], years: [] },
    teamSize:         { min: 1, max: 4 },
    fee:              '',
    link:             '',
    summary:          '',
    registrationMode: 'in_app',
  });
  const [error, setError] = useState('');
  const [step, setStep]   = useState<1 | 2>(1); // two-step form

  function set<K extends keyof CreateEventInput>(key: K, value: CreateEventInput[K]) {
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createEvent(form);
      navigate('/events/my');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event. Please try again.');
    }
  }

  const selectedType = EVENT_TYPES.find(t => t.value === form.type)!;

  return (
    <div className="min-h-screen bg-background pb-20 pt-14">
      <AppBar title="Post Event" subtitle="Faculty Portal" />

      <div className="max-w-2xl mx-auto px-4">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="pt-5 pb-4 flex items-start justify-between">
          <div>
            <h1 className="font-headline-lg text-xl text-on-surface font-bold">Create Campus Event</h1>
            <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
              Your event will be saved as a draft. Publish when ready.
            </p>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* ── Step indicator ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-5">
          {([1, 2] as const).map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-label-lg text-xs transition-all ${
                step === s
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === s ? 'bg-white/20' : 'bg-surface-container-high'
              }`}>{s}</span>
              {s === 1 ? 'Basic Info' : 'Details & Publish'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* ── ERROR BANNER ──────────────────────────────────────────────── */}
          {error && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              {/* ── Event Type ───────────────────────────────────────────── */}
              <div>
                <label className="font-label-lg text-xs text-on-surface-variant uppercase tracking-wider mb-2 block">Event Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set('type', t.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        form.type === t.value
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/60'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${t.color}`}>
                        <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                      </div>
                      <span className="font-label-sm text-[10px] text-on-surface font-bold">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Title ────────────────────────────────────────────────── */}
              <div>
                <label htmlFor="title" className="font-label-lg text-sm text-on-surface mb-1.5 block">
                  Event Title <span className="text-error">*</span>
                </label>
                <input
                  id="title"
                  required
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="e.g. Smart India Hackathon 2026 – Campus Prelims"
                  className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                />
              </div>

              {/* ── Organizer ────────────────────────────────────────────── */}
              <div>
                <label htmlFor="organizer" className="font-label-lg text-sm text-on-surface mb-1.5 block">Organizer / Department</label>
                <input
                  id="organizer"
                  value={form.organizer ?? ''}
                  onChange={e => set('organizer', e.target.value)}
                  placeholder="e.g. Dept of CSE & Innovation Council"
                  className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                />
              </div>

              {/* ── Dates row ────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="eventDate" className="font-label-lg text-sm text-on-surface mb-1.5 block">Event Date</label>
                  <input
                    id="eventDate"
                    type="date"
                    value={form.eventDate ?? ''}
                    onChange={e => set('eventDate', e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label htmlFor="deadline" className="font-label-lg text-sm text-on-surface mb-1.5 block">
                    Reg. Deadline <span className="text-error">*</span>
                  </label>
                  <input
                    id="deadline"
                    type="date"
                    required
                    value={form.deadline ?? ''}
                    onChange={e => set('deadline', e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* ── Summary ──────────────────────────────────────────────── */}
              <div>
                <label htmlFor="summary" className="font-label-lg text-sm text-on-surface mb-1.5 flex items-center justify-between">
                  <span>Event Summary</span>
                  <span className="font-label-sm text-xs text-on-surface-variant">{(form.summary ?? '').length}/200</span>
                </label>
                <textarea
                  id="summary"
                  rows={3}
                  maxLength={200}
                  value={form.summary ?? ''}
                  onChange={e => set('summary', e.target.value)}
                  placeholder="Brief description of the event for students…"
                  className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm resize-none"
                />
              </div>

              {/* Next step button */}
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!form.title || !form.deadline}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Next: Details & Eligibility
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* ── Eligibility: branches ────────────────────────────────── */}
              <div>
                <label className="font-label-lg text-sm text-on-surface mb-1.5 flex items-center gap-2">
                  Open to Branches
                  <span className="font-label-sm text-xs text-on-surface-variant">(empty = all branches)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {BRANCH_OPTIONS.map(b => {
                    const sel = form.eligibility?.branches?.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBranch(b)}
                        className={`px-3 py-1.5 rounded-full font-label-lg text-xs transition-all ${
                          sel
                            ? 'bg-primary-container text-on-primary shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Eligibility: years ───────────────────────────────────── */}
              <div>
                <label className="font-label-lg text-sm text-on-surface mb-1.5 flex items-center gap-2">
                  Open to Years
                  <span className="font-label-sm text-xs text-on-surface-variant">(empty = all years)</span>
                </label>
                <div className="flex gap-2">
                  {YEAR_OPTIONS.map(y => {
                    const sel = form.eligibility?.years?.includes(y);
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => toggleYear(y)}
                        className={`w-12 h-12 rounded-xl font-label-lg text-sm font-bold transition-all ${
                          sel
                            ? 'bg-primary-container text-on-primary shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Team size ────────────────────────────────────────────── */}
              <div>
                <label className="font-label-lg text-sm text-on-surface mb-1.5 block">Team Size</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="teamMin" className="font-label-sm text-xs text-on-surface-variant mb-1 block">Min Members</label>
                    <input
                      id="teamMin"
                      type="number"
                      min={1}
                      max={form.teamSize?.max ?? 10}
                      value={form.teamSize?.min ?? 1}
                      onChange={e => set('teamSize', { ...form.teamSize!, min: +e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="teamMax" className="font-label-sm text-xs text-on-surface-variant mb-1 block">Max Members</label>
                    <input
                      id="teamMax"
                      type="number"
                      min={form.teamSize?.min ?? 1}
                      max={20}
                      value={form.teamSize?.max ?? 4}
                      onChange={e => set('teamSize', { ...form.teamSize!, max: +e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* ── Fee ──────────────────────────────────────────────────── */}
              <div>
                <label htmlFor="fee" className="font-label-lg text-sm text-on-surface mb-1.5 block">
                  Entry Fee <span className="font-label-sm text-xs text-on-surface-variant">(leave blank if free)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 inset-y-0 flex items-center text-outline font-body-md text-sm">₹</span>
                  <input
                    id="fee"
                    value={form.fee ?? ''}
                    onChange={e => set('fee', e.target.value)}
                    placeholder="e.g. 200 or Free"
                    className="w-full pl-8 pr-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* ── Registration mode ────────────────────────────────────── */}
              <div>
                <label className="font-label-lg text-sm text-on-surface mb-1.5 block">Registration Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['in_app', 'external'] as RegistrationMode[]).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => set('registrationMode', mode)}
                      className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all ${
                        form.registrationMode === mode
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px] text-primary">
                        {mode === 'in_app' ? 'app_registration' : 'open_in_new'}
                      </span>
                      <span className="font-label-lg text-xs text-on-surface font-bold">
                        {mode === 'in_app' ? 'In-App Registration' : 'External Link'}
                      </span>
                      <span className="font-body-sm text-[10px] text-on-surface-variant">
                        {mode === 'in_app' ? 'Students register via campus portal' : 'Redirect to external form'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* External link */}
              {form.registrationMode === 'external' && (
                <div>
                  <label htmlFor="link" className="font-label-lg text-sm text-on-surface mb-1.5 block">
                    Registration URL <span className="text-error">*</span>
                  </label>
                  <input
                    id="link"
                    type="url"
                    required={form.registrationMode === 'external'}
                    value={form.link ?? ''}
                    onChange={e => set('link', e.target.value)}
                    placeholder="https://docs.google.com/forms/..."
                    className="w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm font-code-sm"
                  />
                </div>
              )}

              {/* ── Preview summary ──────────────────────────────────────── */}
              <div className="bg-surface-container rounded-xl p-4 flex items-start gap-3 border border-outline-variant/30">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedType.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{selectedType.icon}</span>
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-headline-sm text-sm text-on-surface font-bold line-clamp-1">{form.title || 'Untitled Event'}</span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">{selectedType.label} · Draft</span>
                  {form.deadline && (
                    <span className="font-code-sm text-[10px] text-outline mt-0.5">
                      Closes {new Date(form.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Submit buttons ───────────────────────────────────────── */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-12 px-5 rounded-xl bg-surface-container-low text-on-surface font-label-lg text-sm font-semibold hover:bg-surface-container transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  id="create-event-submit"
                  className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      Saving Draft…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">save</span>
                      Save as Draft
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
