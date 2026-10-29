import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Static data ───────────────────────────────────────────────────────────────

const SIDENAV = [
  { icon: 'dashboard',       label: 'Admin Overview',           active: true  },
  { icon: 'compare',         label: 'Department Comparison',    active: false },
  { icon: 'verified_user',   label: 'NAAC & NIRF Vault',        active: false },
  { icon: 'bar_chart',       label: 'Activity Points Audit',    active: false },
  { icon: 'task_alt',        label: 'Approvals & Compliance',   active: false },
  { icon: 'admin_panel_settings', label: 'Governance & Access', active: false },
  { icon: 'description',     label: 'System Logs & Reports',    active: false },
];

type TrendDir = 'up' | 'down' | 'flat';

interface DeptRow {
  rank: number;
  trend: TrendDir;
  name: string;
  code: string;
  codeCls: string;
  hod: string;
  enrolled: number;
  partRate: string;
  partAct: number;
  barPct: number;
  barColor: string;
  certs: number;
  certsNote: string;
  actPts: string;
  actNote: string;
  nirf: number;
  nirfAlert?: boolean;
  diagnostic: 'good' | 'warn' | 'bad';
}

const DEPT_ROWS: DeptRow[] = [
  { rank: 1, trend: 'up',   name: 'Computer Science & Engineering',      code: 'CSE',  codeCls: 'bg-primary/10 text-primary',     hod: 'HOD: Prof. S. Ranganathan',  enrolled: 820, partRate: '74.6%', partAct: 612, barPct: 74,  barColor: 'bg-emerald-500', certs: 482, certsNote: '58.8 / 100 stud',  actPts: '1,840 pts', actNote: '224.4 / 100 stud', nirf: 96.4, diagnostic: 'good'                 },
  { rank: 2, trend: 'up',   name: 'Electronics & Communication Eng.',     code: 'ECE',  codeCls: 'bg-teal-50 text-teal-700',       hod: 'HOD: Dr. K. Radhakrishnan',  enrolled: 689, partRate: '71.2%', partAct: 484, barPct: 71,  barColor: 'bg-emerald-500', certs: 378, certsNote: '55.6 / 100 stud',  actPts: '1,560 pts', actNote: '229.4 / 100 stud', nirf: 92.8, diagnostic: 'good'                 },
  { rank: 3, trend: 'down', name: 'Artificial Intelligence & Data Science', code: 'AI & DS', codeCls: 'bg-purple-50 text-purple-700', hod: 'HOD: Dr. Shalini Verma',     enrolled: 420, partRate: '76.2%', partAct: 320, barPct: 76,  barColor: 'bg-amber-500',   certs: 264, certsNote: '62.9 / 100 stud',  actPts: '1,190 pts', actNote: '283.3 / 100 stud', nirf: 91.5, diagnostic: 'warn'                 },
  { rank: 4, trend: 'flat', name: 'Information Technology',               code: 'IT',   codeCls: 'bg-sky-50 text-sky-700',         hod: 'HOD: Prof. Rajesh Gupta',    enrolled: 608, partRate: '68.5%', partAct: 411, barPct: 68,  barColor: 'bg-emerald-500', certs: 318, certsNote: '51.7 / 100 stud',  actPts: '1,320 pts', actNote: '220.0 / 100 stud', nirf: 86.2, diagnostic: 'good'                 },
  { rank: 5, trend: 'up',   name: 'Mechanical & Mechatronics',            code: 'MECH', codeCls: 'bg-orange-50 text-orange-700',   hod: 'HOD: Dr. Arvind Joshi',      enrolled: 548, partRate: '56.4%', partAct: 305, barPct: 56,  barColor: 'bg-amber-500',   certs: 188, certsNote: '34.8 / 100 stud',  actPts: '780 pts',   actNote: '144.4 / 100 stud', nirf: 74.0, diagnostic: 'good'                 },
  { rank: 6, trend: 'down', name: 'Electrical & Electronics Eng.',         code: 'EEE',  codeCls: 'bg-red-50 text-red-700',         hod: 'HOD: Dr. M. Sundaram',       enrolled: 368, partRate: '52.8%', partAct: 190, barPct: 53,  barColor: 'bg-error',       certs: 120, certsNote: '33.3 / 100 stud',  actPts: '430 pts',   actNote: '119.4 / 100 stud', nirf: 69.5, diagnostic: 'bad', nirfAlert: true },
];

