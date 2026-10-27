import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateCredential, useEditCredential } from '../hooks/useCredentials';
import { CourseSearchInput } from '../components/CourseSearchInput';
import type { Course, CredTier, Credential } from '../types';

const TIERS: { value: CredTier; label: string; icon: string; desc: string }[] = [
  { value: 'pass',         label: 'Pass',         icon: 'check_circle',       desc: 'Completed the course' },
  { value: 'elite',        label: 'Elite',        icon: 'star',               desc: 'Top ~30% score' },
  { value: 'elite_silver', label: 'Elite Silver', icon: 'stars',              desc: 'Top ~20% score' },
  { value: 'elite_gold',   label: 'Elite Gold',   icon: 'workspace_premium',  desc: 'Top ~10% score' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

/**
 * AddAchievementPage  /achievements/add
 * Multi-step form: Course search → Metadata → Proof upload → Confirm.
 */
export default function AddAchievementPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // If editing an existing credential (resubmit / edit flow)
  const editCred  = (location.state as { edit?: Credential; resubmit?: Credential } | null)
                    ?.edit ?? (location.state as { resubmit?: Credential } | null)?.resubmit;

  const [step, setStep] = useState<'course' | 'meta' | 'proof' | 'confirm'>('course');

  // ── Step 1: Course ────────────────────────────────────────────────────────
  const [selectedCourse, setSelectedCourse] = useState<Course | null | undefined>(undefined);
  const [otherName,      setOtherName]      = useState(editCred?.otherCourseName ?? '');

  // ── Step 2: Metadata ──────────────────────────────────────────────────────
  const [issuer,         setIssuer]         = useState(editCred?.issuer ?? '');
  const [session,        setSession]        = useState(editCred?.session ?? '');
  const [year,           setYear]           = useState<number>(editCred?.year ?? CURRENT_YEAR);
  const [tier,           setTier]           = useState<CredTier>(editCred?.tier ?? 'pass');
  const [certificateId,  setCertificateId]  = useState(editCred?.certificateId ?? '');

  // ── Step 3: Proof ─────────────────────────────────────────────────────────
  const [file,    setFile]    = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [submitting,   setSubmitting]   = useState(false);
  const [formError,    setFormError]    = useState('');
  const [uploadSuccess,setUploadSuccess]= useState(false);

  const { mutateAsync: createCred } = useCreateCredential();
  const { mutateAsync: editCredMut } = useEditCredential(editCred?._id ?? '');

  // ── Derived ───────────────────────────────────────────────────────────────
  const isOther    = selectedCourse === null;
  const isEditing  = !!editCred;
  const effectiveIssuer = selectedCourse?.issuer ?? issuer;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview('');  // PDF — no preview
    }
  }

  async function handleSubmit() {
    setFormError('');
    setSubmitting(true);
    try {
      if (isEditing && !file) {
        // Edit-only: no new file
        await editCredMut({ session, year, tier, certificateId });
      } else {
        if (!file) { setFormError('Please upload a proof file.'); setSubmitting(false); return; }
        await createCred({
          courseId:       selectedCourse?._id,
          otherCourseName: isOther ? otherName : undefined,
          issuer:         effectiveIssuer,
          session,
          year,
          tier,
          certificateId,
          proof:          file,
        });
      }
      setUploadSuccess(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[52px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}>
            task_alt
          </span>
        </div>
        <div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface">
            {isEditing ? 'Updated!' : 'Submitted!'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            Your certificate is <strong>under review</strong> by your department faculty.
            You'll be notified once it's verified.
          </p>
        </div>
        <button
          onClick={() => navigate('/badges')}
          className="px-8 py-3 rounded-2xl bg-primary text-on-primary font-semibold text-sm
                     hover:bg-primary/90 active:scale-[0.99] transition-all"
        >
          View My Achievements
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
          onClick={() => step === 'course' ? navigate(-1) : setStep(
            step === 'meta' ? 'course' : step === 'proof' ? 'meta' : 'proof'
          )}
          className="p-1.5 rounded-xl hover:bg-surface-container-high transition-colors"
          aria-label="Back"
        >
          <span className="material-symbols-outlined text-[22px] text-on-surface">arrow_back</span>
        </button>
        <h1 className="font-semibold text-on-surface text-base flex-1">
          {isEditing ? 'Edit Certificate' : 'Add Achievement'}
        </h1>
        {/* Step indicator */}
        <div className="flex gap-1.5">
          {(['course', 'meta', 'proof', 'confirm'] as const).map((s, i) => (
            <div key={s}
                 className={`h-1.5 rounded-full transition-all ${
                   s === step ? 'w-5 bg-primary' : i < ['course','meta','proof','confirm'].indexOf(step) ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-outline-variant/40'
                 }`} />
          ))}
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-6">

        {/* ── Step 1: Course search ───────────────────────────────────────── */}
        {step === 'course' && (
          <>
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                Find your course
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Search our catalog or choose "Other" for unlisted courses.
              </p>
            </div>

            <CourseSearchInput
              value={selectedCourse}
              onSelect={c => setSelectedCourse(c === undefined ? undefined : c)}
            />

            {/* "Other" issuer input */}
            {isOther && (
              <div style={{ animation: 'slideUpFade 150ms ease-out' }}>
                <label htmlFor="other-name"
                       className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                  Course Name *
                </label>
                <input
                  id="other-name"
                  type="text"
                  value={otherName}
                  onChange={e => setOtherName(e.target.value)}
                  placeholder="e.g. Advanced Python by Coursera"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm
                             placeholder:text-on-surface-variant/50
                             focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}

            <button
              disabled={selectedCourse === undefined || (isOther && !otherName.trim())}
              onClick={() => setStep('meta')}
              className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-semibold text-sm
                         hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-40"
            >
              Continue
            </button>
          </>
        )}

        {/* ── Step 2: Metadata ───────────────────────────────────────────── */}
        {step === 'meta' && (
          <>
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                Certificate Details
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Fill in the details as printed on your certificate.
              </p>
            </div>

            {/* Issuer (auto-filled for catalog courses) */}
            {!selectedCourse && (
              <div>
                <label htmlFor="meta-issuer"
                       className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                  Issuer / Platform *
                </label>
                <input
                  id="meta-issuer"
                  type="text"
                  value={issuer}
                  onChange={e => setIssuer(e.target.value)}
                  placeholder="e.g. NPTEL, Coursera, Udemy"
                  maxLength={80}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm
                             placeholder:text-on-surface-variant/50
                             focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}

            {/* Session */}
            <div>
              <label htmlFor="meta-session"
                     className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Session *
              </label>
              <input
                id="meta-session"
                type="text"
                value={session}
                onChange={e => setSession(e.target.value)}
                placeholder="e.g. Jan–Apr 2026"
                maxLength={40}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm
                           placeholder:text-on-surface-variant/50
                           focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Year */}
            <div>
              <label htmlFor="meta-year"
                     className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Year *
              </label>
              <select
                id="meta-year"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Tier */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                Tier *
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TIERS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTier(t.value)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all
                      ${tier === t.value
                        ? 'border-primary bg-primary/8'
                        : 'border-outline-variant/25 hover:border-primary/30'
                      }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${tier === t.value ? 'text-primary' : 'text-on-surface-variant'}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}>
                      {t.icon}
                    </span>
                    <span className={`text-xs font-semibold ${tier === t.value ? 'text-primary' : 'text-on-surface'}`}>
                      {t.label}
                    </span>
                    <span className="text-[10px] text-on-surface-variant leading-tight">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Certificate ID */}
            <div>
              <label htmlFor="meta-certid"
                     className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
                Certificate ID *
              </label>
              <input
                id="meta-certid"
                type="text"
                value={certificateId}
                onChange={e => setCertificateId(e.target.value)}
                placeholder="As printed on the certificate"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm
                           font-mono placeholder:font-sans placeholder:text-on-surface-variant/50
                           focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              disabled={!session.trim() || !certificateId.trim() || (!selectedCourse && !issuer.trim())}
              onClick={() => setStep('proof')}
              className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-semibold text-sm
                         hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-40"
            >
              Continue
            </button>
          </>
        )}

        {/* ── Step 3: Proof upload ───────────────────────────────────────── */}
        {step === 'proof' && (
          <>
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                Upload Proof
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Upload your certificate (PDF, JPG, or PNG). Max 10 MB.
                {selectedCourse?.verificationMethod === 'issuer_qr'
                  ? ' 🔍 NPTEL PDF with QR code will be auto-verified.'
                  : ''}
              </p>
            </div>

            {/* Drop zone */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-2xl px-6 py-10
                flex flex-col items-center gap-4 transition-all
                ${file ? 'border-primary/60 bg-primary/5' : 'border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5'}`}
            >
              {file ? (
                <>
                  {preview ? (
                    <img src={preview} alt="Proof preview"
                         className="max-h-40 rounded-xl object-contain shadow-sm" />
                  ) : (
                    <span className="material-symbols-outlined text-[44px] text-primary"
                          style={{ fontVariationSettings: "'FILL' 1" }}>
                      picture_as_pdf
                    </span>
                  )}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-primary">{file.name}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[44px] text-on-surface-variant/40">
                    cloud_upload
                  </span>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-on-surface">
                      Tap to upload
                    </p>
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

            {/* NPTEL QR tip */}
            {selectedCourse?.verificationMethod === 'issuer_qr' && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-tertiary/8 border border-tertiary/20">
                <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0 mt-0.5">
                  qr_code_scanner
                </span>
                <p className="text-[11px] text-tertiary leading-relaxed">
                  Upload the <strong>original NPTEL PDF</strong> with the QR code visible.
                  It will be auto-verified in seconds.
                </p>
              </div>
            )}

            <button
              disabled={!file && !isEditing}
              onClick={() => setStep('confirm')}
              className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-semibold text-sm
                         hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-40"
            >
              {isEditing && !file ? 'Skip (keep existing proof)' : 'Review & Submit'}
            </button>
          </>
        )}

        {/* ── Step 4: Confirm ────────────────────────────────────────────── */}
        {step === 'confirm' && (
          <>
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                Review & Confirm
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Double-check your details before submitting for verification.
              </p>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 overflow-hidden">
              <div className="px-4 py-3 bg-primary/5 border-b border-outline-variant/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Certificate Summary
                </p>
              </div>
              <div className="px-4 py-4 space-y-3">
                {[
                  { label: 'Course',     value: isOther ? otherName : selectedCourse?.name ?? '—' },
                  { label: 'Issuer',     value: effectiveIssuer || issuer },
                  { label: 'Session',    value: session },
                  { label: 'Year',       value: String(year) },
                  { label: 'Tier',       value: TIERS.find(t => t.value === tier)?.label ?? tier },
                  { label: 'Cert ID',   value: certificateId },
                  { label: 'Proof',     value: file?.name ?? '(keeping existing)' },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-3">
                    <span className="text-[11px] text-on-surface-variant w-16 shrink-0 pt-px">{row.label}</span>
                    <span className="text-sm text-on-surface font-medium break-all">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Queue notice */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant/20">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 mt-0.5">
                info
              </span>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                {isOther
                  ? 'This will be sent to the admin queue for manual verification.'
                  : selectedCourse?.verificationMethod === 'issuer_qr'
                    ? 'NPTEL QR will be checked automatically. If verification fails, your faculty will review it.'
                    : 'Your faculty will review this certificate and verify it manually.'}
              </p>
            </div>

            {/* Error */}
            {formError && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] shrink-0 mt-px">error</span>
                {formError}
              </div>
            )}

            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-semibold text-sm
                         hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-50
                         flex items-center justify-center gap-2"
            >
              {submitting
                ? <><span className="w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />
                    Submitting…</>
                : isEditing ? 'Save Changes' : 'Submit for Verification'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
