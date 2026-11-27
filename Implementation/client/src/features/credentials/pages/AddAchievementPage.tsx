import { useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  useCourseSearch,
  useCreateCredential,
  useEditCredential,
  useMyCredentials,
} from '../hooks/useCredentials';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import type { Course, CredTier, Credential } from '../types';

// ── Achievement categories ────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'nptel',      label: 'NPTEL / Course',          icon: 'school',       titlePlaceholder: 'e.g. Database Management System', issuerPlaceholder: 'e.g. NPTEL / Swayam' },
  { id: 'hackathon',  label: 'Hackathon / Competition', icon: 'emoji_events', titlePlaceholder: 'e.g. Smart India Hackathon Finalist', issuerPlaceholder: 'e.g. Ministry of Education / IEEE' },
  { id: 'sports',     label: 'Sports & Athletics',      icon: 'sports_soccer',titlePlaceholder: 'e.g. Inter-College Football Winners', issuerPlaceholder: 'e.g. University Sports Council' },
  { id: 'industry',   label: 'Industry Certification',  icon: 'badge',        titlePlaceholder: 'e.g. AWS Solutions Architect', issuerPlaceholder: 'e.g. Amazon Web Services' },
  { id: 'research',   label: 'Research / Publication',  icon: 'description',  titlePlaceholder: 'e.g. IEEE Conference Paper', issuerPlaceholder: 'e.g. IEEE / Springer' },
  { id: 'leadership', label: 'Leadership / Other',      icon: 'groups',       titlePlaceholder: 'e.g. Technical Club Lead', issuerPlaceholder: 'e.g. Student Council / Cell' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

// ── Static tier config (matches backend CredTier enum) ────────────────────────

const TIERS: {
  value: CredTier;
  label: string;
  sub: string;
  pts: string;
  badgeCls: string;
}[] = [
  {
    value: 'elite_gold',
    label: 'Gold / 1st Place',
    sub: 'National winner, 1st place, or ≥90% Gold distinction',
    pts: '+5 Pts',
    badgeCls: 'text-amber-700 bg-amber-50',
  },
  {
    value: 'elite_silver',
    label: 'Silver / Finalist',
    sub: '2nd/3rd place, finalist, or NPTEL Silver Elite (>75%)',
    pts: '+4 Pts',
    badgeCls: 'text-teal-700 bg-teal-50',
  },
  {
    value: 'elite',
    label: 'Certified / Elite',
    sub: 'Industry certification or verified MOOC Elite completion',
    pts: '+3 Pts',
    badgeCls: 'text-emerald-700 bg-emerald-50',
  },
  {
    value: 'pass',
    label: 'Participation / Pass',
    sub: 'Verified course completion or event participation',
    pts: '+1 Pt',
    badgeCls: 'text-on-surface-variant bg-surface-container',
  },
];

const VERIF_STATUS_META = {
  verified: { label: 'Verified', cls: 'bg-emerald-50 text-emerald-700' },
  pending:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-700' },
  rejected: { label: 'Rejected', cls: 'bg-error-container text-on-error-container' },
} as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AddAchievementPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const stateObj = location.state as { edit?: Credential; resubmit?: Credential } | null;
  const editCred = stateObj?.edit ?? stateObj?.resubmit;
  const isEditing = !!editCred;

  const initialCourse =
    editCred?.courseId && typeof editCred.courseId === 'object'
      ? (editCred.courseId as unknown as Course)
      : editCred?.otherCourseName
        ? null
        : undefined;

  const [category, setCategory]             = useState<CategoryId>('nptel');
  const [courseQuery, setCourseQuery]       = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null | undefined>(initialCourse);
  const [otherName, setOtherName]           = useState(editCred?.otherCourseName ?? '');
  const [issuer, setIssuer]                 = useState(editCred?.issuer ?? '');
  const [session, setSession]               = useState(editCred?.session ?? '');
  const [year, setYear]                     = useState<number>(editCred?.year ?? new Date().getFullYear());
  const [tier, setTier]                     = useState<CredTier>(editCred?.tier ?? 'elite');
  const [certificateId, setCertificateId]   = useState(editCred?.certificateId ?? '');

  const [file, setFile] = useState<File | null>(null);
  const fileRef         = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting]       = useState(false);
  const [formError, setFormError]         = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // ── Live data hooks ───────────────────────────────────────────────────────
  const { data: coursesData, isLoading: coursesLoading } = useCourseSearch(courseQuery.trim() || undefined);
  const { data: myCredentials, isLoading: myCredsLoading } = useMyCredentials();
  const { mutateAsync: createCred } = useCreateCredential();
  const { mutateAsync: editCredMut } = useEditCredential(editCred?._id ?? '');

  const courses = coursesData ?? [];
  const recentSubmissions = useMemo(() => (myCredentials ?? []).slice(0, 5), [myCredentials]);

  const activeCategoryMeta = CATEGORIES.find(c => c.id === category) ?? CATEGORIES[0];
  const usesCatalog = category === 'nptel';
  const isCustomMode = !usesCatalog || selectedCourse === null;
  const effectiveIssuer = usesCatalog && selectedCourse ? selectedCourse.issuer : issuer;

  function handleCategoryChange(next: CategoryId) {
    setCategory(next);
    setFormError('');
    if (next !== 'nptel') {
      setSelectedCourse(null);
    } else if (selectedCourse === null && !otherName) {
      setSelectedCourse(undefined);
    }
  }

  function handleSelectCourse(course: Course) {
    setSelectedCourse(course);
    setIssuer(course.issuer);
    setFormError('');
  }

  function handleSelectOther() {
    if (selectedCourse === null) {
      setSelectedCourse(undefined);
      if (!isEditing) {
        setOtherName('');
        setIssuer('');
      }
    } else {
      setSelectedCourse(null);
      if (!isEditing) {
        if (!otherName && courseQuery.trim()) {
          setOtherName(courseQuery.trim());
        }
        setIssuer('');
      }
    }
    setFormError('');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFormError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!isEditing) {
      if (usesCatalog && selectedCourse === undefined) {
        setFormError('Please select a course from the catalog or choose "Other / Unlisted Course".');
        return;
      }
      if (isCustomMode && !otherName.trim()) {
        setFormError('Please enter the achievement or event title.');
        return;
      }
      if (!effectiveIssuer.trim()) {
        setFormError('Please enter the issuing or organizing body.');
        return;
      }
    }

    if (!session.trim()) {
      setFormError('Please enter the session or event date (e.g. Jul–Sep 2025 or Oct 2026).');
      return;
    }
    if (!certificateId.trim()) {
      setFormError('Please enter the Certificate / Credential ID.');
      return;
    }
    if ((!isEditing || stateObj?.resubmit) && !file) {
      setFormError('Please upload your certificate proof (PDF, PNG, or JPG).');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && !file) {
        await editCredMut({
          session: session.trim(),
          year,
          tier,
          certificateId: certificateId.trim(),
        });
      } else {
        if (!file) {
          setFormError('Please upload a proof file.');
          setSubmitting(false);
          return;
        }
        await createCred({
          courseId:        usesCatalog && selectedCourse ? selectedCourse._id : undefined,
          otherCourseName: isCustomMode ? otherName.trim() : undefined,
          issuer:          effectiveIssuer.trim(),
          session:         session.trim(),
          year,
          tier,
          certificateId:   certificateId.trim(),
          proof:           file,
        });
      }
      setUploadSuccess(true);
    } catch (err: unknown) {
      const apiMsg =
        (err as { response?: { data?: { error?: { message?: string } } } } | null)
          ?.response?.data?.error?.message;
      setFormError(apiMsg || (err instanceof Error ? err.message : 'Submission failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-[48px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            task_alt
          </span>
        </div>
        <div className="max-w-md">
          <h1 className="font-headline-md text-2xl font-bold text-on-surface">
            {isEditing && !stateObj?.resubmit ? 'Credential Updated!' : 'Achievement Submitted!'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            NPTEL certificates with a valid QR code are verified automatically; all other certificates (Sports,
            Hackathons, external certs) are reviewed by your faculty/admin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary-container transition-all"
          >
            View My Profile
          </button>
          <button
            onClick={() => {
              setUploadSuccess(false);
              setFile(null);
              setCertificateId('');
            }}
            className="px-6 py-2.5 rounded-xl bg-surface-container text-on-surface font-semibold text-sm hover:bg-surface-container-high transition-all"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle="Profile & Credentials" />

      <main className="w-full pt-16 max-w-6xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-on-surface-variant py-4 flex-wrap">
          <button onClick={() => navigate('/profile')} className="hover:text-primary transition-colors">
            Profile &amp; Credentials
          </button>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-surface font-semibold">
            {isEditing ? 'Update Achievement' : 'Add Achievement'}
          </span>
        </nav>

        {/* Page heading */}
        <div className="mb-6">
          <h1 className="font-headline-xl text-2xl lg:text-3xl text-on-surface font-bold tracking-tight">
            {isEditing ? 'Update Credential Submission' : 'Submit Achievement for Verification'}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">
            Submit NPTEL courses, hackathons, sports awards, industry certifications, or research publications.
            Certificates with QR codes are auto-verified; others are verified by admin/faculty.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left: Submission Form (8 cols) ─────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-5 sm:p-6 flex flex-col gap-6"
          >
            {/* 1. Achievement Type */}
            {!isEditing && (
              <div className="flex flex-col gap-3">
                <label className="block text-sm font-semibold text-on-surface">
                  1. Achievement Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => {
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`px-3 py-2.5 rounded-xl border text-left text-sm font-medium flex items-center gap-2 transition-all ${
                          active
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-outline-variant/25 bg-surface-container-low/50 hover:bg-surface-container-low text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px] shrink-0">{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Course Catalog (for NPTEL/Course) OR Direct Title & Issuer */}
            {!isEditing && (
              <div className="flex flex-col gap-3">
                <label className="block text-sm font-semibold text-on-surface">
                  {usesCatalog ? '2. Select Course or Enter Manually' : '2. Achievement Details'}
                </label>

                {usesCatalog && (
                  <>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                        search
                      </span>
                      <input
                        type="text"
                        value={courseQuery}
                        onChange={e => setCourseQuery(e.target.value)}
                        placeholder="Search course catalog (e.g. NPTEL, Database Management System)…"
                        className="w-full h-10 pl-10 pr-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-outline-variant/20 divide-y divide-outline-variant/10">
                      {coursesLoading ? (
                        <div className="p-3 text-sm text-on-surface-variant">Loading course catalog…</div>
                      ) : (
                        <>
                          {courses.map(c => {
                            const active = selectedCourse?._id === c._id;
                            return (
                              <button
                                key={c._id}
                                type="button"
                                onClick={() => handleSelectCourse(c)}
                                className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                                  active ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-low'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">
                                    {c.issuer} — {c.name}
                                  </p>
                                  <p className="text-xs text-on-surface-variant truncate">
                                    {c.category} · {c.verificationMethod === 'issuer_qr' ? 'QR Auto-Verify' : 'Faculty Verify'}
                                  </p>
                                </div>
                                {active && (
                                  <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                                    check_circle
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={handleSelectOther}
                            className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                              selectedCourse === null ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-low'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-semibold">Other / Unlisted Course</p>
                              <p className="text-xs text-on-surface-variant">
                                Enter course name &amp; issuer manually (verified by admin/faculty)
                              </p>
                            </div>
                            {selectedCourse === null && (
                              <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                                check_circle
                              </span>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {usesCatalog && selectedCourse && (
                  <div className="px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-sm flex items-center justify-between gap-2">
                    <span>
                      Selected: <strong>{selectedCourse.issuer} — {selectedCourse.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCourse(undefined)}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      Change
                    </button>
                  </div>
                )}

                {isCustomMode && (
                  <div className="flex flex-col gap-3">
                    {usesCatalog && selectedCourse === null && (
                      <div className="px-3.5 py-2 rounded-xl bg-primary/5 border border-primary/20 text-sm flex items-center justify-between gap-2">
                        <span>Selected: <strong>Other / Unlisted Course</strong></span>
                        <button
                          type="button"
                          onClick={handleSelectOther}
                          className="text-xs text-primary hover:underline font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="other-name" className="block text-xs font-semibold text-on-surface mb-1">
                          Achievement / Event / Course Title *
                        </label>
                        <input
                          id="other-name"
                          type="text"
                          value={otherName}
                          onChange={e => setOtherName(e.target.value)}
                          placeholder={activeCategoryMeta.titlePlaceholder}
                          className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div>
                        <label htmlFor="issuer-input" className="block text-xs font-semibold text-on-surface mb-1">
                          Issuing / Organizing Body *
                        </label>
                        <input
                          id="issuer-input"
                          type="text"
                          value={issuer}
                          onChange={e => setIssuer(e.target.value)}
                          placeholder={activeCategoryMeta.issuerPlaceholder}
                          className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Credential Metadata */}
            <div className="flex flex-col gap-3">
              <label className="block text-sm font-semibold text-on-surface">
                {isEditing ? '1. Credential Details' : '3. Credential Details'}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="cert-id" className="block text-xs font-semibold text-on-surface mb-1">
                    Certificate / Credential ID *
                  </label>
                  <input
                    id="cert-id"
                    type="text"
                    value={certificateId}
                    onChange={e => setCertificateId(e.target.value)}
                    placeholder="e.g. NPTEL25CS145S637201240"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label htmlFor="session-input" className="block text-xs font-semibold text-on-surface mb-1">
                    Session / Month *
                  </label>
                  <input
                    id="session-input"
                    type="text"
                    value={session}
                    onChange={e => setSession(e.target.value)}
                    placeholder="e.g. Jul–Sep"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label htmlFor="year-input" className="block text-xs font-semibold text-on-surface mb-1">
                    Academic Year *
                  </label>
                  <input
                    id="year-input"
                    type="number"
                    min={2000}
                    max={2100}
                    value={year}
                    onChange={e => setYear(Number(e.target.value) || new Date().getFullYear())}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            {/* 4. Achievement Tier */}
            <div className="flex flex-col gap-2.5">
              <label className="block text-sm font-semibold text-on-surface">
                {isEditing ? '2. Achievement Tier' : '4. Achievement Tier'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TIERS.map(t => {
                  const selected = tier === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTier(t.value)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        selected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-outline-variant/25 bg-surface-container-low/50 hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-on-surface">{t.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.badgeCls}`}>
                          {t.pts}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-snug">{t.sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Proof Upload */}
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-semibold text-on-surface">
                {isEditing ? '3. Proof Document (optional unless resubmitting)' : '5. Upload Certificate Proof *'}
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full p-5 rounded-xl border-2 border-dashed border-outline-variant/40 hover:border-primary/50 bg-surface-container-low/40 hover:bg-surface-container-low transition-all flex flex-col items-center justify-center gap-2 text-center"
              >
                <span className="material-symbols-outlined text-[28px] text-primary">
                  {file ? 'description' : 'upload_file'}
                </span>
                {file ? (
                  <>
                    <span className="text-sm font-semibold text-on-surface">{file.name}</span>
                    <span className="text-xs text-on-surface-variant">
                      {(file.size / 1024).toFixed(0)} KB · Click to replace
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-on-surface">
                      Click to upload PDF, PNG, or JPG
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      NPTEL QR certificates auto-verify on submit; certificates without QR go to admin/faculty verification.
                    </span>
                  </>
                )}
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-error-container/30 border border-error/30 text-sm text-error flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/15">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/40 text-sm font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                {submitting ? 'Submitting…' : isEditing ? 'Save Changes' : 'Submit for Verification'}
              </button>
            </div>
          </form>

          {/* ── Right: Live Recent Submissions (4 cols) ────────────────────── */}
          <aside className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-headline-sm text-base font-bold text-on-surface">
                  My Recent Submissions
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View All
                </button>
              </div>

              {myCredsLoading ? (
                <p className="text-sm text-on-surface-variant">Loading your submissions…</p>
              ) : recentSubmissions.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  You haven&apos;t submitted any credentials yet. Your submissions and verification statuses will
                  appear here.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {recentSubmissions.map(c => {
                    const title =
                      (c.courseId && typeof c.courseId === 'object' ? c.courseId.name : null) ??
                      c.otherCourseName ??
                      c.issuer;
                    const st = VERIF_STATUS_META[c.verification.status];
                    return (
                      <div
                        key={c._id}
                        className="p-3 rounded-xl bg-surface-container-low/60 border border-outline-variant/15 flex flex-col gap-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-on-surface leading-snug">{title}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${st.cls}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          {c.issuer} · {c.session} · ID: {c.certificateId}
                        </p>
                        {c.verification.status === 'rejected' && c.verification.reason && (
                          <p className="text-xs text-error mt-0.5">Reason: {c.verification.reason}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <BottomNav active="profile" />
    </div>
  );
}