const ALGO_WEIGHTS = [
  { weight: '40%', icon: 'workspace_premium', title: 'Verified Credentials',    desc: 'Per student volume. NPTEL Elite & AWS/GCP Tier-1 weighted at 2.0x multiple.', cap: 'Cap: 40.0 pts'  },
  { weight: '30%', icon: 'groups',            title: 'Cohort Participation',     desc: 'Percentage of enrolled students holding at least one verified milestone.',      cap: 'Cap: 30.0 pts'  },
  { weight: '20%', icon: 'emoji_events',      title: 'Competitive Podiums',      desc: 'Smart India Hackathon, SAE BAJA, and state innovation finalists.',               cap: 'Cap: 20.0 pts'  },
  { weight: '10%', icon: 'timer',             title: 'Faculty SLA Compliance',   desc: 'Turnaround window under 24 hours from student submission to review.',            cap: 'Cap: 10.0 pts'  },
];

// ── TrendArrow helper ─────────────────────────────────────────────────────────
function TrendArrow({ dir }: { dir: TrendDir }) {
  if (dir === 'up')   return <span className="material-symbols-outlined text-[14px] text-emerald-600">arrow_upward</span>;
  if (dir === 'down') return <span className="material-symbols-outlined text-[14px] text-error">arrow_downward</span>;
  return <span className="font-label-sm text-[12px] text-outline">—</span>;
}

