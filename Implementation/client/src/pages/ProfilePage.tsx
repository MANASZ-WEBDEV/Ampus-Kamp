import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/AuthContext';
import * as authApi from '@/features/auth/api/auth.api';
import { AppBar }    from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';

// ── Dummy credential data ─────────────────────────────────────────────────────
type CredState = 'verified' | 'accepted' | 'pending' | 'action';

interface Credential {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  state: CredState;
  stateBadge: string;
  stateBadgeCls: string;
  rightBadge: string;
  rightBadgeCls: string;
  issuer: string;
  col1Label: string;
  col1Value: string;
  col2Label: string;
  col2Value: string;
  col3Label: string;
  col3Value: string;
  col3Cls?: string;
  footerLeft?: string;
  footerLeftIcon?: string;
  footerAction: string;
  // pending extras
  pendingStep?: string;
  pendingBar?: number;
  pendingNote?: string;
  pendingSubNote?: string;
  nudge?: string;
  // action extras
  actionNote?: string;
  actionDeadline?: string;
  reviewedBy?: string;
}

const CREDENTIALS: Credential[] = [
  {
    id: 'c1',
    icon: 'school',
    iconBg: 'bg-secondary-container text-on-secondary-fixed',
    name: 'NPTEL Elite + Gold: Deep Learning',
    state: 'verified',
    stateBadge: 'Verified',
    stateBadgeCls: 'text-emerald-700 bg-emerald-50',
    rightBadge: '+4 Credits Earned',
    rightBadgeCls: 'bg-primary/10 text-primary',
    issuer: 'National Programme on Technology Enhanced Learning • Ministry of Education',
    col1Label: 'Examination Score',
    col1Value: '94%',
    col2Label: 'Faculty Proctor',
    col2Value: 'Dr. Ramanathan\nDept. of AI & Data Science',
    col3Label: 'Verification Seal',
    col3Value: 'NPTEL-DL-99420-OCT24\nSigned: 18 Oct 2024',
    col3Cls: 'text-primary',
    footerLeft: 'Directly integrated into Degree Audit Ledger',
    footerLeftIcon: 'verified',
    footerAction: 'Preview Certificate',
  },
  {
    id: 'c2',
    icon: 'emoji_events',
    iconBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    name: 'Smart India Hackathon 2024 (SIH)',
    state: 'accepted',
    stateBadge: 'Verified',
    stateBadgeCls: 'text-emerald-700 bg-emerald-50',
    rightBadge: 'Team Lead • 6 Members',
    rightBadgeCls: 'bg-surface-container-high text-on-surface',
    issuer: 'Ministry of Jal Shakti Innovation Track • National Grand Finale Finalist',
    col1Label: 'Solution Developed',
    col1Value: 'HydraCore IoT Telemetry\nWater Pipeline Leak Detection',
    col2Label: 'Institutional Node',
    col2Value: 'SIH Campus SPOC\nInstitutional Portal Validation',
    col3Label: 'Audit Hash',
    col3Value: '# SIH-2024-FIN-0881\nValidated: Dec 2024',
    col3Cls: 'text-on-surface',
    footerLeft: '1st Runner Up (Hardware Division)',
    footerLeftIcon: 'military_tech',
    footerAction: 'View Certificate',
  },
  {
    id: 'c3',
    icon: 'cloud',
    iconBg: 'bg-surface-container-high text-on-surface-variant',
    name: 'AWS Certified Solutions Architect – Associate',
    state: 'pending',
    stateBadge: 'Pending Sign-off',
    stateBadgeCls: 'text-secondary bg-secondary-fixed/40',
    rightBadge: 'Queue #14 • SLA ~24h',
    rightBadgeCls: 'bg-surface-container text-on-surface-variant',
    issuer: 'Amazon Web Services • Credential ID: AWS-99201-ARC',
    col1Label: '',
    col1Value: '',
    col2Label: '',
    col2Value: '',
    col3Label: '',
    col3Value: '',
    pendingStep: 'Step 2 of 3',
    pendingBar: 66,
    pendingNote: 'Awaiting HOD Sign-off • Prof. K. V. Sharma',
    pendingSubNote: 'Uploaded 2 days ago via Credly API connector',
    nudge: 'Academic Registrar Verification Pending',
    footerAction: 'Nudge Reviewer',
  },
  {
    id: 'c4',
    icon: 'precision_manufacturing',
    iconBg: 'bg-error-container text-on-error-container',
    name: 'Inter-College Autonomous Robotics Sprint',
    state: 'action',
    stateBadge: 'Action Needed',
    stateBadgeCls: 'text-error bg-error-container/60',
    rightBadge: 'Needs Re-upload',
    rightBadgeCls: 'bg-error-container text-on-error-container',
    issuer: 'IIT Bombay Techfest Robotics Sprint • Autonomous Navigation Division',
    col1Label: '',
    col1Value: '',
    col2Label: '',
    col2Value: '',
    col3Label: '',
    col3Value: '',
    actionNote: 'Certificate stamp unreadable, please re-upload clear PDF with official organizing committee seal.',
    actionDeadline: 'Window closes in 48h',
    reviewedBy: 'Reviewed by: Prof. M. Deshmukh (Robotics Cell)',
    footerAction: 'Re-upload PDF',
  },
];

