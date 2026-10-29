import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreateCredential, useEditCredential } from '../hooks/useCredentials';
import { AppBar }    from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import type { Course, CredTier, Credential } from '../types';

// ── Static config ─────────────────────────────────────────────────────────────

const TIERS: {
  value: CredTier; label: string; sub: string; pts: string;
  t: string; tCls: string; ptsHighlight: boolean;
}[] = [
  { value: 'elite_gold',   label: 'Gold / 1st Place',    sub: 'Elite national winner or highest grade distinction (+90%)', pts: '+5 Pts', t: 'T1', tCls: 'text-amber-600 bg-amber-50',    ptsHighlight: false },
  { value: 'elite_silver', label: 'Silver / Finalist',   sub: '2nd/3rd place, state finalist, or NPTEL silver elite',     pts: '+4 Pts', t: 'T2', tCls: 'text-teal-700 bg-teal-50',      ptsHighlight: false },
  { value: 'elite',        label: 'Certified / Passing', sub: 'Associate pro vendor certification or verified MOOC completion', pts: '+3 Pts', t: 'T3', tCls: 'text-emerald-700 bg-emerald-50', ptsHighlight: true  },
  { value: 'pass',         label: 'Participation',       sub: 'Standard attendance or non-podium hackathon participation', pts: '+1 Pt',  t: 'T4', tCls: 'text-outline bg-surface-container', ptsHighlight: false },
];

const CATEGORY_TRACKS = [
  { id: 'industry',    label: 'Industry Certification',   icon: 'badge'       },
  { id: 'hackathon',   label: 'Hackathon / Competition',  icon: 'emoji_events'},
  { id: 'nptel',       label: 'NPTEL / Swayam / MOOC',   icon: 'school'      },
  { id: 'research',    label: 'Research Paper / Patent',  icon: 'description' },
  { id: 'leadership',  label: 'Inter-College Leadership', icon: 'groups'      },
];

const LEDGER_CRED_TYPES = [
  'Professional Cert.',
  'Academic Award',
  'Hackathon Prize',
  'Research Credit',
  'Leadership Role',
];

const RUBRIC_ROWS = [
  { category: 'National Hackathon (Winner)',   pts: '+5 Pts' },
  { category: 'Vendor Cloud Cert (Assoc)',     pts: '+3 Pts' },
  { category: 'NPTEL Elite + Silver (>75%)',   pts: '+4 Pts' },
  { category: 'Paper Published (Scopus/IEEE)', pts: '+5 Pts' },
];

const RECENT_VERIFICATIONS = [
  { name: 'NPTEL Elite + Gold (94%)',          ctx: 'Cloud Computing Architecture • Aug 2025', pts: '+6 PTS', status: 'Approved',   statusCls: 'text-emerald-700', ptsCls: 'bg-primary/10 text-primary'         },
  { name: 'Smart India Hackathon Finalist',    ctx: 'Ministry of Education • Jul 2025',        pts: '+5 PTS', status: 'Approved',   statusCls: 'text-emerald-700', ptsCls: 'bg-primary/10 text-primary'         },
  { name: 'AWS Certified Solutions Architect', ctx: 'Draft/Pending Submission',                pts: '+3 PTS', status: 'Unverified', statusCls: 'text-outline',    ptsCls: 'bg-surface-container text-outline'  },
];

