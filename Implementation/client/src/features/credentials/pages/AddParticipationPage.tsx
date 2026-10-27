import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCreateParticipation } from '../hooks/useCredentials';
import type { ParticipationResult } from '../types';

const RESULTS: { value: ParticipationResult; label: string; icon: string; color: string }[] = [
  { value: 'winner',     label: 'Winner',     icon: 'emoji_events',  color: 'text-[#b8860b]' },
  { value: 'runner_up',  label: 'Runner-up',  icon: 'military_tech', color: 'text-secondary' },
  { value: 'participant',label: 'Participant', icon: 'person',        color: 'text-primary' },
  { value: 'finisher',   label: 'Finisher',   icon: 'flag',          color: 'text-on-surface-variant' },
];

/**
 * AddParticipationPage  /participations/add
 * Students upload participation proof (screenshot / certificate) for events.
 */
export default function AddParticipationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillEventId = searchParams.get('eventId') ?? '';

  const [eventId,    setEventId]    = useState(prefillEventId);
  const [teamName,   setTeamName]   = useState('');
  const [result,     setResult]     = useState<ParticipationResult>('participant');
  const [resultNote, setResultNote] = useState('');
  const [file,       setFile]       = useState<File | null>(null);
  const [preview,    setPreview]    = useState<string>('');
  const [step,       setStep]       = useState<'info' | 'proof' | 'confirm'>('info');

  const [submitting,   setSubmitting]   = useState(false);
  const [formError,    setFormError]    = useState('');
  const [uploadSuccess,setUploadSuccess]= useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: createParticipation } = useCreateParticipation();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview('');
    }
  }

  async function handleSubmit() {
    if (!file || !eventId.trim()) {
      setFormError('Event ID and proof file are required.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      await createParticipation({
        eventId:    eventId.trim(),
        teamName:   teamName.trim() || undefined,
        result,
        resultNote: resultNote.trim() || undefined,
        proof:      file,
      });
      setUploadSuccess(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-24 h-24 rounded-full bg-tertiary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[52px] text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}>
            emoji_events
          </span>
        </div>
        <div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface">
            Participation Recorded!
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            Your participation proof has been submitted for faculty verification.
          </p>
        </div>
        <button
          onClick={() => navigate('/badges')}
          className="px-8 py-3 rounded-2xl bg-primary text-on-primary font-semibold text-sm
                     hover:bg-primary/90 active:scale-[0.99] transition-all"
        >
          View Achievements
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-12">
      {/* Header */}
      <div className="bg-surface/95 backdrop-blur-xl sticky top-0 z-10
                      border-b border-outline-variant/20 px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => step === 'info' ? navigate(-1) : setStep(step === 'proof' ? 'info' : 'proof')}
          className="p-1.5 rounded-xl hover:bg-surface-container-high transition-colors"
          aria-label="Back"
        >
          <span className="material-symbols-outlined text-[22px] text-on-surface">arrow_back</span>
        </button>
        <h1 className="font-semibold text-on-surface text-base flex-1">Add Participation</h1>
        {/* Step indicator */}
        <div className="flex gap-1.5">
          {(['info', 'proof', 'confirm'] as const).map((s, i) => (
            <div key={s}
                 className={`h-1.5 rounded-full transition-all ${
                   s === step ? 'w-5 bg-tertiary' : i < ['info','proof','confirm'].indexOf(step) ? 'w-1.5 bg-tertiary/50' : 'w-1.5 bg-outline-variant/40'
                 }`} />
          ))}
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-5">

        {/* ── Step 1: Event & Result ──────────────────────────────────────── */}
        {step === 'info' && (
          <>
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                Event Details
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Tell us about the event you participated in.
              </p>
            </div>

            {/* Event ID */}
            <div>
              <label htmlFor="part-eventid"
                     className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Event ID *
              </label>
              <input
                id="part-eventid"
                type="text"
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                placeholder="Paste the event ID from the event page"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm
                           font-mono placeholder:font-sans placeholder:text-on-surface-variant/50
                           focus:outline-none focus:ring-2 focus:ring-tertiary/30"
              />
              <p className="text-[10px] text-on-surface-variant mt-1.5">
                Find the Event ID on the event detail page.
              </p>
            </div>

            {/* Team name */}
            <div>
              <label htmlFor="part-team"
                     className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Team Name
                <span className="ml-1 normal-case tracking-normal font-normal text-on-surface-variant/50">(optional)</span>
              </label>
              <input
                id="part-team"
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. Team Phoenix"
                maxLength={80}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm
                           placeholder:text-on-surface-variant/50
                           focus:outline-none focus:ring-2 focus:ring-tertiary/30"
              />
            </div>

            {/* Result */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                Result *
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RESULTS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setResult(r.value)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left
                      ${result === r.value
                        ? 'border-tertiary bg-tertiary/8'
                        : 'border-outline-variant/25 hover:border-tertiary/30'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${result === r.value ? 'text-tertiary' : r.color}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}>
                      {r.icon}
                    </span>
                    <span className={`text-sm font-semibold ${result === r.value ? 'text-tertiary' : 'text-on-surface'}`}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Result note */}
            <div>
              <label htmlFor="part-note"
                     className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Result Note
                <span className="ml-1 normal-case tracking-normal font-normal text-on-surface-variant/50">(optional)</span>
              </label>
              <input
                id="part-note"
                type="text"
                value={resultNote}
                onChange={e => setResultNote(e.target.value)}
                placeholder="e.g. 2nd place out of 45 teams"
                maxLength={120}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm
                           placeholder:text-on-surface-variant/50
                           focus:outline-none focus:ring-2 focus:ring-tertiary/30"
              />
            </div>

            <button
              disabled={!eventId.trim()}
              onClick={() => setStep('proof')}
              className="w-full py-3.5 rounded-2xl bg-tertiary text-on-tertiary font-semibold text-sm
                         hover:bg-tertiary/90 active:scale-[0.99] transition-all disabled:opacity-40"
            >
              Continue
            </button>
          </>
        )}

        {/* ── Step 2: Proof upload ────────────────────────────────────────── */}
        {step === 'proof' && (
          <>
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                Upload Proof
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Upload your participation certificate or a screenshot. Max 10 MB.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-2xl px-6 py-10
                flex flex-col items-center gap-4 transition-all
                ${file ? 'border-tertiary/60 bg-tertiary/5' : 'border-outline-variant/40 hover:border-tertiary/40 hover:bg-tertiary/5'}`}
            >
              {file ? (
                <>
                  {preview ? (
                    <img src={preview} alt="Proof preview"
                         className="max-h-40 rounded-xl object-contain shadow-sm" />
                  ) : (
                    <span className="material-symbols-outlined text-[44px] text-tertiary"
                          style={{ fontVariationSettings: "'FILL' 1" }}>
                      picture_as_pdf
                    </span>
                  )}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-tertiary">{file.name}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Tap to change
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[44px] text-on-surface-variant/40">
                    cloud_upload
                  </span>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-on-surface">Tap to upload</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      PDF, JPG, or PNG · Max 10 MB
                    </p>
                  </div>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={handleFileChange}
            />

            <button
              disabled={!file}
              onClick={() => setStep('confirm')}
              className="w-full py-3.5 rounded-2xl bg-tertiary text-on-tertiary font-semibold text-sm
                         hover:bg-tertiary/90 active:scale-[0.99] transition-all disabled:opacity-40"
            >
              Review & Submit
            </button>
          </>
        )}

        {/* ── Step 3: Confirm ────────────────────────────────────────────── */}
        {step === 'confirm' && (
          <>
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                Review & Confirm
              </h2>
            </div>

            <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 overflow-hidden">
              <div className="px-4 py-3 bg-tertiary/5 border-b border-outline-variant/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">
                  Participation Summary
                </p>
              </div>
              <div className="px-4 py-4 space-y-3">
                {[
                  { label: 'Event ID',  value: eventId },
                  { label: 'Team',      value: teamName || '—' },
                  { label: 'Result',    value: RESULTS.find(r => r.value === result)?.label ?? result },
                  { label: 'Note',      value: resultNote || '—' },
                  { label: 'Proof',     value: file?.name ?? '—' },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-3">
                    <span className="text-[11px] text-on-surface-variant w-16 shrink-0 pt-px">{row.label}</span>
                    <span className="text-sm text-on-surface font-medium break-all">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] shrink-0 mt-px">error</span>
                {formError}
              </div>
            )}

            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full py-3.5 rounded-2xl bg-tertiary text-on-tertiary font-semibold text-sm
                         hover:bg-tertiary/90 active:scale-[0.99] transition-all disabled:opacity-50
                         flex items-center justify-center gap-2"
            >
              {submitting
                ? <><span className="w-4 h-4 rounded-full border-2 border-on-tertiary/30 border-t-on-tertiary animate-spin" />
                    Submitting…</>
                : 'Submit Participation'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