const SQUAD_MEMBERSHIPS = [
  { initials: 'A', bg: 'bg-primary text-on-primary',   name: 'AgriBotics Autonomous', role: 'Lead Embedded • Hardware Grant' },
  { initials: 'H', bg: 'bg-tertiary text-on-tertiary', name: 'HydraCore Telemetry',   role: 'Full Stack Architect • SIH Track' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user: authUser, logout } = useAuth();
  const navigate  = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing,   setIsEditing]   = useState(false);
  const [skillInput,  setSkillInput]  = useState('');
  const [toastMsg,    setToastMsg]    = useState('');
  const [credTab,     setCredTab]     = useState<'all' | 'verified' | 'pending' | 'action'>('all');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    staleTime: 60_000,
  });

  const [editState, setEditState] = useState({
    skills:       profile?.skills ?? [],
    phoneVisible: profile?.phoneVisible ?? false,
    allowInvites: profile?.allowInvites ?? true,
  });

  const updateMutation = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
      showToast('Profile updated successfully');
    },
  });

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2400);
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || editState.skills.includes(s)) return;
    setEditState(prev => ({ ...prev, skills: [...prev.skills, s] }));
    setSkillInput('');
  }

  function removeSkill(skill: string) {
    setEditState(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const dept = profile?.department;
  const deptName = typeof dept === 'object' && dept !== null ? (dept as { name: string }).name : String(dept ?? 'Computer Science & Engineering');

  const rawName  = profile?.name ?? authUser?.name ?? 'Ananya Rao';
  const initials = rawName.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const role     = profile?.role ?? authUser?.role;
  const isFaculty = role === 'faculty' || role === 'dept_head' || role === 'admin';

  const visibleCredentials = CREDENTIALS.filter(c =>
    credTab === 'all' ? true :
    credTab === 'verified' ? (c.state === 'verified' || c.state === 'accepted') :
    credTab === 'pending'  ? c.state === 'pending' :
    c.state === 'action'
  );

  // Dummy skills for display when no real skills
  const skills: { name: string; verified: boolean }[] = profile?.skills?.length
    ? profile.skills.map(s => ({ name: s, verified: true }))
    : [
        { name: 'Python',         verified: true  },
        { name: 'PyTorch',        verified: true  },
        { name: 'React Native',   verified: true  },
        { name: 'ROS2',           verified: true  },
        { name: 'Embedded C++',   verified: false },
        { name: 'Smart Contracts',verified: false },
      ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary-fixed border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle="Profile & Credentials" />

      {/* Toast */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 flex items-center gap-2 px-4 py-2 bg-inverse-surface text-inverse-on-surface rounded-full shadow-lg font-label-md text-sm ${toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <span className="material-symbols-outlined text-primary-fixed-dim text-[18px]">verified</span>
        {toastMsg}
      </div>

      <main className="w-full pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb + Action Bar ──────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4 border-b border-outline-variant/10">
          <nav className="flex items-center gap-1.5 font-label-md text-[11px] text-on-surface-variant flex-wrap">
            <span className="material-symbols-outlined text-[14px]">storage</span>
            <span>Campus Ledger</span>
            <span className="mx-0.5">/</span>
            <span>Student Portfolio Dossier</span>
            <span className="mx-0.5">/</span>
            <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary font-code-sm font-bold">
              UID: {profile?.enrollmentNo ?? authUser?.enrollmentNo ?? '22CS0841'}
            </span>
            <span className="hidden sm:flex items-center gap-1.5 ml-2 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ECDSA-256 Validated Node
            </span>
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              id="profile-share-btn"
              onClick={() => showToast('Portfolio card link copied!')}
              className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-sm flex items-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-[18px]">share</span>
              Share Card
            </button>
            <button
              id="profile-download-ledger-btn"
              className="px-3 py-2 rounded-lg bg-primary text-on-primary font-label-lg text-sm flex items-center gap-2 transition-colors shadow-sm hover:bg-primary-container">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download Academic Ledger
            </button>
          </div>
        </div>

        {/* ── 4 KPI Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Verified Credits',    value: '12',    sub: 'pts valid',          icon: 'verified_user',  extra: '75% toward Capstone Honors', extraCls: 'text-primary', bar: true },
            { label: 'Recorded Milestones', value: '14',    sub: '+3 this term',       icon: 'emoji_events',   extra: '↗ Top 8% acceleration rate',  extraCls: 'text-emerald-700', bar: false },
            { label: 'Active Squads',       value: '03',    sub: 'Incubated',          icon: 'groups',         extra: '',                              extraCls: '', bar: false, chips: ['AgriBotics', 'HydraCore', '+1'] },
            { label: 'Academic Standing',   value: '8.92',  sub: '/ 10 CGPA',         icon: 'school',         extra: '⭐ Top 5% Cohort',              extraCls: 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-semibold', bar: false },
          ].map(k => (
            <div key={k.label} className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col gap-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-md text-[10px] text-outline uppercase tracking-wider">{k.label}</span>
                <span className="material-symbols-outlined text-[18px] text-outline">{k.icon}</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="font-headline-lg text-[1.75rem] font-bold text-on-surface">{k.value}</span>
                <span className="font-label-sm text-[10px] text-on-surface-variant mb-1">{k.sub}</span>
              </div>
              {k.bar && (
                <div className="w-full h-1 bg-surface-container rounded-full mt-1">
                  <div className="h-1 bg-primary rounded-full w-3/4" />
                </div>
              )}
              {k.extra && !k.chips && (
                <span className={`font-label-sm text-[10px] mt-0.5 ${k.extraCls}`}>{k.extra}</span>
              )}
              {k.chips && (
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  {k.chips.map(c => (
                    <span key={c} className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-code-sm text-[10px]">{c}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Main 2-col Layout ───────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT SIDEBAR (3 cols) */}
          <aside className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">

            {/* Identity Card */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="relative">
                  <div className="w-20 h-20 rounded-xl bg-primary-container flex items-center justify-center font-headline-lg text-[24px] font-bold text-on-primary shadow-sm overflow-hidden">
                    {initials || <span className="material-symbols-outlined text-[32px]">person</span>}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[12px]">verified</span>
                  </div>
                </div>
                <button
                  id="edit-profile-btn"
                  onClick={() => { setEditState({ skills: profile?.skills ?? [], phoneVisible: profile?.phoneVisible ?? false, allowInvites: profile?.allowInvites ?? true }); setIsEditing(true); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-on-surface-variant hover:bg-surface-container text-[11px] font-label-md transition-colors">
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  Edit Profile
                </button>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-headline-md text-[1.25rem] text-on-surface font-bold">{rawName}</h1>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-label-sm text-[10px] font-semibold">
                    <span className="material-symbols-outlined text-[11px]">verified</span>Verified
                  </span>
                </div>
                <p className="font-label-lg text-[12px] text-primary font-semibold mt-0.5">
                  B.Tech {deptName}
                </p>
                <p className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
                  Cohort: 3rd Year • Sem VI • Roll: {profile?.enrollmentNo ?? authUser?.enrollmentNo ?? '22CS0841'}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/10">
                {[
                  { label: 'Department',      value: 'Computing & Data AI' },
                  { label: 'Lab Affiliation', value: 'Robotics & Perception Lab' },
                  { label: 'Institutional ID', value: profile?.email ?? 'a.rao@campus.ac.in' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-[11px]">
                    <span className="text-on-surface-variant font-label-md flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">
                        {r.label === 'Department' ? 'business' : r.label === 'Lab Affiliation' ? 'biotech' : 'alternate_email'}
                      </span>
                      {r.label}
                    </span>
                    <span className="font-code-sm text-on-surface font-medium truncate max-w-[120px]">{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Confidential Contact Shield */}
              <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">shield_person</span>
                    <span className="font-label-md text-[11px] text-on-surface font-semibold">Confidential Contact Shield</span>
                  </div>
                  <button
                    id="phone-privacy-toggle"
                    role="switch"
                    aria-checked={profile?.phoneVisible}
                    onClick={() => { const next = !profile?.phoneVisible; authApi.updateMe({ phoneVisible: next }).then(() => { queryClient.invalidateQueries({ queryKey: ['me'] }); showToast(next ? 'Phone visible to squad teammates' : 'Phone shielded from all peers'); }); }}
                    className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${profile?.phoneVisible ? 'bg-primary-container' : 'bg-primary'}`}>
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 mt-1 ${profile?.phoneVisible ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="font-body-sm text-[10px] text-on-surface-variant leading-relaxed">
                  Active: Phone details are hidden until you mutually join an approved hackathon or incubator squad.
                </p>
                <div className="flex items-center gap-3 text-[10px] text-outline font-code-sm">
                  <span>Visibility: Protected (Squad-only)</span>
                  <button className="text-primary hover:underline">Policy #7.1</button>
                </div>
              </div>

              {/* Logout */}
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="w-full py-2 rounded-lg bg-surface-container-low hover:bg-error-container hover:text-on-error-container text-on-surface-variant font-label-lg text-[12px] flex items-center justify-center gap-2 transition-all">
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign Out
              </button>
            </div>

            {/* Skills & Proficiencies */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
                  <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold">Skills &amp; Proficiencies</h2>
                </div>
                <button
                  id="add-skill-btn"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-primary font-label-md text-[11px] hover:underline">
                  <span className="material-symbols-outlined text-[13px]">add</span>
                  Add Skill
                </button>
              </div>
              <p className="font-body-sm text-[10px] text-on-surface-variant mb-3">
                Verified technical endorsements issued by faculty proctors and verified project commits.
              </p>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s.name}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-md text-[11px] ${
                      s.verified ? 'bg-surface-container text-on-surface' : 'bg-surface-container-low text-on-surface-variant'
                    }`}>
                    {s.name}
                    {s.verified
                      ? <span className="material-symbols-outlined text-[12px] text-primary">check_circle</span>
                      : <span className="material-symbols-outlined text-[12px] text-outline">pending</span>
                    }
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 font-label-sm text-[10px] text-on-surface-variant">
                <span>4 Verified endorsements</span>
                <span>2 in verification pipeline</span>
              </div>
            </div>

            {/* Squad Memberships */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">hub</span>
                  <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold">Squad Memberships</h2>
                </div>
                <span className="font-label-sm text-[10px] text-primary font-bold">3 Active</span>
              </div>
              <div className="flex flex-col gap-2">
                {SQUAD_MEMBERSHIPS.map(s => (
                  <button key={s.name}
                    onClick={() => navigate('/teams')}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors w-full text-left">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-label-lg text-[13px] font-bold flex-shrink-0 ${s.bg}`}>
                      {s.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-label-md text-[12px] text-on-surface font-semibold truncate">{s.name}</div>
                      <div className="font-body-sm text-[10px] text-on-surface-variant truncate">{s.role}</div>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-outline flex-shrink-0">chevron_right</span>
                  </button>
                ))}
              </div>
            </div>

          </aside>

          {/* RIGHT: Credentials Ledger (9 cols) */}
          <div className="lg:col-span-9 flex flex-col gap-4">

            {/* Ledger header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[20px] text-primary">menu_book</span>
                  <h2 className="font-headline-lg text-[1.5rem] text-on-surface font-bold tracking-tight">Engineering Credentials Ledger</h2>
                </div>
                <p className="font-body-sm text-[12px] text-on-surface-variant">
                  Tamper-evident verification audit trail for hackathons, professional credentials, and research honors.
                </p>
              </div>
              <button
                id="add-achievement-btn"
                onClick={() => navigate('/achievements/add')}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-sm shadow-sm hover:bg-primary-container transition-all active:scale-[0.98]">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Add New Achievement
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-xl shadow-sm">
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { id: 'all' as const,      label: 'All Credentials',  count: 4 },
                  { id: 'verified' as const, label: 'Verified',         count: 2 },
                  { id: 'pending' as const,  label: 'Pending Review',   count: 1 },
                  { id: 'action' as const,   label: 'Action Needed',    count: 1 },
                ].map(tab => (
                  <button
                    key={tab.id}
                    id={`cred-tab-${tab.id}`}
                    onClick={() => setCredTab(tab.id)}
                    className={`px-3 py-2 rounded-lg font-label-lg text-[12px] flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                      credTab === tab.id
                        ? 'bg-primary-container text-on-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}>
                    {tab.id === 'verified' && <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>}
                    {tab.id === 'pending'  && <span className="material-symbols-outlined text-[14px] text-secondary">pending</span>}
                    {tab.id === 'action'   && <span className="material-symbols-outlined text-[14px] text-error">error</span>}
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${credTab === tab.id ? 'bg-primary/20' : 'bg-surface-container text-outline'}`}>{tab.count}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-label-md">
                <span>Sort by:</span>
                <button className="font-semibold text-on-surface hover:text-primary transition-colors">Most Recent</button>
              </div>
            </div>

            {/* Credential cards */}
            {visibleCredentials.map(cred => (
              <article key={cred.id} className="bg-surface-container-lowest rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">

                {/* Card header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cred.iconBg}`}>
                      <span className="material-symbols-outlined text-[20px]">{cred.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-headline-sm text-[14px] text-on-surface font-bold">{cred.name}</h3>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-label-sm text-[10px] font-semibold ${cred.stateBadgeCls}`}>
                          {(cred.state === 'verified' || cred.state === 'accepted') && <span className="material-symbols-outlined text-[11px]">verified</span>}
                          {cred.state === 'pending' && <span className="material-symbols-outlined text-[11px]">pending</span>}
                          {cred.state === 'action'  && <span className="material-symbols-outlined text-[11px]">error</span>}
                          {cred.stateBadge}
                        </span>
                      </div>
                      <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">{cred.issuer}</p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-full font-label-sm text-[11px] font-semibold ${cred.rightBadgeCls}`}>
                    {cred.rightBadge}
                  </span>
                </div>

                {/* Verified/Accepted: 3-col fact grid */}
                {(cred.state === 'verified' || cred.state === 'accepted') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 py-3 border-t border-b border-outline-variant/10">
                    {[
                      { label: cred.col1Label, value: cred.col1Value },
                      { label: cred.col2Label, value: cred.col2Value },
                      { label: cred.col3Label, value: cred.col3Value },
                    ].map(col => col.label && (
                      <div key={col.label}>
                        <div className="font-label-sm text-[9px] text-outline uppercase tracking-wider">{col.label}</div>
                        <div className={`font-label-lg text-[12px] font-semibold mt-0.5 whitespace-pre-line ${col.label === cred.col1Label && cred.col1Value.includes('%') ? 'text-primary' : col.label === cred.col3Label && cred.col3Cls ? cred.col3Cls : 'text-on-surface'}`}>
                          {col.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending: progress + HOD note */}
                {cred.state === 'pending' && (
                  <div className="flex flex-col gap-3 mb-4 py-3 border-t border-outline-variant/10">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-label-md text-[12px] text-secondary font-semibold">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        {cred.pendingNote}
                      </span>
                      <span className="font-label-sm text-[11px] text-primary font-bold">{cred.pendingStep}</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container rounded-full">
                      <div className="h-2 bg-secondary rounded-full transition-all" style={{ width: `${cred.pendingBar}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-body-sm">
                      <span>{cred.pendingSubNote}</span>
                      <span>Autonomous ping scheduled in 12h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-label-sm text-[10px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        {cred.nudge}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action needed: error banner */}
                {cred.state === 'action' && (
                  <div className="flex flex-col gap-3 mb-4 py-3 border-t border-outline-variant/10">
                    <div className="bg-error-container/30 rounded-lg p-3 flex items-start gap-2">
                      <span className="material-symbols-outlined text-[18px] text-error flex-shrink-0 mt-0.5">warning</span>
                      <div>
                        <div className="font-label-md text-[12px] text-error font-bold mb-0.5">Reviewer Note from Faculty Board:</div>
                        <p className="font-body-sm text-[12px] text-on-surface italic">"{cred.actionNote}"</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant font-label-sm">{cred.reviewedBy}</span>
                      <span className="text-error font-label-sm font-semibold">{cred.actionDeadline}</span>
                    </div>
                  </div>
                )}

                {/* Card footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  {cred.footerLeft && (
                    <div className={`flex items-center gap-1.5 font-label-sm text-[11px] ${cred.state === 'accepted' ? 'text-secondary font-semibold' : 'text-primary'}`}>
                      <span className="material-symbols-outlined text-[15px]">{cred.footerLeftIcon}</span>
                      {cred.footerLeft}
                    </div>
                  )}
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      className={`px-4 py-2 rounded-lg font-label-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
                        cred.state === 'action'
                          ? 'bg-primary text-on-primary hover:bg-primary-container shadow-sm'
                          : cred.state === 'pending'
                          ? 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                          : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                      }`}>
                      {cred.state === 'action' && <span className="material-symbols-outlined text-[16px]">upload_file</span>}
                      {cred.state === 'pending' && <span className="material-symbols-outlined text-[16px]">notifications</span>}
                      {(cred.state === 'verified' || cred.state === 'accepted') && <span className="material-symbols-outlined text-[16px]">visibility</span>}
                      {cred.footerAction}
                    </button>
                    <button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {/* Ledger footer stamp */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-3 border-t border-outline-variant/10">
              <div className="flex items-center gap-2 font-label-sm text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                Official Campus Innovation Academic Ledger • Cryptographically Signed (ECDSA-256)
              </div>
              <div className="flex items-center gap-2 font-code-sm text-[10px] text-outline">
                <span>Block #18829402</span>
                <span>•</span>
                <span>Synced with Registrar</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Edit Profile</h3>
              <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {!isFaculty && (
              <div>
                <label className="font-label-lg text-label-lg text-on-surface mb-2 block">Skills</label>
                <div className="flex gap-2 mb-3">
                  <input
                    id="skill-input"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Type a skill and press Enter"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button onClick={addSkill} className="px-4 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg hover:opacity-90 active:scale-95 transition-all">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editState.skills.map(s => (
                    <div key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md">
                      <span>{s}</span>
                      <button onClick={() => removeSkill(s)} className="text-outline hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-label-lg text-label-lg text-on-surface">
                {isFaculty ? 'Allow student messages' : 'Allow team invites'}
              </span>
              <button role="switch" aria-checked={editState.allowInvites}
                onClick={() => setEditState(p => ({ ...p, allowInvites: !p.allowInvites }))}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${editState.allowInvites ? 'bg-primary-container' : 'bg-surface-container-high'}`}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-container-lowest shadow-md transition duration-200 mt-1 ${editState.allowInvites ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <button
              id="save-profile-btn"
              onClick={() => updateMutation.mutate({ skills: editState.skills, allowInvites: editState.allowInvites })}
              disabled={updateMutation.isPending}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {updateMutation.isPending
                ? <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Saving…</>
                : <><span className="material-symbols-outlined text-xl">save</span>Save Changes</>
              }
            </button>
          </div>
        </div>
      )}

      <BottomNav active="profile" />
    </div>
  );
}