const HONOR_CODE_FAQS = [
  { q: 'Can one certificate be submitted twice?',  a: 'No. Every document hash is indexed to your campus UID. Re-submission triggers anti-collision alerts.' },
  { q: 'When do credits reflect on grades?',       a: 'Verified points sync to the Autonomous Registrar at the close of every 60-day academic cycle.'       },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AddAchievementPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const editCred = (location.state as { edit?: Credential; resubmit?: Credential } | null)
                   ?.edit ?? (location.state as { resubmit?: Credential } | null)?.resubmit;

  // ── form state ───────────────────────────────────────────────────────────
  const [category,      setCategory]     = useState('industry');
  const [selectedCourse]                  = useState<Course | null | undefined>(undefined);
  const [otherName]                       = useState(editCred?.otherCourseName ?? '');
  const [issuer]                          = useState(editCred?.issuer ?? '');
  const [session]                         = useState(editCred?.session ?? '');
  const [year]                            = useState<number>(editCred?.year ?? new Date().getFullYear());
  const [tier,          setTier]         = useState<CredTier>(editCred?.tier ?? 'elite');
  const [certificateId, setCertificateId]= useState(editCred?.certificateId ?? 'AWS-SAA-884920');
  const [expiry,        setExpiry]       = useState('September 2026');
  const [ledgerCredType, setLedgerCredType] = useState('Professional Cert.');
  const [verifyUrl,     setVerifyUrl]    = useState('https://aws.amazon.com/verification/AWS-SAA-884920');
  const [reflection,    setReflection]   = useState(
    'Completed during the summer term self-study sprint. Includes 40+ hours of hands-on VPC peering, IAM role policies, and automated EKS cluster deployments under the AWS Academy student sandbox.'
  );

  const [file,       setFile]       = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [submitting,    setSubmitting]    = useState(false);
  const [formError,     setFormError]     = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const { mutateAsync: createCred } = useCreateCredential();
  const { mutateAsync: editCredMut } = useEditCredential(editCred?._id ?? '');

  const isEditing       = !!editCred;
  const isOther         = selectedCourse === null;
  const effectiveIssuer = selectedCourse?.issuer ?? issuer;

  // Dynamic point display based on selected tier
  const tierPts = TIERS.find(t => t.value === tier)?.pts ?? '+3 Pts';
  const tierPtsNum = tierPts.replace(/[^0-9]/g, '');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
  }

  async function handleSubmit() {
    setFormError('');
    setSubmitting(true);
    try {
      if (isEditing && !file) {
        await editCredMut({ session, year, tier, certificateId });
      } else {
        if (!file) { setFormError('Please upload a proof file.'); setSubmitting(false); return; }
        await createCred({
          courseId: selectedCourse?._id,
          otherCourseName: isOther ? otherName : undefined,
          issuer: effectiveIssuer,
          session, year, tier, certificateId,
          proof: file,
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[52px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
        </div>
        <div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface">{isEditing ? 'Updated!' : 'Submitted for Faculty Verification!'}</h1>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
            Your credential is <strong>under review</strong> by your department faculty. You'll be notified once it's verified and credits are allocated.
          </p>
        </div>
        <button onClick={() => navigate('/profile')}
          className="px-8 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary-container active:scale-[0.99] transition-all">
          View My Profile
        </button>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle="Profile & Credentials" />

      <main className="w-full pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── System status bar ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-outline-variant/10 mt-1">
          <div className="flex items-center gap-3 flex-wrap text-[11px] font-label-md">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/20 text-secondary font-bold text-[10px] uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              Tamper Detection &amp; OCR Engine Active
            </span>
            <span className="hidden sm:block h-3.5 w-[1px] bg-outline-variant" />
            <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">storage</span>
              Ledger Node #849-82 Connected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] flex items-center gap-1.5 transition-colors">
              <span className="material-symbols-outlined text-[15px]">table_chart</span>
              Point Rubric Table
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] flex items-center gap-1.5 transition-colors">
              <span className="material-symbols-outlined text-[15px]">policy</span>
              Verification Guidelines
            </button>
          </div>
        </div>

        {/* ── Breadcrumb ────────────────────────────────────────────────── */}
        <nav className="flex items-center gap-1.5 font-label-md text-[11px] text-on-surface-variant py-3 flex-wrap">
          <span>Campus Ledger</span>
          <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          <button onClick={() => navigate('/profile')} className="hover:text-primary transition-colors">Student Profile</button>
          <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          <span className="text-on-surface font-semibold">Submit Achievement &amp; Credential Verification</span>
        </nav>

        {/* ── ECDSA ledger pill ─────────────────────────────────────────── */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-code-sm text-[11px] font-semibold mb-4">
          <span className="material-symbols-outlined text-[14px]">verified_user</span>
          ECDSA-256 LEDGER ADMISSION • TERM 2025-Q1
        </div>

        {/* ── Page heading ──────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
          <div className="max-w-2xl">
            <h1 className="font-headline-xl text-[2rem] lg:text-[2.25rem] text-on-surface tracking-tight font-bold leading-tight">
              Submit Achievement &amp; Accreditation Credential
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant mt-2 leading-relaxed max-w-xl">
              Upload verified industry certifications, hackathon awards, or academic honors to claim institutional
              activity points and automatically populate your cryptographic academic transcript.
            </p>
          </div>
          <span className="flex-shrink-0 self-start flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container text-on-surface font-label-md text-[11px]">
            <span className="material-symbols-outlined text-[16px] text-primary">security</span>
            Honor Code Protected
          </span>
        </div>

        {/* ── 4-KPI ribbon ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* KPI 1 */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col gap-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-md text-[10px] text-outline uppercase tracking-wider">Earnable Activity Credits</span>
              <span className="material-symbols-outlined text-[18px] text-outline">add_circle</span>
            </div>
            <div className="font-headline-lg text-[1.375rem] font-bold text-on-surface">+1 to +5 Pts</div>
            <p className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">Allocated per audited credential</p>
          </div>

          {/* KPI 2 */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col gap-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-md text-[10px] text-outline uppercase tracking-wider">Current Student Balance</span>
              <span className="material-symbols-outlined text-[18px] text-outline">trophy</span>
            </div>
            <div className="font-headline-lg text-[1.375rem] font-bold text-on-surface">120 Pts</div>
            <p className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">Tier: Level 4 Innovator</p>
            <p className="font-label-sm text-[10px] text-on-surface-variant">Target: 150 Pts (Tier 5)</p>
            <div className="w-full h-1.5 bg-surface-container rounded-full mt-1">
              <div className="h-1.5 bg-primary rounded-full" style={{ width: '80%' }} />
            </div>
          </div>

          {/* KPI 3 — Review Turnaround (highlighted) */}
          <div className="bg-secondary-fixed/30 p-4 rounded-xl shadow-sm flex flex-col gap-1 border border-secondary-fixed/20">
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-md text-[10px] text-outline uppercase tracking-wider">Review Turnaround</span>
              <span className="material-symbols-outlined text-[18px] text-outline">schedule</span>
            </div>
            <div className="font-headline-lg text-[1.375rem] font-bold text-on-surface">&lt; 24–48 Hours</div>
            <p className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">Assigned to Faculty SPOC Chair</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-label-sm text-[10px] text-emerald-700 font-semibold">Committee Desk Online</span>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col gap-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-md text-[10px] text-outline uppercase tracking-wider">Term Verification Quota</span>
              <span className="material-symbols-outlined text-[18px] text-outline">task_alt</span>
            </div>
            <div className="font-headline-lg text-[1.375rem] font-bold text-on-surface">8/10 Approved</div>
            <p className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">2 Submissions available this term</p>
          </div>
        </div>

        {/* ── 3-step progress ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {[
            { n: '1', label: 'Credential Meta',  sublabel: 'Verified Specs',  done: true,  active: false },
            { n: '2', label: 'Proof & OCR Scan', sublabel: 'Active Stage',    done: false, active: true  },
            { n: '3', label: 'Faculty Routing',  sublabel: 'Pending Submit',  done: false, active: false },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && <div className="h-[1px] w-10 bg-outline-variant/30 hidden sm:block" />}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-label-md text-[12px] font-bold flex-shrink-0 transition-all ${
                  s.done ? 'bg-emerald-500 text-white' : s.active ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline'
                }`}>
                  {s.done ? <span className="material-symbols-outlined text-[14px]">check</span> : s.n}
                </div>
                <div className="hidden sm:block">
                  <div className={`font-label-md text-[11px] font-semibold ${s.done ? 'text-on-surface-variant' : s.active ? 'text-primary' : 'text-outline'}`}>
                    {s.label}
                  </div>
                  <div className={`font-label-sm text-[10px] ${s.done ? 'text-emerald-600' : s.active ? 'text-primary' : 'text-outline'}`}>
                    {s.sublabel}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main 2-col layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ──────────── LEFT FORM (8 cols) ──────────────────────────── */}
          <div className="lg:col-span-8 flex flex-col gap-5">

            {/* ═══ SEC 01: Credential Category & Issuing Body ═══════════ */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center font-label-md text-[12px] font-bold">1</div>
                  <div>
                    <h2 className="font-headline-sm text-[15px] text-on-surface font-bold">Credential Category &amp; Issuing Body</h2>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">Classify your credential against academic recognition registers</p>
                  </div>
                </div>
                <span className="font-code-sm text-[10px] text-outline">SEC_01</span>
              </div>

              <div className="px-5 py-4 flex flex-col gap-4">
                {/* Accreditation Track chips */}
                <div>
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-2">Accreditation Track</div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_TRACKS.map(t => (
                      <button key={t.id} type="button" onClick={() => setCategory(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-[12px] border transition-all ${
                          category === t.id
                            ? 'bg-primary-container text-on-primary border-primary-container font-semibold shadow-sm'
                            : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/40 hover:text-on-surface bg-transparent'
                        }`}>
                        <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Issuing Org field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="issuing-org" className="font-label-sm text-[10px] text-outline uppercase tracking-wider">
                      Issuing Organization / Course Registry
                    </label>
                    <span className="flex items-center gap-1 text-emerald-700 font-label-sm text-[10px]">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      Recognised Campus Partner
                    </span>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">business</span>
                    <input id="issuing-org" type="text"
                      defaultValue="AWS Certified Solutions Architect - Associate [SAA-C03]"
                      className="w-full h-11 pl-10 pr-32 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-surface-container text-outline font-code-sm text-[10px]">
                      ID: AWS-TIER-1
                    </span>
                  </div>
                  <p className="font-label-sm text-[10px] text-on-surface-variant mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">info</span>
                    Amazon Web Services Cloud Architecture Track — Approved Autonomous Elective Credit
                  </p>
                </div>

                {/* 4-col metadata row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Completion Date */}
                  <div>
                    <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-1.5">Completion / Issue Date</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[15px]">calendar_today</span>
                      <input type="text" defaultValue="September 2025"
                        className="w-full h-10 pl-8 pr-2 rounded-lg bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  {/* Roll ID */}
                  <div>
                    <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-1.5">Roll ID / License Key</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[15px]">badge</span>
                      <input type="text" value={certificateId} onChange={e => setCertificateId(e.target.value)}
                        className="w-full h-10 pl-8 pr-2 rounded-lg bg-surface-container-low text-on-surface font-code-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  {/* Expiration */}
                  <div>
                    <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-1.5">Expiration (Optional)</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[15px]">event</span>
                      <input type="text" value={expiry} onChange={e => setExpiry(e.target.value)}
                        className="w-full h-10 pl-8 pr-2 rounded-lg bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  {/* Ledger Credential Type */}
                  <div>
                    <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-1.5">Ledger Credential Type</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[15px]">bookmark</span>
                      <select value={ledgerCredType} onChange={e => setLedgerCredType(e.target.value)}
                        className="w-full h-10 pl-8 pr-2 rounded-lg bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none">
                        {LEDGER_CRED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">expand_more</span>
                    </div>
                  </div>
                </div>

                {/* Verification URL */}
                <div>
                  <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-1.5">
                    Public Verification Registry URL
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[15px]">link</span>
                      <input type="url" value={verifyUrl} onChange={e => setVerifyUrl(e.target.value)}
                        className="w-full h-10 pl-8 pr-2 rounded-lg bg-surface-container-low text-on-surface font-code-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <button type="button"
                      className="flex-shrink-0 h-10 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] flex items-center gap-1.5 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">wifi_tethering</span>
                      Ping Live
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ═══ SEC 02: Achievement Level & Credit Allocation ═════════ */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-secondary text-on-secondary flex items-center justify-center font-label-md text-[12px] font-bold">2</div>
                  <div>
                    <h2 className="font-headline-sm text-[15px] text-on-surface font-bold">Achievement Level &amp; Credit Allocation</h2>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">Self-select tier as benchmarked against university standing orders</p>
                  </div>
                </div>
                <span className="font-code-sm text-[10px] text-outline">SEC_02</span>
              </div>

              <div className="px-5 py-4 flex flex-col gap-4">
                {/* Tier cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {TIERS.map(t => {
                    const sel = tier === t.value;
                    return (
                      <button key={t.value} type="button" onClick={() => setTier(t.value)}
                        className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 transition-all text-left relative ${
                          sel ? 'border-primary bg-primary/5 shadow-sm' : 'border-outline-variant/20 hover:border-primary/30'
                        }`}>
                        {/* Selected checkmark overlay */}
                        {sel && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-primary text-[12px]">check</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between w-full">
                          <span className={`font-label-lg text-[11px] font-bold px-1.5 py-0.5 rounded ${t.tCls}`}>{t.t}</span>
                          <span className={`font-label-sm text-[10px] font-bold px-1.5 py-0.5 rounded ${sel ? 'bg-primary/10 text-primary' : 'bg-surface-container text-outline'}`}>
                            {t.pts}
                          </span>
                        </div>
                        <div className="font-label-md text-[12px] text-on-surface font-semibold">{t.label}</div>
                        <p className="font-body-sm text-[10px] text-on-surface-variant leading-snug">{t.sub}</p>
                        <span className={`text-[10px] font-label-sm font-semibold ${sel ? 'text-primary' : 'text-outline'}`}>
                          {sel ? '✓ Selected Tier' : 'Selectable'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic score bar */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-container">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-primary">calculate</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Dynamic Score Calculation</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-headline-sm text-[15px] text-primary font-bold">+{tierPtsNum} Institutional Activity Points</div>
                    <div className="font-label-sm text-[10px] text-on-surface-variant">Eq. 0.20 Elective Credit</div>
                  </div>
                </div>
              </div>
            </section>

            {/* ═══ SEC 03: Duplicate Detection & Anti-Tamper Scan ════════ */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-tertiary text-on-tertiary flex items-center justify-center font-label-md text-[12px] font-bold">3</div>
                  <div>
                    <h2 className="font-headline-sm text-[15px] text-on-surface font-bold">Duplicate Detection &amp; Anti-Tamper Scan</h2>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">Real-time ledger hash lookup against global university cross-checks</p>
                  </div>
                </div>
                <span className="font-code-sm text-[10px] text-outline">SEC_03</span>
              </div>

              <div className="px-5 py-4 flex flex-col gap-3">
                {/* Passed banner */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                    </div>
                    <div>
                      <div className="font-label-lg text-[13px] text-emerald-900 font-bold flex items-center gap-2">
                        Duplicate Check Passed
                        <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 font-code-sm text-[9px] font-bold">ECDSA-NODE-0K</span>
                      </div>
                      <div className="font-label-sm text-[10px] text-emerald-700 mt-0.5">Verified against INVENTUM Campus Hyperledger Network</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-label-sm text-[9px] text-outline uppercase tracking-wider">Hash Match</div>
                    <div className="font-code-sm text-[12px] text-emerald-700 font-bold">100% UNCHANGED</div>
                  </div>
                </div>

                <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                  Credential ID <span className="font-code-sm font-semibold text-on-surface">AWS-SAA-884920</span> has not been claimed previously by
                  any campus student. Matched against student profile <span className="font-code-sm font-semibold text-on-surface">Ananya Rao (UID: 22CS0841)</span>.
                </p>

                {/* Honor council warning */}
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="material-symbols-outlined text-[16px] text-amber-600 flex-shrink-0 mt-0.5">info</span>
                  <p className="font-body-sm text-[11px] text-amber-800 leading-relaxed">
                    <span className="font-semibold">Campus Honor Council Notice:</span> Forged PDF layers or recycled credentials automatically lock incubator
                    team access and generate an incident docket on academic transcripts.
                  </p>
                </div>
              </div>
            </section>

            {/* ═══ SEC 04: Primary Proof Document ════════════════════════ */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-surface-container text-primary flex items-center justify-center font-label-md text-[12px] font-bold border border-primary/20">4</div>
                  <div>
                    <h2 className="font-headline-sm text-[15px] text-on-surface font-bold">Primary Proof Document &amp; Signature Verification</h2>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">Cryptographic image scan with EXIF timestamp and PDF structure analysis</p>
                  </div>
                </div>
                <span className="font-code-sm text-[10px] text-outline">SEC_04</span>
              </div>

              <div className="px-5 py-4 flex flex-col gap-3">
                {/* File row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-error-container/60 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px] text-on-error-container">picture_as_pdf</span>
                    </div>
                    <div>
                      <div className="font-label-md text-[12px] text-on-surface font-semibold flex items-center gap-2">
                        {file ? file.name : 'AWS_Solutions_Architect_AnanyaRao_Certificate.pdf'}
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-[9px] font-bold tracking-wide">AUTHENTIC</span>
                      </div>
                      <div className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">
                        {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '1.84 MB'} • Uploaded just now via Secure WebDAV •
                        <span className="font-code-sm ml-1">SHA-256: 0x9f4a...23c0</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button type="button"
                      className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] flex items-center gap-1 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">visibility</span>Inspect
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] flex items-center gap-1 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">swap_horiz</span>Replace
                    </button>
                  </div>
                </div>

                {/* Verification signals */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { icon: 'qr_code_scanner', label: 'Digital Seal & QR Decoded' },
                    { icon: 'tune',            label: 'EXIF Vector Metadata Valid' },
                    { icon: 'lock_clock',      label: 'Time-Lock Block #910,214'  },
                  ].map(v => (
                    <div key={v.label} className="flex items-center gap-1.5 font-label-sm text-[11px] text-on-surface-variant">
                      <span className="material-symbols-outlined text-[15px] text-primary">{v.icon}</span>
                      {v.label}
                    </div>
                  ))}
                </div>

                <p className="font-body-sm text-[10px] text-on-surface-variant">
                  Accepted Formats: Cryptographically sealed PDF, High-Res PNG or JPG (Max 15MB).
                  OCR engine automatically checks official issuer cert seals.
                </p>

                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={handleFileChange} />
              </div>
            </section>

            {/* ═══ SEC 05: Institutional Routing & SPOC Desk ════════════ */}
            <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-surface-container text-on-surface flex items-center justify-center font-label-md text-[12px] font-bold border border-outline-variant/20">5</div>
                  <div>
                    <h2 className="font-headline-sm text-[15px] text-on-surface font-bold">Institutional Routing &amp; SPOC Desk</h2>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">Assigned academic coordinator for final ledger endorsement</p>
                  </div>
                </div>
                <span className="font-code-sm text-[10px] text-outline">SEC_05</span>
              </div>

              <div className="px-5 py-4 flex flex-col gap-4">
                {/* SPOC card — primary background */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-primary text-on-primary">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-on-primary/20 flex items-center justify-center font-label-lg text-[14px] font-bold flex-shrink-0">VR</div>
                    <div>
                      <div className="font-label-lg text-[13px] font-bold flex items-center gap-2">
                        Dr. V. Ramanathan
                        <span className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-fixed font-label-sm text-[9px] font-bold">FACULTY SPOC</span>
                      </div>
                      <p className="font-body-sm text-[11px] text-on-primary/80 mt-0.5">Dept. of AI &amp; Data Systems • Academic Accreditation Committee Lead</p>
                      <p className="font-body-sm text-[10px] text-on-primary/70">Avg. Endorsement Time: 3h • Desk Status: Active</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-label-sm text-[9px] text-on-primary/60 uppercase tracking-wider">Queue Position</div>
                    <div className="font-headline-lg text-[1.75rem] font-bold leading-none">#04</div>
                  </div>
                </div>

                {/* Reflection textarea */}
                <div>
                  <label htmlFor="reflection" className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-1.5">
                    Student Self-Reflection / Remarks for Faculty Review
                  </label>
                  <textarea id="reflection" rows={4} value={reflection} onChange={e => setReflection(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                  <p className="font-label-sm text-[10px] text-on-surface-variant mt-1">
                    Visible to Faculty Review Board and included in the permanent transcript metadata.
                  </p>
                </div>
              </div>
            </section>

            {/* ── Error ─────────────────────────────────────────────────── */}
            {formError && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] shrink-0 mt-px">error</span>
                {formError}
              </div>
            )}

            {/* ── Bottom action bar ─────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-4 border-t border-outline-variant/10">
              <button type="button" onClick={() => navigate(-1)}
                className="px-5 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-sm flex items-center justify-center gap-2 transition-colors">
                Cancel / Discard Draft
              </button>
              <div className="flex items-center gap-2">
                <button type="button"
                  className="px-5 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-sm flex items-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save Draft
                </button>
                <button type="button"
                  id="submit-credential-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-sm font-semibold shadow-sm hover:bg-primary-container transition-all flex items-center gap-2 disabled:opacity-60 active:scale-[0.98]">
                  {submitting ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />Submitting…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[16px]">send</span>Submit for Faculty Verification →</>
                  )}
                </button>
              </div>
            </div>

            {/* Cryptographic signature footer */}
            <div className="py-2 flex items-center justify-center gap-2 font-code-sm text-[10px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Cryptographically signed via Student Identity Token:
              <span className="text-primary">ananya.rao@campus.ac.in</span>
              • SFC-P256K1 // SHA-256
            </div>

          </div>

          {/* ──────────── RIGHT SIDEBAR (4 cols) ─────────────────────── */}
          <aside className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">

            {/* Live Inspector Replica (PDF preview) */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">preview</span>
                  <span className="font-label-md text-[13px] text-on-surface font-semibold">Live Inspector Replica</span>
                </div>
                <span className="font-code-sm text-[10px] text-outline">PDF-PAGE 1/1</span>
              </div>
              <div className="w-full rounded-lg bg-surface-container-low border border-outline-variant/10 overflow-hidden">
                {/* PDF header */}
                <div className="bg-amber-50 border-b border-outline-variant/10 px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider">GoldenSky</div>
                    <div className="font-headline-sm text-[15px] text-on-surface font-bold">Amazon Web Services</div>
                  </div>
                  <span className="text-amber-500 text-[20px]">★</span>
                </div>
                {/* PDF body */}
                <div className="p-4">
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-1">Candidate Accreditation</div>
                  <div className="font-headline-md text-[17px] text-on-surface font-bold mb-1">Ananya Rao</div>
                  <p className="font-body-sm text-[10px] text-on-surface-variant mb-4 leading-relaxed">
                    Has successfully fulfilled all curriculum requirements for AWS Solutions Architect - Associate
                  </p>
                  {/* READY watermark effect */}
                  <div className="relative border border-outline-variant/20 rounded p-2 mb-3">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                      <span className="font-headline-xl text-[28px] font-black text-emerald-600 rotate-[-25deg] tracking-widest">READY</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-label-sm text-[9px] text-outline uppercase tracking-wider">Digital Verified</div>
                        <div className="font-code-sm text-[11px] text-on-surface font-semibold">SERIAL: 884920</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-[10px] font-bold">AUDITED ✓</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-on-surface-variant font-label-sm border-t border-outline-variant/10 pt-2">
                    <span>Render: Native Vector PDF</span>
                    <span>Resolution: 300 DPI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Accreditation Rubric */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">gavel</span>
                  <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold">Accreditation Rubric</h2>
                </div>
                <span className="font-code-sm text-[10px] text-outline">Rev. 2025</span>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant mb-3 leading-relaxed">
                Autonomous Academic Regulations state that 15 Institutional Activity Points equate to 1 Autonomous
                Elective Credit (Max 2 credits per semester):
              </p>
              <div className="rounded-lg overflow-hidden border border-outline-variant/10">
                <div className="grid grid-cols-2 bg-surface-container px-3 py-2">
                  <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Activity Category</span>
                  <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider text-right">Points Value</span>
                </div>
                {RUBRIC_ROWS.map(r => (
                  <div key={r.category} className="grid grid-cols-2 px-3 py-2 border-t border-outline-variant/10">
                    <span className="font-body-sm text-[11px] text-on-surface">{r.category}</span>
                    <span className="font-label-sm text-[11px] text-primary font-semibold text-right">{r.pts}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Verification Log */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">history</span>
                  <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold">Recent Verification Log</h2>
                </div>
                <button className="font-label-sm text-[11px] text-primary hover:underline">View All (8)</button>
              </div>
              <div className="flex flex-col divide-y divide-outline-variant/10">
                {RECENT_VERIFICATIONS.map(v => (
                  <div key={v.name} className="flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="font-label-md text-[12px] text-on-surface font-semibold">{v.name}</div>
                      <div className="font-body-sm text-[10px] text-on-surface-variant mt-0.5">{v.ctx}</div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className={`px-1.5 py-0.5 rounded font-label-sm text-[10px] font-bold ${v.ptsCls}`}>{v.pts}</span>
                      <span className={`font-label-sm text-[10px] ${v.statusCls}`}>{v.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Honor Code FAQ */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[18px] text-secondary">help</span>
                <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold">Honor Code FAQ</h2>
              </div>
              <div className="flex flex-col gap-3">
                {HONOR_CODE_FAQS.map(f => (
                  <div key={f.q}>
                    <div className="font-label-md text-[12px] text-on-surface font-semibold mb-0.5">Q: {f.q}</div>
                    <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">A: {f.a}</p>
                  </div>
                ))}
              </div>
              <button className="mt-3 flex items-center gap-1 text-primary font-label-md text-[11px] hover:underline">
                Read Full Academic Ledger Policy Handbook
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </button>
            </div>

          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
