import { useState } from 'react';
import {
  usePendingCredentials,
  useVerifyParticipation,
} from '../hooks/useCredentials';
import { VerifyModal } from '../components/VerifyModal';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import type { Credential, Participation } from '../types';

type QueueItem =
  | { kind: 'credential';    item: Credential }
  | { kind: 'participation'; item: Participation };

// ── Dummy worklist data ──────────────────────────────────────────────────────
const WORKLIST = [
  { initials: 'TD', bg: 'bg-primary text-on-primary', name: 'Tanvi Deshmukh', roll: '3rd Yr CSE • Roll: 22CS0912', cred: 'NPTEL Elite + Gold: Deep Learning', meta: 'Score: 94% • NPTEL-24CS91SE2', pts: '+4 Pts', ptsClass: 'bg-primary/10 text-primary', autoCheck: true, waitingCo: false, action: 'Inspect', actionId: 'worklist-inspect-tanvi' },
  { initials: 'AM', bg: 'bg-tertiary text-on-tertiary', name: 'Aditya Menon',  roll: '2nd Yr ECE • Roll: 23EC0114', cred: 'Inter-College Robotics Sprint – Shaastra 1st Prize', meta: 'Requires HOD Dual Sign-off (Rule #4.2: submissions > 4 institutional credits)', pts: '+5 Pts', ptsClass: 'bg-primary/10 text-primary', autoCheck: false, waitingCo: true, action: 'Pre-Validate', actionId: 'worklist-validate-aditya' },
  { initials: 'SP', bg: 'bg-secondary text-on-secondary', name: 'Sneha Patil', roll: '2nd Yr IT • Roll: 23IT0448', cred: 'Google Cloud Certified Associate Cloud Engineer', meta: 'Credential: GCP-ACE-99410', pts: '+3 Pts', ptsClass: 'bg-primary/10 text-primary', autoCheck: true, waitingCo: false, action: 'Approve', actionId: 'worklist-approve-sneha' },
  { initials: 'DV', bg: 'bg-surface-container text-on-surface', name: 'Devansh Verma', roll: '4th Yr Mech • Roll: 21ME0302', cred: 'Formula Student Powertrain Telemetry Lead', meta: 'Faculty Mentor: Dr. K. Narayanan\nPending mentor co-signature', pts: 'View Dossier', ptsClass: 'bg-surface-container text-on-surface', autoCheck: false, waitingCo: false, action: 'View Dossier', actionId: 'worklist-view-devansh' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FacultyVerificationQueuePage() {
  const { data: credentials = [], isLoading, error, refetch } = usePendingCredentials();
  const { mutateAsync: verifyParticipationMut }= useVerifyParticipation();

  const [selected,    setSelected]    = useState<QueueItem | null>(null);
  const [activeTab,   setActiveTab]   = useState<'awaiting' | 'dual' | 'concluded'>('awaiting');
  const [remarks,     setRemarks]     = useState('e.g. Excellent score (892/1000). Highly aligned with upcoming Distributed Systems Lab research track…');

  const items: QueueItem[] = credentials.map(c => ({ kind: 'credential' as const, item: c }));

  async function handleVerifyParticipation(id: string, verdict: 'verified' | 'rejected', reason?: string) {
    await verifyParticipationMut({ id, input: { verdict, reason } });
  }

  // Dummy credential (AWS) for the main detail panel
  const DUMMY_CRED = {
    name: 'AWS Certified Solutions Architect – Associate',
    issuer: 'Amazon Web Services Training and Certification Division',
    certId: 'AWS-SAA-884920',
    issuedDate: '24-Oct-2024',
    student: 'Ananya Rao',
    uid: '22CS0841',
    year: '3rd Yr B.Tech CSE',
    cgpa: '8.9 / 10',
    classRank: '#4 of 142',
    attendance: '94.2%',
    points: '120 Pts',
    awardPts: '+3 Activity Pts',
    creditEq: '≈ 0.2 Institutional Credits',
    certScore: '892 / 1000',
    validity: 'Oct 2024 – Oct 2027',
    sha256: '0x9f4a8b72e106d8…884920',
    validationHash: '8849-20-AWS-SEC-IN',
  };

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      {/* Faculty-specific AppBar: no subtitle, identity shown inline */}
      <AppBar subtitle="Faculty Verification Portal" />

      <main className="w-full pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── Top header ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-outline-variant/10">
          <div>
            <nav className="flex items-center gap-1.5 font-label-md text-[11px] text-on-surface-variant flex-wrap">
              <span>Campus Ledger</span>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <span>Faculty Verification Portal</span>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <span className="text-on-surface font-semibold">Academic Credential Verification Queue</span>
            </nav>
            <div className="flex items-center gap-2 mt-1 font-label-sm text-[11px] text-on-surface-variant flex-wrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Dr. V. Ramanathan CSE &amp; AI-DS Evaluator • Emp #8841</span>
              <span>•</span>
              <span>Ledger Node: INVENTUM-CAMPUS-04 (Synced • ECDSA-256)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 font-label-sm text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              SLA: 18h Remaining for Term Cycle
            </span>
            <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">policy</span>
              Verification Policy Rubric
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">download</span>
              Export Audit Log (.CSV)
            </button>
            <button
              id="batch-sign-btn"
              className="px-3 py-2 rounded-lg bg-primary text-on-primary font-label-lg text-[12px] font-semibold flex items-center gap-1.5 shadow-sm hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-[15px]">bolt</span>
              Batch Auto-Sign Eligible (11)
            </button>
          </div>
        </div>

        {/* ── 4-KPI ribbon ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Queue Workload',      value: '14',    sub1: 'Pending',   sub2: '3 require review <12h', sub2Cls: 'text-error', badge: 'Critical SLA', badgeCls: 'bg-error-container text-on-error-container', icon: 'pending_actions' },
            { label: 'Accredited Volume',   value: '82',    sub1: 'Approved',  sub2: '↗18 this week', sub2Cls: 'text-emerald-700', badge: '98.4% first-pass score', badgeCls: 'bg-emerald-50 text-emerald-800', icon: 'verified' },
            { label: 'Discrepancy Loop',    value: '5',     sub1: 'Returned',  sub2: 'Clarification on seal/hash', sub2Cls: 'text-secondary', badge: '3.2% of total', badgeCls: 'bg-surface-container text-outline', icon: 'replay' },
            { label: 'Auto-Verification Engine', value: '11', sub1: 'In Batch Ready', sub2: '100% automated check score', sub2Cls: 'text-primary', badge: 'Zero-click signoff ready', badgeCls: 'bg-primary/10 text-primary', icon: 'bolt' },
          ].map(k => (
            <div key={k.label} className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col gap-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-md text-[10px] text-outline uppercase tracking-wider">{k.label}</span>
                <span className="material-symbols-outlined text-[18px] text-outline">{k.icon}</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="font-headline-lg text-[1.75rem] font-bold text-on-surface">{k.value}</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant mb-1">{k.sub1}</span>
              </div>
              <span className={`font-label-sm text-[10px] ${k.sub2Cls}`}>{k.sub2}</span>
              <span className={`mt-1 inline-flex px-1.5 py-0.5 rounded font-label-sm text-[9px] font-semibold ${k.badgeCls} w-fit`}>{k.badge}</span>
            </div>
          ))}
        </div>

        {/* ── Search + filter bar ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 mb-4">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input type="search" placeholder="Filter by student name, roll number (e.g. 22CS0841), certificate prov…"
              className="w-full h-10 pl-10 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-label-md text-[11px] hover:bg-surface-container">
              <span className="material-symbols-outlined text-[16px]">sort</span>
              Sort by: Inspection Priority / SLA Deadline
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <button className="p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20 hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px] text-outline">tune</span>
            </button>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto mb-5">
          {[
            { id: 'awaiting' as const,   label: 'Awaiting Faculty Action', count: 14, cls: 'bg-error text-on-error' },
            { id: 'dual'     as const,   label: 'Under Dual Sign-Off',     count: 2,  cls: 'bg-secondary text-on-secondary' },
            { id: 'concluded'as const,   label: 'Recently Concluded',      count: 87, cls: 'bg-surface-container text-outline' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg font-label-lg text-[12px] flex items-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-primary-container text-on-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${activeTab === tab.id ? 'bg-primary/20' : tab.cls}`}>{tab.count}</span>
            </button>
          ))}
          <span className="ml-2 text-outline font-label-sm text-[11px]">All Categories (14)</span>
          <span className="ml-2 font-label-sm text-[11px] text-on-surface">Industry Certifications (8)</span>
          <span className="ml-2 text-outline font-label-sm text-[11px]">NPTEL / Swayam (3)</span>
          <span className="ml-2 text-outline font-label-sm text-[11px]">Hackathons</span>
        </div>

        {/* ── Main 2-col grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT: Main credential detail (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">

            {/* Priority ticket label */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-error-container text-on-error-container font-label-sm text-[11px] font-bold">
                <span className="material-symbols-outlined text-[14px]">priority_high</span>
                INSPECTION PRIORITY #1
              </span>
              <span className="font-code-sm text-[11px] text-outline">Ticket #AC-2024-8849</span>
            </div>
            <p className="font-label-sm text-[11px] text-on-surface-variant -mt-2">Submitted 2 hours ago via Student Portal</p>

            {/* Student identity card */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center font-headline-sm text-[16px] font-bold text-on-primary flex-shrink-0">AR</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-headline-sm text-[15px] font-bold text-on-surface">Ananya Rao</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-[10px] font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[11px]">verified</span>Verified Student
                      </span>
                    </div>
                    <p className="font-label-sm text-[11px] text-on-surface-variant mt-0.5">3rd Yr B.Tech CSE • UID: 22CS0841</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-label-sm text-on-surface-variant">
                      <span>CGPA: {DUMMY_CRED.cgpa}</span>
                      <span>•</span>
                      <span>Attendance: {DUMMY_CRED.attendance}</span>
                      <span>•</span>
                      <span>Class Rank {DUMMY_CRED.classRank}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Current Points</div>
                  <div className="font-headline-lg text-[1.5rem] font-bold text-on-surface">{DUMMY_CRED.points}</div>
                  <div className="font-label-sm text-[10px] text-on-surface-variant">Target: 150 pts</div>
                </div>
              </div>

              {/* Credential display */}
              <div className="mt-4 pt-4 border-t border-outline-variant/10 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">cloud</span>
                    </div>
                    <div>
                      <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Industry Certification • Tier-1 Provider</div>
                    </div>
                  </div>
                  <h2 className="font-headline-md text-[18px] text-on-surface font-bold leading-tight mt-1">
                    {DUMMY_CRED.name}
                  </h2>
                  <div className="font-label-sm text-[11px] text-on-surface-variant mt-1">
                    Cert ID: {DUMMY_CRED.certId} • Score: {DUMMY_CRED.certScore} • Validity: {DUMMY_CRED.validity}
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Award Tier</span>
                  <span className="font-headline-sm text-[15px] text-primary font-bold">{DUMMY_CRED.awardPts}</span>
                  <span className="font-label-sm text-[10px] text-on-surface-variant">{DUMMY_CRED.creditEq}</span>
                </div>
              </div>
            </div>

            {/* Cryptographic Document Inspector */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">lock</span>
                  <h2 className="font-headline-sm text-[14px] text-on-surface font-bold">Cryptographic Document Inspector</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px]">
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    Credly Verify
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px]">
                    <span className="material-symbols-outlined text-[13px]">download</span>
                    Download PDF
                  </button>
                </div>
              </div>

              {/* API status */}
              <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-surface-container-low">
                <div className="flex items-center gap-2 font-label-sm text-[11px] text-on-surface-variant">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Credly API Live Connected
                </div>
                <div className="font-code-sm text-[11px] text-on-surface">SHA-256: 0x9f4a8b72e106d8…884920</div>
              </div>

              {/* PDF replica */}
              <div className="rounded-lg border border-outline-variant/10 overflow-hidden">
                <div className="bg-surface-container p-4 border-b border-outline-variant/10">
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-1">Amazon Web Services</div>
                  <div className="font-label-sm text-[11px] text-on-surface-variant">Training and Certification Division</div>
                </div>
                <div className="p-5 text-center">
                  <div className="inline-flex px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-[10px] font-bold mb-3">AUTHENTICATED</div>
                  <p className="font-body-sm text-[12px] text-on-surface-variant mb-1">THIS IS TO CERTIFY THAT</p>
                  <div className="font-headline-lg text-[1.5rem] text-on-surface font-bold mb-1">{DUMMY_CRED.student}</div>
                  <p className="font-body-sm text-[12px] text-on-surface-variant mb-3">has successfully demonstrated knowledge in architecting secure and robust applications on AWS technologies.</p>
                  <div className="font-label-md text-[12px] text-on-surface font-semibold mb-3">AWS Certified Solutions Architect – Associate</div>
                  <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-label-sm border-t border-outline-variant/10 pt-3">
                    <span>Issued: {DUMMY_CRED.issuedDate}</span>
                    <span>Validation Hash: {DUMMY_CRED.validationHash}</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                      Tamper Proof Direct Issuer API Sign
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 font-label-sm text-[10px] text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-emerald-600">security</span>
                  Cryptographic Seal Intact
                </span>
                <span>Render Resolution: 300 DPI Vector PDF Source</span>
              </div>
            </div>

            {/* Automated Audit & Anti-Tamper */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline-sm text-[14px] text-on-surface font-bold">Automated Audit &amp; Anti-Tamper Diagnostics</h2>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-label-sm text-[11px] font-bold">4 of 4 Checks Green</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: 'person_check', title: 'Enrollment Identity Match', detail: 'Matched to campus ERP records: Ananya Rao (22CS0841)', badge: '100% Match Confidence', badgeCls: 'text-emerald-700' },
                  { icon: 'copy_all',     title: 'Zero Duplicate Roll Claim',  detail: 'Searched 4,200 alumni and student claims across 5 years.', badge: 'No Collision Found',   badgeCls: 'text-emerald-700' },
                  { icon: 'grid_view',    title: 'Accreditation Grid Eligibility', detail: 'Amazon Web Services is listed on AICTE Tier-1 provider matrix.', badge: 'Eligible for 3 Credits', badgeCls: 'text-primary' },
                  { icon: 'verified_user','title': 'Cryptographic Timestamp & EXIF', detail: 'Digital PDF signature issued by Certificate Authority root.', badge: 'Authentic Cert Hash', badgeCls: 'text-emerald-700' },
                ].map(c => (
                  <div key={c.title} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">{c.icon}</span>
                      <span className="font-label-md text-[12px] text-on-surface font-semibold">{c.title}</span>
                    </div>
                    <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed mb-1">{c.detail}</p>
                    <span className={`font-label-sm text-[10px] font-bold uppercase ${c.badgeCls}`}>{c.badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evaluator Remarks */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
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
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                Reject Credential
              </button>
              <button className="px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-sm flex items-center justify-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[16px]">replay</span>
                Return with Feedback / Needs Edit
              </button>
              <button
                id="approve-credential-btn"
                onClick={() => { const qi = items[0]; if (qi) setSelected(qi); }}
                className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-sm font-semibold shadow-sm hover:bg-primary-container transition-all flex items-center gap-2 active:scale-[0.98]">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Approve &amp; Grant +3 Pts
              </button>
            </div>
            <p className="font-label-sm text-[10px] text-on-surface-variant text-center">
              Action applies Dr. Ramanathan's cryptographic institutional token ECDSA-256 Auth to the ledger. Permanent &amp; tamper-evident.
            </p>

            {/* Loading / error fallback */}
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

          {/* RIGHT SIDEBAR (4 cols) */}
          <aside className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">

            {/* Batch Sign panel */}
            <div className="bg-primary rounded-xl p-4 text-on-primary shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <div>
                  <div className="font-label-sm text-[10px] text-on-primary-container uppercase tracking-wide">Fast-Track Engine</div>
                  <div className="font-headline-sm text-[14px] font-bold">Batch Sign Verified Credentials</div>
                </div>
              </div>
              <p className="font-body-sm text-[11px] text-on-primary-container mb-4 leading-relaxed">
                11 submissions have completed 100% automated API verification and tamper validation checks. Ready for instant endorsement using Dr. Ramanathan's faculty passkey.
              </p>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-on-primary/10 mb-3">
                <div className="flex items-center gap-2 font-label-md text-[12px]">
                  <span className="material-symbols-outlined text-[16px]">key</span>
                  WebAuthn / YubiKey Loaded
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-400 text-emerald-950 font-label-sm text-[10px] font-bold">READY</span>
              </div>
              <button
                id="batch-sign-eligible-btn"
                className="w-full py-3 rounded-xl bg-on-primary/20 hover:bg-on-primary/30 text-on-primary font-label-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Batch Sign &amp; Endorse All 11 Verified (Instant)
              </button>
            </div>

            {/* Worklist Queue */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">list_alt</span>
                  <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold">Worklist Queue</h2>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">13 Remaining</span>
                </div>
                <button className="font-label-sm text-[11px] text-primary hover:underline">Select All</button>
              </div>
              <div className="flex flex-col gap-3">
                {WORKLIST.map(w => (
                  <div key={w.name} className="flex items-start gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-[11px] font-bold flex-shrink-0 ${w.bg}`}>{w.initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-[12px] text-on-surface font-semibold">{w.name}</span>
                        <span className={`px-1.5 py-0.5 rounded font-label-sm text-[10px] font-bold ${w.ptsClass}`}>{w.pts}</span>
                      </div>
                      <div className="font-label-sm text-[10px] text-on-surface-variant">{w.roll}</div>
                      <div className="font-body-sm text-[11px] text-on-surface mt-0.5 leading-snug">{w.cred}</div>
                      <div className="font-label-sm text-[10px] text-on-surface-variant mt-0.5 whitespace-pre-line">{w.meta}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {w.autoCheck && (
                          <span className="flex items-center gap-0.5 text-emerald-700 font-label-sm text-[10px]">
                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                            Auto-Checks 100%
                          </span>
                        )}
                        {w.waitingCo && (
                          <span className="flex items-center gap-0.5 text-secondary font-label-sm text-[10px]">
                            <span className="material-symbols-outlined text-[12px]">pending</span>
                            Awaiting Co-Signer
                          </span>
                        )}
                        <button id={w.actionId}
                          className={`ml-auto px-2.5 py-1 rounded-lg font-label-md text-[11px] font-semibold transition-colors ${w.action === 'Approve' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}>
                          {w.action}
                        </button>
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
              <div className="flex flex-col gap-2">
                {[
                  { title: 'Credit Conversion Formula:', desc: '15 Institutional Activity Points convert automatically to 1 Non-Major Elective Credit upon graduation audit.' },
                  { title: 'Faculty SLA Window:', desc: 'Term evaluation cycle closes every Friday 18:00 IST. Pending queue tickets auto-escalate to Dean (Academics).' },
                  { title: 'Audit Permanence:', desc: 'Every approval generates an immutable block transaction recorded on the campus Hyperledger node.' },
                ].map(r => (
                  <div key={r.title} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[14px] text-emerald-600 flex-shrink-0 mt-0.5">check_box</span>
                    <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                      <span className="font-semibold text-on-surface">{r.title}</span> {r.desc}
                    </p>
                  </div>
                ))}
              </div>
              <button className="mt-3 flex items-center gap-1 text-primary font-label-md text-[11px] hover:underline">
                View Full Autonomous Accreditation Policy
                <span className="font-label-sm text-[10px] text-outline ml-1">Rev. 2025.1</span>
              </button>
            </div>

          </aside>
        </div>
      </main>

      {/* Verify Modal */}
      {selected && (
        <VerifyModal
          item={selected.item as Credential}
          type={selected.kind}
          onClose={() => setSelected(null)}
          onVerify={selected.kind === 'participation' ? handleVerifyParticipation : undefined}
        />
      )}

      <BottomNav />
    </div>
  );
}