// ── DiagnosticBadge helper ────────────────────────────────────────────────────
function DiagnosticBadge({ score, type, alert }: { score: number; type: DeptRow['diagnostic']; alert?: boolean }) {
  const base = type === 'good'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : type === 'warn'
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-error-container border-error/30 text-on-error-container';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[12px] font-bold ${base}`}>
      {alert && <span className="material-symbols-outlined text-[13px]">warning</span>}
      {score.toFixed(1)}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CollegeLeaderboardPage() {
  const navigate = useNavigate();
  const [activeMetric, setActiveMetric] = useState<'participation' | 'certs' | 'points'>('participation');
  const [algoOpen, setAlgoOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased flex">

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-[200px] flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant/10 fixed top-0 left-0 h-full z-40 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-label-lg text-[10px] font-black text-on-primary">CIP</span>
            </div>
            <div>
              <div className="font-label-lg text-[12px] font-bold text-on-surface leading-none">CIP Portal</div>
              <div className="font-label-sm text-[9px] text-outline uppercase tracking-wider">Institutional Admin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {SIDENAV.map(item => (
            <button key={item.label}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left font-label-md text-[12px] transition-all ${
                item.active
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}>
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              <span className="flex-1 leading-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom accreditation status */}
        <div className="px-4 py-3 border-t border-outline-variant/10">
          <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-1">Accreditation Cycle</div>
          <div className="flex items-center gap-1.5">
            <span className="font-label-md text-[12px] text-primary font-bold">CYCLE-4 • PRE-SUBMIT</span>
            <span className="material-symbols-outlined text-[14px] text-secondary">flag</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 ml-[200px] flex flex-col">

        {/* ── Top navbar ──────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-surface-container-lowest border-b border-outline-variant/10 h-14 flex items-center px-6 gap-4">
          {/* Cycle selector */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[12px] transition-colors flex-shrink-0">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            AY 2024-2025 (Active Cycle)
            <span className="material-symbols-outlined text-[15px]">expand_more</span>
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[17px]">search</span>
              <input type="search" placeholder="Search departments, faculty IDs, audits…"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-lg hover:bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error border-2 border-surface-container-lowest" />
            </button>
            <button className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">help_outline</span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/20">
              <div className="text-right">
                <div className="font-label-md text-[12px] text-on-surface font-semibold leading-none">Dr. Aris Thorne</div>
                <div className="font-label-sm text-[10px] text-on-surface-variant">Vice Chancellor & Principal</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-[12px] font-bold">AT</div>
            </div>
          </div>
        </header>

        {/* ── Page body ───────────────────────────────────────────────────── */}
        <main className="flex-1 px-6 py-5 pb-10 flex flex-col gap-5">

          {/* ── Page hero ─────────────────────────────────────────────────── */}
          <div>
            {/* Breadcrumb / status tags */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Accreditation Telemetry • Cycle-4 Active
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-[11px]">NAAC SSR</span>
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-[11px]">NIRF 2026</span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div>
                <h1 className="font-headline-xl text-[1.875rem] font-bold text-on-surface leading-tight mb-2">
                  Institutional Accreditation &amp; Department<br />Rankings
                </h1>
                <p className="font-body-md text-sm text-on-surface-variant max-w-xl leading-relaxed">
                  Campus-wide benchmarking and accreditation readiness across engineering departments.
                  Real-time telemetry mapped strictly to NAAC Criteria 5.3 and NIRF Student Progression metrics.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[12px] transition-colors">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  Schedule Dean Briefing
                </button>
                <button id="download-audit-btn"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-lg text-[12px] font-semibold shadow-sm hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download Audit Report (.XLSX &amp; .PDF)
                </button>
              </div>
            </div>

            {/* Metric toggle + cohort selector */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="flex items-center gap-1 bg-surface-container rounded-xl p-1">
                {[
                  { id: 'participation' as const, label: 'Participation Rate (%)' },
                  { id: 'certs'         as const, label: 'Certificates per 100 Students' },
                  { id: 'points'        as const, label: 'Activity Points per 100 Students' },
                ].map(m => (
                  <button key={m.id} onClick={() => setActiveMetric(m.id)}
                    className={`px-3 py-1.5 rounded-lg font-label-md text-[11px] transition-all ${
                      activeMetric === m.id ? 'bg-primary text-on-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-on-surface font-label-md text-[11px]">
                <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                AY 2025-26 (Full Year)
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-on-surface font-label-md text-[11px]">
                <span className="material-symbols-outlined text-[15px]">groups</span>
                All Cohorts (2nd - 4th Yr)
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>
              <div className="flex items-center gap-1.5 font-label-sm text-[11px] text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync: 4m ago
              </div>
            </div>
          </div>

          {/* ── 4-KPI row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Total Enrolled Students</span>
                <span className="material-symbols-outlined text-[18px] text-outline">school</span>
              </div>
              <div className="flex items-end gap-1.5 mb-0.5">
                <span className="font-headline-lg text-[2rem] font-bold text-on-surface leading-none">3,420</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant mb-0.5">6 Depts</span>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant">Active participants: 2,496 &nbsp;·&nbsp; <span className="text-primary font-semibold">73.0% Engaged</span></p>
              <p className="font-label-sm text-[10px] text-emerald-700 mt-0.5">↗ +8.4% YoY vs AY 2024-25</p>
            </div>

            {/* KPI 2 */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Total Verified Credentials</span>
                <span className="material-symbols-outlined text-[18px] text-outline">verified</span>
              </div>
              <div className="flex items-end gap-1.5 mb-0.5">
                <span className="font-headline-lg text-[2rem] font-bold text-on-surface leading-none">1,942</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant mb-0.5">Approved</span>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant">Audit Confidence: <span className="text-primary font-semibold">98.6% Level-3</span></p>
              <p className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">0 duplicate flags • 100% On-chain Verified</p>
            </div>

            {/* KPI 3 */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Total Activity Points Issued</span>
                <span className="material-symbols-outlined text-[18px] text-outline">trophy</span>
              </div>
              <div className="flex items-end gap-1.5 mb-0.5">
                <span className="font-headline-lg text-[2rem] font-bold text-on-surface leading-none">8,120</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant mb-0.5">Pts</span>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant">Per Student Average: <span className="font-semibold">2.37 pts / stud</span></p>
              <div className="mt-1 p-1.5 rounded-lg bg-primary/5 border border-primary/10">
                <p className="font-label-sm text-[10px] text-primary font-semibold">Target (2.0 pts) surpassed by +18.5%</p>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Accreditation Readiness</span>
                <span className="material-symbols-outlined text-[18px] text-outline">fact_check</span>
              </div>
              <div className="flex items-end gap-2 mb-1">
                <span className="font-headline-lg text-[2rem] font-bold text-on-surface leading-none">91.8%</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-[10px] font-bold mb-0.5">Grade A++</span>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant">NIRF Progression Metric: <span className="font-semibold">4.2 / 5.0 Index</span></p>
              <p className="font-label-sm text-[10px] text-emerald-700 mt-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                Tier-1 Engineering Benchmark Cleared
              </p>
            </div>
          </div>

          {/* ── Department Leaderboard table ──────────────────────────────── */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/10 flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <h2 className="font-headline-sm text-[16px] text-on-surface font-bold">Department Leaderboard</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  AY 2025-26 Live Standings
                </span>
              </div>
              <div className="flex items-center gap-4 font-label-sm text-[11px] text-on-surface-variant">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />High Density</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />On Target</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error inline-block" />Needs Review</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container-low">
                    {['Rank', 'Department & Leadership', 'Enrolled', 'Participation Rate', 'Verified Certs', 'Activity Points', 'NIRF/NAAC Score', 'Diagnostic'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-label-sm text-[10px] text-outline uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {DEPT_ROWS.map(row => (
                    <tr key={row.rank} className="hover:bg-surface-container-low transition-colors">
                      {/* Rank */}
                      <td className="px-4 py-4 w-16">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-label-md text-[12px] font-bold flex-shrink-0 ${
                            row.rank === 1 ? 'bg-amber-400 text-amber-950' : row.rank === 2 ? 'bg-slate-200 text-slate-700' : row.rank === 3 ? 'bg-orange-200 text-orange-800' : 'bg-surface-container text-on-surface'
                          }`}>{row.rank}</div>
                          <TrendArrow dir={row.trend} />
                        </div>
                      </td>

                      {/* Department & Leadership */}
                      <td className="px-4 py-4 min-w-[220px]">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-label-lg text-[13px] text-on-surface font-bold">{row.name}</span>
                          <span className={`px-1.5 py-0.5 rounded font-label-sm text-[9px] font-bold ${row.codeCls}`}>{row.code}</span>
                        </div>
                        <div className="font-label-sm text-[11px] text-on-surface-variant">{row.hod}</div>
                      </td>

                      {/* Enrolled */}
                      <td className="px-4 py-4 font-label-md text-[13px] text-on-surface font-semibold whitespace-nowrap">{row.enrolled}</td>

                      {/* Participation Rate */}
                      <td className="px-4 py-4 min-w-[140px]">
                        <div className="font-label-md text-[13px] text-on-surface font-semibold mb-1">
                          <span className={row.diagnostic === 'bad' ? 'text-error' : ''}>{row.partRate}</span>
                          <span className="text-outline font-normal ml-1 text-[11px]">{row.partAct} act.</span>
                        </div>
                        <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${row.barColor}`} style={{ width: `${row.barPct}%` }} />
                        </div>
                      </td>

                      {/* Verified Certs */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-label-md text-[13px] text-on-surface font-semibold">{row.certs}</div>
                        <div className="font-label-sm text-[10px] text-on-surface-variant">{row.certsNote}</div>
                      </td>

                      {/* Activity Points */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-label-md text-[13px] text-on-surface font-semibold">{row.actPts}</div>
                        <div className={`font-label-sm text-[10px] ${row.diagnostic === 'bad' ? 'text-error' : 'text-on-surface-variant'}`}>{row.actNote}</div>
                      </td>

                      {/* NIRF/NAAC Score */}
                      <td className="px-4 py-4">
                        <DiagnosticBadge score={row.nirf} type={row.diagnostic} alert={row.nirfAlert} />
                      </td>

                      {/* Diagnostic */}
                      <td className="px-4 py-4">
                        <button className="px-2.5 py-1.5 rounded-lg border border-outline-variant/20 text-on-surface font-label-md text-[11px] hover:bg-surface-container transition-colors whitespace-nowrap">
                          Why this rank?
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Accreditation Algorithm Breakdown ────────────────────────── */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-outline-variant/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">calculate</span>
                <div>
                  <h2 className="font-headline-sm text-[14px] text-on-surface font-bold">Accreditation Algorithm Breakdown: How Ranks Are Calculated</h2>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">NIRF &amp; NAAC Criteria 5 composite index formula calibrated with weighted institutional priorities</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-code-sm text-[10px] text-outline px-2 py-0.5 rounded bg-surface-container">Formula: v3.2.1-SEC</span>
                <button onClick={() => setAlgoOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-surface-container text-outline">
                  <span className="material-symbols-outlined text-[18px]">{algoOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
              </div>
            </div>

            {algoOpen && (
              <div className="px-5 py-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {ALGO_WEIGHTS.map(w => (
                    <div key={w.title} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-label-sm text-[10px] text-primary font-bold uppercase tracking-wider">Weight {w.weight}</span>
                        <span className="material-symbols-outlined text-[18px] text-outline">{w.icon}</span>
                      </div>
                      <div className="font-label-lg text-[13px] text-on-surface font-bold mb-1">{w.title}</div>
                      <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed mb-2">{w.desc}</p>
                      <span className="font-label-sm text-[10px] text-outline font-semibold">{w.cap}</span>
                    </div>
                  ))}
                </div>

                {/* Rank Differential diagnostic */}
                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/10">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center font-label-md text-[11px] font-bold text-primary flex-shrink-0">VS</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-label-md text-[13px] text-on-surface font-bold">Rank Differential: CSE (#1) vs AI&amp;DS (#3 Density Leader)</span>
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-label-sm text-[10px] font-bold">Key Diagnostic</span>
                      </div>
                      <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                        CSE leads in gross points (1,840 vs 1,190) and national podiums (14 vs 6), while AI&DS leads per-capita certification rate
                        (62.9 vs 58.8 per 100 students, +7.0% lead).
                      </p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center">
                        <div className="font-label-sm text-[10px] text-outline">CSE: 96.4 pts</div>
                        <div className="font-label-sm text-[10px] text-outline">820 Cohort Size</div>
                        <div className="flex gap-0.5 mt-1">
                          {[100, 85, 95, 60].map((h, i) => <div key={i} className="w-1.5 rounded-sm bg-primary" style={{ height: h * 0.3 }} />)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-label-sm text-[10px] text-outline">AI&DS: 91.5 pts</div>
                        <div className="font-label-sm text-[10px] text-outline">420 Cohort Size</div>
                        <div className="flex gap-0.5 mt-1">
                          {[70, 90, 65, 80].map((h, i) => <div key={i} className="w-1.5 rounded-sm bg-purple-400" style={{ height: h * 0.3 }} />)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rank #1 insight */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/10">
                  <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[15px] text-outline">info</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-label-md text-[13px] text-on-surface font-bold mb-0.5">Rank #1: Computer Science &amp; Engineering</div>
                    <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                      High NPTEL Elite certification volume (142), 14 national hackathon podiums (SIH Finalists), and strong faculty review turnaround
                      SLA (average 14 hours across 8 evaluators).
                    </p>
                  </div>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] whitespace-nowrap flex-shrink-0">
                    <span className="material-symbols-outlined text-[14px]">description</span>Audit Full Faculty Logs
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom 3-col panels ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* NIRF TLR & RPC Mapping */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">account_balance</span>
                  <div>
                    <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider">NIRF TLR &amp; RPC Mapping</div>
                    <h3 className="font-headline-sm text-[14px] text-on-surface font-bold">Criterion 5.3: Student Awards &amp; Tech Competitions</h3>
                  </div>
                </div>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                All 1,942 verified submissions meet NIRF peer-reviewed criteria. Total student awards logged this AY: 184 (National: 62, State: 122).
              </p>
              <div className="mt-auto pt-3 border-t border-outline-variant/10 flex items-center justify-between">
                <div>
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-0.5">Weighted NIRF Index contribution</div>
                  <div className="font-label-md text-[13px] text-on-surface font-bold">28.4 / 30.0 pts</div>
                </div>
                <div className="flex gap-0.5 items-end">
                  {[60, 80, 70, 90, 85, 95].map((h, i) => (
                    <div key={i} className="w-2 rounded-sm bg-primary" style={{ height: h * 0.35 }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Faculty Review SLA */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">timer</span>
                <div>
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Faculty Review SLA</div>
                  <h3 className="font-headline-sm text-[14px] text-on-surface font-bold">Department Approval Timelines</h3>
                </div>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                Campus-wide average SLA: 21.4 hours. CSE leads at 14h. EEE has 28 pending verifications beyond the 48-hour deadline requiring institutional advisory.
              </p>
              <div className="mt-auto pt-3 border-t border-outline-variant/10 flex items-center justify-between">
                <div>
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-0.5">Pending Backlog</div>
                  <span className="font-label-md text-[13px] text-error font-bold">34 items college-wide</span>
                </div>
                <button onClick={() => navigate('/verify')}
                  className="px-2.5 py-1.5 rounded-lg bg-error-container text-on-error-container font-label-md text-[11px] font-semibold hover:bg-error/10 transition-colors">
                  Review Queue →
                </button>
              </div>
            </div>

            {/* NAAC SSR Projection */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">radar</span>
                <div>
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider">NAAC SSR Projection</div>
                  <h3 className="font-headline-sm text-[14px] text-on-surface font-bold">Institutional Cycle-4 Forecast</h3>
                </div>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant leading-relaxed">
                Data parity with NAAC DVVC (Data Validation and Verification) API is currently at 99.1% with zero contradictory attendance records.
              </p>
              <div className="mt-auto pt-3 border-t border-outline-variant/10 flex items-center justify-between">
                <div>
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-0.5">SSR Projected Score</div>
                  <div className="font-label-md text-[13px] text-on-surface font-bold">3.78 / 4.00 <span className="text-primary">(A++)</span></div>
                </div>
                <div className="flex gap-0.5 items-end">
                  {[55, 70, 80, 90, 85, 95, 92].map((h, i) => (
                    <div key={i} className="w-2 rounded-sm bg-emerald-500" style={{ height: h * 0.32 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Institutional Governance Verification footer ──────────────── */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-on-primary text-[20px]">shield</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-label-md text-[13px] text-on-surface font-bold">Institutional Governance Verification</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-[10px] font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[11px]">verified</span>ECDSA-256 Valid
                    </span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    Cryptographically signed by Office of Institutional Research &amp; Dean of Academics. Block #892,104 verified.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] transition-colors">
                  <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>[PDF] NAAC Criterion 5 Report
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] transition-colors">
                  <span className="material-symbols-outlined text-[14px]">table_chart</span>[XLSX] Student Milestones Matrix
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] transition-colors">
                  <span className="material-symbols-outlined text-[14px]">data_object</span>[JSON] NIRF Submission Pack
                </button>
                <button id="send-advisory-btn"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-lg text-[12px] font-semibold shadow-sm hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined text-[15px]">send</span>Send Performance Advisory to HODs
                </button>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
