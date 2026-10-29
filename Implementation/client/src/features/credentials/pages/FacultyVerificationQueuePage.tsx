import { useState } from 'react';
import {
  usePendingCredentials,
  useVerifyParticipation,
} from '../hooks/useCredentials';
import { VerifyModal } from '../components/VerifyModal';
import { BottomNav }   from '@/components/layout/BottomNav';
import type { Credential, Participation } from '../types';

type QueueItem =
  | { kind: 'credential';    item: Credential }
  | { kind: 'participation'; item: Participation };

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const SIDENAV = [
  { icon: 'dashboard',             label: 'Dashboard',                   active: false },
  { icon: 'fact_check',            label: 'Faculty Verification Queue',  active: true,  badge: 17 },
  { icon: 'event',                 label: 'Events',                      active: false },
  { icon: 'group',                 label: 'Team Finder',                 active: false },
  { icon: 'manage_accounts',       label: 'Profile & Credentials',       active: false },
];

// ── Worklist queue entries ────────────────────────────────────────────────────
const WORKLIST = [
  {
    initials: 'TD', bg: 'bg-primary text-on-primary',
    name: 'Tanvi Deshmukh', roll: '3rd Yr CSE • Roll: 22CS0912',
    cred: 'NPTEL Elite + Gold: Deep Learning',
    meta: 'Score: 94% • NPTEL-24CS91SE2',
    pts: '+4 Pts', ptsCls: 'bg-primary/10 text-primary',
    autoCheck: true, waitingCo: false,
    actions: [
      { label: 'Inspect', id: 'wl-inspect-td', primary: false },
      { label: 'Approve', id: 'wl-approve-td', primary: true  },
    ],
  },
  {
    initials: 'AM', bg: 'bg-tertiary text-on-tertiary',
    name: 'Aditya Menon',  roll: '2nd Yr ECE • Roll: 23EC0114',
    cred: 'Inter-College Robotics Sprint – Shaastra 1st Prize',
    meta: 'Requires HOD Dual Sign-off (Rule #4.2: submissions > 4 institutional credits)',
    pts: '+5 Pts', ptsCls: 'bg-primary/10 text-primary',
    autoCheck: false, waitingCo: true,
    actions: [
      { label: 'Pre-Validate', id: 'wl-prevalidate-am', primary: false },
    ],
  },
  {
    initials: 'SP', bg: 'bg-secondary text-on-secondary',
    name: 'Sneha Patil', roll: '2nd Yr IT • Roll: 23IT0448',
    cred: 'Google Cloud Certified Associate Cloud Engineer',
    meta: 'Credential: GCP-ACE-99410',
    pts: '+3 Pts', ptsCls: 'bg-primary/10 text-primary',
    autoCheck: true, waitingCo: false,
    actions: [
      { label: 'Inspect', id: 'wl-inspect-sp', primary: false },
      { label: 'Approve', id: 'wl-approve-sp', primary: true  },
    ],
  },
  {
    initials: 'DV', bg: 'bg-surface-container text-on-surface',
    name: 'Devansh Verma', roll: '4th Yr Mech • Roll: 21ME0302',
    cred: 'Formula Student Powertrain Telemetry Lead',
    meta: 'Faculty Mentor: Dr. K. Narayanan\nPending mentor co-signature',
    pts: '+3 Pts', ptsCls: 'bg-primary/10 text-primary',
    autoCheck: false, waitingCo: false,
    actions: [
      { label: 'View Dossier', id: 'wl-dossier-dv', primary: false },
    ],
  },
];

