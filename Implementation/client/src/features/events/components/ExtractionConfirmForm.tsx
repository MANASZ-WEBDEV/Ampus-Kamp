/**
 * ExtractionConfirmForm — F-3 Review & Confirm Form
 *
 * Pre-fills event fields from the AI extraction result.
 * Fields in `uncertainFields` are highlighted with UncertainBadge.
 * Tracks which fields the faculty changed → editedFields[].
 * Raw text shown in a collapsible panel.
 * On confirm → calls createEvent with rawMessage + extraction metadata.
 */

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEvent } from '../hooks/useCreateEvent';
import { UncertainBadge } from './UncertainBadge';
import type { ExtractionResult, ExtractedFields, EventType } from '../types';
import type { CreateEventInput } from '../types';

// ── Constants (mirrors FacultyPostEventPage) ──────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert ISO8601 to <input type="date"> value (YYYY-MM-DD) */
function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return new Date(iso).toISOString().split('T')[0] ?? ''; } catch { return ''; }
}

/** Convert <input type="date"> value back to ISO8601 */
function dateInputToIso(val: string): string | undefined {
  if (!val) return undefined;
  try { return new Date(val + 'T00:00:00.000Z').toISOString(); } catch { return undefined; }
}

/** Build initial form state from extraction result.
 *
 * Eligibility rules:
 *   extracted.eligibility == null (null or undefined)  → AI uncertain → show nothing selected
 *   extracted.eligibility.branches = []  → open to all → pre-select ALL branches in UI
 *   extracted.eligibility.branches = [...] → specific → pre-select those branches
 *   Same logic for years.
 */