// ── Anti-tamper checks ────────────────────────────────────────────────────────
const AUDIT_CHECKS = [
  { icon: 'person_check',  title: 'Enrollment Identity Match',         detail: 'Matched to campus ERP records: Ananya Rao (22CS0841)', badge: '100% MATCH CONFIDENCE',  badgeCls: 'text-emerald-700 uppercase' },
  { icon: 'copy_all',      title: 'Zero Duplicate Roll Claim',         detail: 'Searched 4,200 alumni and student claims across 5 years.', badge: 'NO COLLISION FOUND',     badgeCls: 'text-emerald-700 uppercase' },
  { icon: 'grid_view',     title: 'Accreditation Grid Eligibility',    detail: 'Amazon Web Services is listed on AICTE Tier-1 provider matrix.', badge: 'ELIGIBLE FOR 3 CREDITS', badgeCls: 'text-primary uppercase'     },
  { icon: 'verified_user', title: 'Cryptographic Timestamp & EXIF',   detail: 'Digital PDF signature issued by Certificate Authority root.', badge: 'AUTHENTIC CERT HASH',    badgeCls: 'text-emerald-700 uppercase' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FacultyVerificationQueuePage() {
  const { data: credentials = [], isLoading, error, refetch } = usePendingCredentials();
  const { mutateAsync: verifyParticipationMut } = useVerifyParticipation();

  const [selected,  setSelected]  = useState<QueueItem | null>(null);
  const [activeTab, setActiveTab] = useState<'awaiting' | 'dual' | 'concluded'>('awaiting');
  const [remarks,   setRemarks]   = useState('e.g. Excellent score (892/1000). Highly aligned with upcoming Distributed Systems Lab research track…');

  const items: QueueItem[] = credentials.map(c => ({ kind: 'credential' as const, item: c }));

  async function handleVerifyParticipation(id: string, verdict: 'verified' | 'rejected', reason?: string) {
    await verifyParticipationMut({ id, input: { verdict, reason } });
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased flex flex-col">

      {/* ── Top navbar ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest border-b border-outline-variant/10 h-14 flex items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 min-w-[180px]">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">school</span>
          </div>
          <div>
            <div className="font-label-lg text-[13px] text-on-surface font-bold leading-none">INVENTUM</div>
            <div className="font-label-sm text-[9px] text-on-surface-variant tracking-wide uppercase">Faculty Portal</div>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input type="search" placeholder="Search projects, teams, research dossiers, patent tracks…"
              className="w-full h-9 pl-10 pr-4 rounded-lg bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 ml-auto">
          <button className="relative p-2 rounded-lg hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error border border-surface-container-lowest" />
          </button>
          <button className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/20">
            <div className="text-right">
              <div className="font-label-md text-[12px] text-on-surface font-semibold">Dr. Aris Thorne</div>
              <div className="font-label-sm text-[10px] text-on-surface-variant">CS & Robotics Fellow</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-[12px] font-bold">AT</div>
          </div>
        </div>
      </header>

      {/* ── Body: left sidebar + main ───────────────────────────────────────── */}
      <div className="flex pt-14 min-h-screen">

        {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-[200px] flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant/10 fixed top-14 bottom-0 left-0 z-40">

          {/* Status pill */}
          <div className="px-4 pt-4 pb-3 border-b border-outline-variant/10">
            <div className="flex items-center gap-2 font-label-sm text-[11px] text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-700">Review Board Active</span>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
            {SIDENAV.map(item => (
              <button key={item.label}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left font-label-md text-[12px] transition-all ${
                  item.active
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}>
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${item.active ? 'bg-on-primary/20 text-on-primary' : 'bg-error-container text-on-error-container'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Cycle cutoff timer */}
          <div className="mx-3 mb-4 p-3 rounded-xl bg-surface-container border border-outline-variant/10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="material-symbols-outlined text-[14px] text-secondary">timer</span>
              <span className="font-label-sm text-[9px] text-outline uppercase tracking-wider">Cycle Cutoff</span>
            </div>
            <div className="font-headline-lg text-[1.5rem] font-bold text-on-surface leading-none">4d : 18h : 22m</div>
            <div className="font-label-sm text-[10px] text-on-surface-variant mt-1">Spring Seed Pitch Gate</div>
            <div className="flex items-center gap-1 mt-2 font-code-sm text-[10px] text-outline">
              <span className="material-symbols-outlined text-[12px]">lock</span>
              Encrypted V2.4 &nbsp;·&nbsp; CAMPUS-NET
            </div>
          </div>
        </aside>

        {/* ── Main content (offset by sidebar) ──────────────────────────────── */}
        <main className="flex-1 lg:ml-[200px] pb-24 lg:pb-8">

          {/* ── Page header / breadcrumb strip ──────────────────────────────── */}
          <div className="border-b border-outline-variant/10 px-6 py-3">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 font-label-md text-[11px] text-on-surface-variant flex-wrap mb-1.5">
              <span>Campus Ledger</span>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <span>Faculty Verification Portal</span>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <span className="text-on-surface font-semibold">Academic Credential Verification Queue</span>
            </nav>
            {/* Faculty identity row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3 flex-wrap text-[11px] font-label-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Dr. V. Ramanathan&nbsp; CSE &amp; AI-DS Evaluator • Emp #8841
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[12px]">storage</span>
                  Ledger Node: INVENTUM-CAMPUS-04 (Synced • ECDSA-256)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px]">
                  <span className="material-symbols-outlined text-[12px]">timer</span>
                  SLA: 18h Remaining for Term Cycle
                </span>
              </div>
              {/* Header action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] transition-colors">
                  <span className="material-symbols-outlined text-[14px]">policy</span>
                  Verification Policy Rubric
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] transition-colors">
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  Export Audit Log (.CSV)
                </button>
                <button id="batch-sign-btn"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-lg text-[12px] font-semibold shadow-sm hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined text-[15px]">bolt</span>
                  Batch Auto-Sign Eligible (11)
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex flex-col gap-4">

            {/* ── 4-KPI ribbon ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Queue Workload',        value: '14',  unit: 'Pending',
                  sub1: '3 require', sub1Cls: 'text-error font-semibold', sub1Icon: 'warning',
                  sub2: 'review <12h', sub3: 'Critical SLA', sub3Cls: 'text-error',
                  icon: 'pending_actions',
                },
                {
                  label: 'Accredited Volume',     value: '82',  unit: 'Approved',
                  sub1: '↗18 this', sub1Cls: 'text-emerald-700', sub1Icon: '',
                  sub2: 'week', sub3: '98.4% first-pass score', sub3Cls: 'text-emerald-700',
                  icon: 'verified',
                },
                {
                  label: 'Discrepancy Loop',      value: '5',   unit: 'Returned',
                  sub1: 'Clarification on', sub1Cls: 'text-on-surface-variant', sub1Icon: '',
                  sub2: 'seal/hash', sub3: '3.2% of total', sub3Cls: 'text-on-surface-variant',
                  icon: 'replay',
                },
                {
                  label: 'Auto-Verification Engine', value: '11', unit: 'In Batch Ready',
                  sub1: '100%', sub1Cls: 'text-primary', sub1Icon: '',
                  sub2: 'automated check score', sub3: 'Zero-click signoff ready', sub3Cls: 'text-primary font-semibold',
                  icon: 'bolt', highlight: true,
                },
              ].map(k => (
                <div key={k.label} className={`rounded-xl p-4 shadow-sm flex flex-col gap-1 ${k.highlight ? 'bg-primary/5 border border-primary/10' : 'bg-surface-container-lowest'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">{k.label}</span>
                    <span className="material-symbols-outlined text-[18px] text-outline">{k.icon}</span>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <span className="font-headline-lg text-[1.75rem] font-bold text-on-surface leading-none">{k.value}</span>
                    <span className="font-label-sm text-[11px] text-on-surface-variant mb-0.5">{k.unit}</span>
                  </div>
                  <div className="font-label-sm text-[10px] mt-0.5">
                    <span className={k.sub1Cls}>
                      {k.sub1Icon && <span className="material-symbols-outlined text-[11px] align-middle mr-0.5">{k.sub1Icon}</span>}
                      {k.sub1}
                    </span>
                    {' '}{k.sub2}
                  </div>
                  <span className={`font-label-sm text-[10px] ${k.sub3Cls}`}>{k.sub3}</span>
                </div>
              ))}
            </div>

            {/* ── Search + filter bar ───────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input type="search"
                  placeholder="Filter by student name, roll number (e.g. 22CS0841), certificate prov…"
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-label-md text-[11px] hover:bg-surface-container whitespace-nowrap">
                <span className="material-symbols-outlined text-[16px]">sort</span>
                Sort by: Inspection Priority / SLA Deadline
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
              <button className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 hover:bg-surface-container">
                <span className="material-symbols-outlined text-[18px] text-outline">tune</span>
              </button>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'awaiting'  as const, label: 'Awaiting Faculty Action', count: 14, badgeCls: 'bg-error text-on-error' },
                { id: 'dual'      as const, label: 'Under Dual Sign-Off',     count: 2,  badgeCls: 'bg-secondary text-on-secondary' },
                { id: 'concluded' as const, label: 'Recently Concluded',      count: 87, badgeCls: 'bg-surface-container text-outline' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-label-lg text-[12px] whitespace-nowrap transition-colors ${
                    activeTab === tab.id ? 'bg-primary-container text-on-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}>
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-primary/20 text-on-primary' : tab.badgeCls}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
              <span className="ml-1 text-outline font-label-sm text-[11px] whitespace-nowrap">All Categories (14)</span>
              <span className="ml-2 font-label-sm text-[11px] text-on-surface whitespace-nowrap">Industry Certifications (8)</span>
              <span className="ml-2 text-outline font-label-sm text-[11px] whitespace-nowrap">NPTEL / Swayam (3)</span>
              <span className="ml-2 text-outline font-label-sm text-[11px] whitespace-nowrap">Hackathon</span>
            </div>

            {/* ── 2-col content grid ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

              {/* ════ LEFT: Credential detail (8 cols) ═════════════════════ */}
              <div className="lg:col-span-8 flex flex-col gap-4">

                {/* Priority label */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-error-container text-on-error-container font-label-sm text-[11px] font-bold">
                    <span className="material-symbols-outlined text-[14px]">priority_high</span>
                    INSPECTION PRIORITY #1
                  </span>
                  <span className="font-code-sm text-[11px] text-outline">Ticket #AC-2024-8849</span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">Submitted 2 hours ago via Student Portal</span>
                </div>

                {/* Student identity card */}
                <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary-container flex items-center justify-center font-headline-sm text-[16px] font-bold text-on-primary flex-shrink-0">
                        AR
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-headline-sm text-[15px] font-bold text-on-surface">Ananya Rao</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-[10px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">verified</span>Verified Student
                          </span>
                        </div>
                        <p className="font-label-sm text-[11px] text-on-surface-variant mt-0.5">3rd Yr B.Tech CSE • UID: 22CS0841</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] font-label-sm text-on-surface-variant flex-wrap">
                          <span>CGPA: 8.9 / 10.0</span>
                          <span>•</span>
                          <span>Attendance: 94.2%</span>
                          <span>•</span>
                          <span>Class Rank #4 of 142</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Current Points</div>
                      <div className="font-headline-lg text-[1.625rem] font-bold text-on-surface">120 Pts</div>
                      <div className="font-label-sm text-[10px] text-on-surface-variant">Target: 150 Pts</div>
                    </div>
                  </div>

                  {/* Credential block */}
                  <div className="mt-4 pt-4 border-t border-outline-variant/10 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">cloud</span>
                        </div>
                        <div>
                          <div className="font-label-sm text-[9px] text-outline uppercase tracking-wider">Industry Certification &nbsp;·&nbsp; Tier-1 Provider</div>
                        </div>
                      </div>
                      <h2 className="font-headline-md text-[18px] text-on-surface font-bold leading-tight">
                        AWS Certified Solutions Architect – Associate
                      </h2>
                      <div className="font-label-sm text-[11px] text-on-surface-variant mt-1">
                        Cert ID: AWS-SAA-884920 &nbsp;·&nbsp; Score: 892 / 1000 &nbsp;·&nbsp; Validity: Oct 2024 – Oct 2027
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Award Tier</span>
                      <span className="font-headline-sm text-[15px] text-primary font-bold">+3 Activity Pts</span>
                      <span className="font-label-sm text-[10px] text-on-surface-variant">≈ 0.2 Institutional Credits</span>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Document Inspector */}
                <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/10">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-secondary">lock</span>
                      <h2 className="font-headline-sm text-[14px] text-on-surface font-bold">Cryptographic Document Inspector</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] transition-colors">
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>Credly Verify
                      </button>
                      <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] transition-colors">
                        <span className="material-symbols-outlined text-[13px]">download</span>Download PDF
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-4 flex flex-col gap-3">
                    {/* API status */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
                      <span className="flex items-center gap-2 font-label-sm text-[11px] text-on-surface-variant">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Credly API Live Connected
                      </span>
                      <span className="font-code-sm text-[11px] text-on-surface">SHA-256: 0x9f4a8b72e106d8…884920</span>
                    </div>

                    {/* PDF replica */}
                    <div className="rounded-lg border border-outline-variant/10 overflow-hidden">
                      <div className="bg-surface-container px-4 py-3 flex items-center justify-between border-b border-outline-variant/10">
                        <div>
                          <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Amazon Web Services</div>
                          <div className="font-label-sm text-[11px] text-on-surface-variant">Training and Certification Division</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-[10px] font-bold">AUTHENTICATED</span>
                      </div>
                      <div className="p-5 text-center">
                        <p className="font-body-sm text-[12px] text-on-surface-variant mb-1">THIS IS TO CERTIFY THAT</p>
                        <div className="font-headline-lg text-[1.5rem] text-on-surface font-bold mb-1">Ananya Rao</div>
                        <p className="font-body-sm text-[12px] text-on-surface-variant mb-4">
                          has successfully demonstrated knowledge in architecting secure and robust applications on AWS technologies.
                        </p>
                        <div className="font-label-md text-[12px] text-on-surface font-semibold mb-4">AWS Certified Solutions Architect – Associate</div>
                        <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-label-sm border-t border-outline-variant/10 pt-3 flex-wrap gap-2">
                          <span>Issued: 24-Oct-2024</span>
                          <span>Validation Hash: 8849-20-AWS-SEC-IN</span>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                            Tamper Proof Direct Issuer API Sign
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-surface-container-low border-t border-outline-variant/10 flex items-center justify-between text-[10px] font-label-sm text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-emerald-600">security</span>Cryptographic Seal Intact
                        </span>
                        <span>Render Resolution: 300 DPI Vector PDF Source</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Automated Audit & Anti-Tamper Diagnostics */}
                <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/10">
                    <h2 className="font-headline-sm text-[14px] text-on-surface font-bold">Automated Audit &amp; Anti-Tamper Diagnostics</h2>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-label-sm text-[11px] font-bold">4 of 4 Checks Green</span>
                  </div>
                  <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AUDIT_CHECKS.map(c => (
                      <div key={c.title} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-[16px] text-emerald-600">{c.icon}</span>
                          <span className="font-label-md text-[12px] text-on-surface font-semibold">{c.title}</span>
                        </div>
                        <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed mb-1">{c.detail}</p>
                        <span className={`font-label-sm text-[10px] font-bold ${c.badgeCls}`}>{c.badge}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evaluator Remarks */}
                <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="eval-remarks" className="font-label-md text-[13px] text-on-surface font-semibold">Evaluator Remarks</label>
                    <span className="font-label-sm text-[10px] text-outline">Max 300 chars</span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant mb-2">Optional notes added to student's verifiable credential record</p>
                  <textarea id="eval-remarks" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-3 border-t border-outline-variant/10">
                  <button className="px-4 py-2.5 rounded-lg bg-error-container hover:bg-error/10 text-error font-label-lg text-sm flex items-center justify-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">cancel</span>Reject Credential
                  </button>
                  <button className="px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-sm flex items-center justify-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">replay</span>Return with Feedback / Needs Edit
                  </button>
                  <button id="approve-credential-btn"
                    onClick={() => { const qi = items[0]; if (qi) setSelected(qi); }}
                    className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-[0.98]">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    Approve &amp; Grant +3 Pts
                  </button>
                </div>
                <p className="font-label-sm text-[10px] text-on-surface-variant text-center -mt-2">
                  Action applies Dr. Ramanathan's cryptographic institutional token ECDSA-256 Auth to the ledger. Permanent &amp; tamper-evident.
                </p>

                {/* API loading / error states */}
                {isLoading && (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-surface-container animate-pulse" />)}
                  </div>
                )}
                {error && (
                  <div className="p-4 rounded-xl bg-error-container text-on-error-container text-sm flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                    <div>
                      <p className="font-semibold">Failed to load queue</p>
                      <button onClick={() => refetch()} className="mt-1 underline text-xs">Retry</button>
                    </div>
                  </div>
                )}
              </div>

              {/* ════ RIGHT SIDEBAR (4 cols) ════════════════════════════════ */}
              <aside className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">

                {/* Fast-Track / Batch Sign */}
                <div className="bg-primary rounded-xl p-4 shadow-sm text-on-primary">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-on-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                    </div>
                    <div>
                      <div className="font-label-sm text-[9px] text-on-primary/60 uppercase tracking-widest">Fast-Track Engine</div>
                      <div className="font-headline-sm text-[14px] font-bold">Batch Sign Verified Credentials</div>
                    </div>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-primary/80 mb-4 leading-relaxed">
                    11 submissions have completed 100% automated API verification and tamper validation checks. Ready for
                    instant endorsement using Dr. Ramanathan's faculty passkey.
                  </p>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-on-primary/10 mb-3">
                    <div className="flex items-center gap-2 font-label-md text-[12px]">
                      <span className="material-symbols-outlined text-[15px]">key</span>WebAuthn / YubiKey Loaded
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-400 text-emerald-950 font-label-sm text-[10px] font-bold">READY</span>
                  </div>
                  <button id="batch-sign-eligible-btn"
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-label-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-colors">
                    Batch Sign &amp; Endorse All 11 Verified (Instant)
                  </button>
                </div>

                {/* Worklist Queue */}
                <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold">Worklist Queue</h2>
                      <span className="font-label-sm text-[11px] text-on-surface-variant">13 Remaining</span>
                    </div>
                    <button className="font-label-sm text-[11px] text-primary hover:underline">Select All</button>
                  </div>
                  <div className="flex flex-col divide-y divide-outline-variant/10">
                    {WORKLIST.map(w => (
                      <div key={w.name} className="flex items-start gap-2.5 py-3 first:pt-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-[11px] font-bold flex-shrink-0 ${w.bg}`}>
                          {w.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-label-md text-[12px] text-on-surface font-semibold">{w.name}</span>
                            <span className={`px-1.5 py-0.5 rounded font-label-sm text-[10px] font-bold flex-shrink-0 ${w.ptsCls}`}>{w.pts}</span>
                          </div>
                          <div className="font-label-sm text-[10px] text-on-surface-variant">{w.roll}</div>
                          <div className="font-body-sm text-[11px] text-on-surface mt-0.5 leading-snug">{w.cred}</div>
                          <div className="font-label-sm text-[10px] text-on-surface-variant mt-0.5 whitespace-pre-line">{w.meta}</div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {w.autoCheck && (
                              <span className="flex items-center gap-0.5 text-emerald-700 font-label-sm text-[10px]">
                                <span className="material-symbols-outlined text-[12px]">check_circle</span>Auto-Checks 100%
                              </span>
                            )}
                            {w.waitingCo && (
                              <span className="flex items-center gap-0.5 text-secondary font-label-sm text-[10px]">
                                <span className="material-symbols-outlined text-[12px]">pending</span>Awaiting Co-Signer
                              </span>
                            )}
                            <div className="ml-auto flex items-center gap-1">
                              {w.actions.map(a => (
                                <button key={a.id} id={a.id}
                                  className={`px-2.5 py-1 rounded-lg font-label-md text-[11px] font-semibold transition-colors ${
                                    a.primary ? 'bg-primary text-on-primary hover:bg-primary/90' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                                  }`}>
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="mt-3 w-full text-center font-label-md text-[11px] text-primary hover:underline">
                    View All Remaining 10 Tickets ∨
                  </button>
                </div>

                {/* Institutional Regulations */}
                <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[18px] text-secondary">gavel</span>
                    <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold">Institutional Regulations (2025)</h2>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { title: 'Credit Conversion Formula:',   desc: '15 Institutional Activity Points convert automatically to 1 Non-Major Elective Credit upon graduation audit.' },
                      { title: 'Faculty SLA Window:',          desc: 'Term evaluation cycle closes every Friday 18:00 IST. Pending queue tickets auto-escalate to Dean (Academics).' },
                      { title: 'Audit Permanence:',            desc: 'Every approval generates an immutable block transaction recorded on the campus Hyperledger node.'               },
                    ].map(r => (
                      <div key={r.title} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600 flex-shrink-0 mt-0.5">check_box</span>
                        <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                          <span className="font-semibold text-on-surface">{r.title}</span> {r.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button className="mt-3 flex items-center gap-1.5 text-primary font-label-md text-[11px] hover:underline">
                    View Full Autonomous Accreditation Policy
                    <span className="font-label-sm text-[10px] text-outline">Rev. 2025.1</span>
                  </button>
                </div>

              </aside>
            </div>
          </div>
        </main>
      </div>

      {/* Verify Modal */}
      {selected && (
        <VerifyModal
          item={selected.item as Credential}
          type={selected.kind}
          onClose={() => setSelected(null)}
          onVerify={selected.kind === 'participation' ? handleVerifyParticipation : undefined}
        />
      )}

      {/* Bottom nav (mobile) */}
      <BottomNav />
    </div>
  );
}