function extractionToForm(extracted: ExtractedFields): CreateEventInput {
  // null/undefined both mean AI couldn't determine eligibility
  const elig = extracted.eligibility ?? null;

  const formBranches = elig == null
    ? []                         // uncertain → show nothing selected
    : elig.branches.length === 0
      ? [...BRANCH_OPTIONS]      // open to all → show all selected
      : elig.branches;

  const formYears = elig == null
    ? []
    : elig.years.length === 0
      ? [...YEAR_OPTIONS]
      : elig.years;

  return {
    title:            extracted.title  ?? '',
    type:             (extracted.type  ?? 'hackathon') as EventType,
    organizer:        extracted.organizer ?? '',
    deadline:         isoToDateInput(extracted.deadline) || undefined,
    eventDate:        isoToDateInput(extracted.eventDate) || undefined,
    eligibility: {
      branches: formBranches,
      years:    formYears,
    },
    teamSize: {
      min: extracted.teamSize?.min ?? 1,
      max: extracted.teamSize?.max ?? 4,
    },
    fee:              extracted.fee     ?? '',
    link:             extracted.link    ?? '',
    summary:          extracted.summary ?? '',
    registrationMode: 'in_app',
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ExtractionConfirmFormProps {
  rawMessage: string;
  result: ExtractionResult;
  onBack: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExtractionConfirmForm({ rawMessage, result, onBack }: ExtractionConfirmFormProps) {
  const navigate = useNavigate();
  const { mutateAsync: createEvent, isPending } = useCreateEvent();

  const [form, setForm] = useState<CreateEventInput>(() =>
    extractionToForm(result.extracted),
  );
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [rawOpen, setRawOpen] = useState(false);

  const uncertain = new Set(result.uncertainFields);

  // ── Field change tracker ───────────────────────────────────────────────────

  function set<K extends keyof CreateEventInput>(key: K, value: CreateEventInput[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setEditedFields(prev => new Set(prev).add(key));
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
    setEditedFields(prev => new Set(prev).add('eligibility'));
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
    setEditedFields(prev => new Set(prev).add('eligibility'));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const currentBranches = form.eligibility?.branches ?? [];
      const currentYears    = form.eligibility?.years    ?? [];

      // Normalise: if ALL branches are selected, send [] (= open to all) to the server.
      // Same for years. This preserves the data model's convention.
      const normalisedBranches = currentBranches.length === BRANCH_OPTIONS.length
        ? []
        : currentBranches;
      const normalisedYears = currentYears.length === YEAR_OPTIONS.length
        ? []
        : currentYears;

      const payload: CreateEventInput = {
        ...form,
        deadline:             dateInputToIso(form.deadline ?? ''),
        eventDate:            dateInputToIso(form.eventDate ?? ''),
        registrationDeadline: dateInputToIso(form.registrationDeadline ?? ''),
        eligibility: {
          ...form.eligibility,
          branches: normalisedBranches,
          years:    normalisedYears,
        },

        // ── F-3: Paste-to-Post audit metadata ──────────────────────────────
        rawMessage,
        extraction: {
          promptVersion: result.usedFallback ? undefined : 'v2',
          editedFields:  Array.from(editedFields),
          usedFallback:  result.usedFallback,
        },
      };

      await createEvent(payload);
      navigate('/events/my');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft. Please try again.');
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function FieldLabel({
    htmlFor,
    label,
    field,
    required,
  }: {
    htmlFor?: string;
    label: string;
    field: string;
    required?: boolean;
  }) {
    return (
      <label
        htmlFor={htmlFor}
        className="font-label-lg text-sm text-on-surface mb-1.5 flex items-center gap-2 flex-wrap"
      >
        {label}
        {required && <span className="text-error">*</span>}
        {uncertain.has(field) && <UncertainBadge />}
        {editedFields.has(field) && !uncertain.has(field) && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
            <span className="material-symbols-outlined text-[11px]">edit</span>
            edited
          </span>
        )}
      </label>
    );
  }

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* ── Fallback / uncertain banner ──────────────────────────────────── */}
      {result.usedFallback && (
        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
          <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">warning</span>
          <div>
            <p className="font-label-lg text-xs font-bold">AI could not extract reliably</p>
            <p className="font-body-sm text-xs mt-0.5">
              The regex fallback was used. Many fields may be empty — please fill them manually.
            </p>
          </div>
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-xs flex items-start gap-2">
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          {error}
        </div>
      )}

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
        <div className="flex items-center gap-1.5 text-[11px] font-label-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
          {10 - uncertain.size} / 10 fields extracted
        </div>
        {uncertain.size > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-label-sm text-yellow-600 dark:text-yellow-400">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            {uncertain.size} need review
          </div>
        )}
        {editedFields.size > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-label-sm text-primary ml-auto">
            <span className="material-symbols-outlined text-[14px]">edit</span>
            {editedFields.size} edited
          </div>
        )}
      </div>

      {/* ── Raw text collapsible ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-outline-variant/30 overflow-hidden">
        <button
          type="button"
          onClick={() => setRawOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all"
        >
          <span className="flex items-center gap-2 font-label-lg text-xs font-semibold">
            <span className="material-symbols-outlined text-[18px]">notes</span>
            Original Announcement
          </span>
          <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${rawOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
        {rawOpen && (
          <div className="px-4 py-3 bg-surface-container-lowest border-t border-outline-variant/20">
            <pre className="font-code-sm text-xs text-on-surface-variant whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {rawMessage}
            </pre>
          </div>
        )}
      </div>

      {/* ── Event Type ───────────────────────────────────────────────────── */}
      <div>
        <FieldLabel label="Event Type" field="type" required />
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
              } ${uncertain.has('type') ? 'ring-1 ring-yellow-400/40' : ''}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${t.color}`}>
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              </div>
              <span className="font-label-sm text-[10px] text-on-surface font-bold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Title ────────────────────────────────────────────────────────── */}
      <div>
        <FieldLabel htmlFor="ec-title" label="Event Title" field="title" required />
        <input
          id="ec-title"
          required
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. Smart India Hackathon 2026"
          className={`w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm ${
            uncertain.has('title') ? 'ring-1 ring-yellow-400/50' : ''
          }`}
        />
      </div>

      {/* ── Organizer ────────────────────────────────────────────────────── */}
      <div>
        <FieldLabel htmlFor="ec-organizer" label="Organizer / Department" field="organizer" />
        <input
          id="ec-organizer"
          value={form.organizer ?? ''}
          onChange={e => set('organizer', e.target.value)}
          placeholder="e.g. Dept of CSE & Innovation Council"
          className={`w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm ${
            uncertain.has('organizer') ? 'ring-1 ring-yellow-400/50' : ''
          }`}
        />
      </div>

      {/* ── Dates ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="ec-eventDate" label="Event Date" field="eventDate" />
          <input
            id="ec-eventDate"
            type="date"
            value={form.eventDate ?? ''}
            onChange={e => set('eventDate', e.target.value)}
            className={`w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm ${
              uncertain.has('eventDate') ? 'ring-1 ring-yellow-400/50' : ''
            }`}
          />
        </div>
        <div>
          <FieldLabel htmlFor="ec-deadline" label="Reg. Deadline" field="deadline" required />
          <input
            id="ec-deadline"
            type="date"
            required
            value={form.deadline ?? ''}
            onChange={e => set('deadline', e.target.value)}
            className={`w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm ${
              uncertain.has('deadline') ? 'ring-1 ring-yellow-400/50' : ''
            }`}
          />
        </div>
      </div>

      {/* ── Eligibility: branches ─────────────────────────────────────────── */}
      <div>
        <FieldLabel label="Open to Branches" field="eligibility" />
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
                } ${uncertain.has('eligibility') ? 'ring-1 ring-yellow-400/30' : ''}`}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Eligibility: years ───────────────────────────────────────────── */}
      <div>
        <FieldLabel label="Open to Years" field="eligibility" />
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
                } ${uncertain.has('eligibility') ? 'ring-1 ring-yellow-400/30' : ''}`}
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Team size ────────────────────────────────────────────────────── */}
      <div>
        <FieldLabel label="Team Size" field="teamSize" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ec-teamMin" className="font-label-sm text-xs text-on-surface-variant mb-1 block">Min Members</label>
            <input
              id="ec-teamMin"
              type="number"
              min={1}
              max={form.teamSize?.max ?? 10}
              value={form.teamSize?.min ?? 1}
              onChange={e => set('teamSize', { ...form.teamSize!, min: +e.target.value })}
              className={`w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm ${
                uncertain.has('teamSize') ? 'ring-1 ring-yellow-400/50' : ''
              }`}
            />
          </div>
          <div>
            <label htmlFor="ec-teamMax" className="font-label-sm text-xs text-on-surface-variant mb-1 block">Max Members</label>
            <input
              id="ec-teamMax"
              type="number"
              min={form.teamSize?.min ?? 1}
              max={20}
              value={form.teamSize?.max ?? 4}
              onChange={e => set('teamSize', { ...form.teamSize!, max: +e.target.value })}
              className={`w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm ${
                uncertain.has('teamSize') ? 'ring-1 ring-yellow-400/50' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* ── Fee ──────────────────────────────────────────────────────────── */}
      <div>
        <FieldLabel htmlFor="ec-fee" label="Entry Fee" field="fee" />
        <input
          id="ec-fee"
          value={form.fee ?? ''}
          onChange={e => set('fee', e.target.value)}
          placeholder="e.g. ₹200 or Free"
          className={`w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm ${
            uncertain.has('fee') ? 'ring-1 ring-yellow-400/50' : ''
          }`}
        />
      </div>

      {/* ── Link ─────────────────────────────────────────────────────────── */}
      <div>
        <FieldLabel htmlFor="ec-link" label="Registration / Info URL" field="link" />
        <input
          id="ec-link"
          type="url"
          value={form.link ?? ''}
          onChange={e => set('link', e.target.value)}
          placeholder="https://..."
          className={`w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm font-code-sm ${
            uncertain.has('link') ? 'ring-1 ring-yellow-400/50' : ''
          }`}
        />
      </div>

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <div>
        <FieldLabel htmlFor="ec-summary" label="Event Summary" field="summary" />
        <textarea
          id="ec-summary"
          rows={3}
          maxLength={200}
          value={form.summary ?? ''}
          onChange={e => set('summary', e.target.value)}
          placeholder="Brief description for students…"
          className={`w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm resize-none ${
            uncertain.has('summary') ? 'ring-1 ring-yellow-400/50' : ''
          }`}
        />
        <span className="font-label-sm text-xs text-on-surface-variant mt-1 block text-right">
          {(form.summary ?? '').length}/200
        </span>
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-5 rounded-xl bg-surface-container-low text-on-surface font-label-lg text-sm font-semibold hover:bg-surface-container transition-all active:scale-95 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Re-paste
        </button>

        <button
          type="submit"
          id="extraction-confirm-submit"
          disabled={isPending || !form.title || !form.deadline}
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
              Confirm & Save Draft
            </>
          )}
        </button>
      </div>
    </form>
  );
}
