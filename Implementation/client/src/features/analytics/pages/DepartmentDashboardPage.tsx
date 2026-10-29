import { useNavigate } from 'react-router-dom';

// ── Static data ───────────────────────────────────────────────────────────────

const SIDENAV_ITEMS = [
  { icon: 'dashboard',        label: 'Overview / Dashboard',      active: true,  badge: 0  },
  { icon: 'verified_user',    label: 'Accreditation & NAAC',      active: false, badge: 0  },
  { icon: 'fact_check',       label: 'Faculty Verification',      active: false, badge: 14 },
  { icon: 'workspace_premium','label': 'Student Achievements',    active: false, badge: 0  },
  { icon: 'event_available',  label: 'Event Approvals',           active: false, badge: 3  },
  { icon: 'groups',           label: 'Team Rosters',              active: false, badge: 0  },
  { icon: 'download',         label: 'Export & Reports',          active: false, badge: 0  },
];

const TRACK_DATA = [
  { icon: 'code',           label: 'Programming & Hackathons',         students: 184, pct: 92, target: 200, barColor: 'bg-primary' },
  { icon: 'psychology',     label: 'AI / Machine Learning & Data Science', students: 142, pct: 88, target: 160, barColor: 'bg-emerald-600' },
  { icon: 'cloud',          label: 'Cloud Computing & DevOps',         students: 96,  pct: 78, target: 120, barColor: 'bg-teal-600'   },
  { icon: 'security',       label: 'Cybersecurity & Embedded Systems', students: 48,  pct: 65, target: 74,  barColor: 'bg-primary'    },
  { icon: 'bolt',           label: 'Core Engineering & IoT',           students: 38,  pct: 54, target: 70,  barColor: 'bg-amber-500'  },
];

const CHART_MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
// Normalised heights (px) for the sparkline polyline — approximate values from the visual
const CHART_POINTS = [30, 45, 60, 80, 65, 85, 110]; // relative units

const YEAR_COHORTS = [
  { year: '2nd Year (SE CSE)', pct: 64, enrolled: 176, total: 275, squads: 24, activity: 'DSA & Web3',           ringColor: '#F59E0B' },
  { year: '3rd Year (TE CSE)', pct: 88, enrolled: 242, total: 275, squads: 36, activity: 'National Hackathons',  ringColor: '#10B981' },
  { year: '4th Year (BE CSE)', pct: 72, enrolled: 194, total: 278, squads: 19, activity: 'Research Papers',      ringColor: '#6366F1' },
];

const LEDGER_ROWS = [
  { student: 'Aditya Verma',    roll: '21CSE884 • BE', cred: "Smart India Hackathon '25…", track: 'Hackathon', trackCls: 'bg-tertiary-fixed/30 text-tertiary', evaluator: 'Dr. Ramanathan', pts: '+5 Pts', status: 'Verified' },
  { student: 'Meera Krishnan',  roll: '22CSE142 • TE', cred: 'AWS Solutions Architect As…', track: 'Cloud',    trackCls: 'bg-teal-50 text-teal-700',          evaluator: 'Dr. Priya K.',  pts: '+4 Pts', status: 'Verified' },
  { student: 'Siddharth Nair',  roll: '23CSE019 • SE', cred: 'NPTEL Deep Learning (Top 1…', track: 'AI / ML',  trackCls: 'bg-primary/10 text-primary',        evaluator: 'Prof. M. Anand', pts: '+3 Pts', status: 'Verified' },
  { student: 'Rohit Deshmukh',  roll: '22CSE098 • TE', cred: 'IEEE Conference Paper Acc…', track: 'Research',  trackCls: 'bg-secondary-container/30 text-secondary', evaluator: 'Dr. Ramanathan', pts: '+5 Pts', status: 'Verified' },
];

// ── Donut ring helper (SVG) ───────────────────────────────────────────────────
function DonutRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r   = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-surface-container" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize="11" fontWeight="700" fill="currentColor" className="text-on-surface">
        {pct}%
      </text>
    </svg>
  );
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
function Sparkline() {
  const W = 280; const H = 130;
  const pts = CHART_POINTS;
  const xs  = pts.map((_, i) => (i / (pts.length - 1)) * (W - 20) + 10);
  const ys  = pts.map(p => H - 20 - (p / 130) * (H - 40));
  const polyline = xs.map((x, i) => `${x},${ys[i]!}`).join(' ');
  const area     = `${xs[0]!},${H - 20} ` + xs.map((x, i) => `${x},${ys[i]!}`).join(' ') + ` ${xs[xs.length - 1]!},${H - 20}`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="hsl(var(--md-sys-color-primary))" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(var(--md-sys-color-primary))" stopOpacity="0"   />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon points={area} fill="url(#spGrad)" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="hsl(var(--md-sys-color-primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Annotation: SIH Prelims ~Oct */}
      <circle cx={xs[2]!} cy={ys[2]!} r="4" fill="hsl(var(--md-sys-color-tertiary))" />
      <text x={xs[2]! - 4} y={ys[2]! - 8} fontSize="8" fill="hsl(var(--md-sys-color-tertiary))" fontWeight="600">SIH Prelims</text>
      {/* Annotation: NPTEL Cycle ~Feb */}
      <circle cx={xs[xs.length - 1]!} cy={ys[ys.length - 1]!} r="4" fill="hsl(var(--md-sys-color-primary))" />
      <text x={xs[xs.length - 1]! - 32} y={ys[ys.length - 1]! - 8} fontSize="8" fill="hsl(var(--md-sys-color-primary))" fontWeight="600">NPTEL Cycle</text>
      {/* X axis labels */}
      {CHART_MONTHS.map((m, i) => (
        <text key={m} x={xs[i]} y={H - 4} fontSize="8" textAnchor="middle" fill="hsl(var(--md-sys-color-outline))">{m}</text>
      ))}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DepartmentDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased flex">

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-[200px] flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant/10 fixed top-0 left-0 h-full z-40 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-label-lg text-[11px] font-black text-on-primary">CIP</span>
            </div>
            <div>
              <div className="font-label-lg text-[12px] font-bold text-on-surface leading-none">CIP</div>
              <div className="font-label-sm text-[9px] text-outline uppercase tracking-wider">Institutional Core</div>
            </div>
          </div>
        </div>

        {/* Section label */}
        <div className="px-4 pt-4 pb-1">
          <span className="font-label-sm text-[9px] text-outline uppercase tracking-widest">Academic Leadership</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pb-2 flex flex-col gap-0.5 overflow-y-auto">
          {SIDENAV_ITEMS.map(item => (
            <button key={item.label}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left font-label-md text-[12px] transition-all ${
                item.active
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}>
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              <span className="flex-1 leading-tight">{item.label}</span>
              {item.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${
                  item.active ? 'bg-on-primary/20 text-on-primary' : 'bg-error-container text-on-error-container'
                }`}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom dept info */}
        <div className="m-3 p-3 rounded-xl bg-surface-container border border-outline-variant/10">
          <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-1">CSE Department</div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-label-md text-[11px] text-on-surface">NIRF Target Q2</span>
            <span className="font-label-md text-[11px] text-primary font-bold">88%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-high rounded-full">
            <div className="h-1.5 bg-primary rounded-full" style={{ width: '88%' }} />
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/10 text-on-surface-variant hover:text-on-surface font-label-md text-[12px] transition-colors">
          <span className="material-symbols-outlined text-[18px]">settings</span>Settings
        </button>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 ml-[200px] flex flex-col">

        {/* ── Top navbar ──────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-surface-container-lowest border-b border-outline-variant/10 h-14 flex items-center px-6 gap-4">
          {/* Dept & semester selectors */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[12px] transition-colors">
              <span className="material-symbols-outlined text-[16px]">school</span>
              Computer Science &amp; Engineering
              <span className="material-symbols-outlined text-[15px]">expand_more</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[12px] transition-colors">
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              AY 2025-26 • Sem VI
              <span className="material-symbols-outlined text-[15px]">expand_more</span>
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-sm mx-auto">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[17px]">search</span>
              <input type="search" placeholder="Search faculty, PRNs, records…"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-lg hover:bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error border-2 border-surface-container-lowest" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/20">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-[12px] font-bold">SR</div>
              <div>
                <div className="font-label-md text-[12px] text-on-surface font-semibold leading-none">Prof. S. Ranganathan, Ph.D.</div>
                <div className="font-label-sm text-[10px] text-on-surface-variant">Head of Department, CSE</div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page body ──────────────────────────────────────────────────── */}
        <main className="flex-1 px-6 py-5 pb-10 flex flex-col gap-5 max-w-7xl w-full">

          {/* ── Hero section ──────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-surface-container-lowest to-secondary/5 border border-outline-variant/10 p-6">
            {/* Status bar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live NIRF / NAAC Tier-1 Node
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">sync</span>
                Accreditation Metric Sync: 10 mins ago
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
              <div className="flex-1">
                <h1 className="font-headline-xl text-[1.875rem] font-bold text-on-surface leading-tight mb-3">
                  Department of Computer Science &amp;<br />Engineering
                </h1>
                <p className="font-body-md text-sm text-on-surface-variant leading-relaxed max-w-lg">
                  Welcome back, Dr. Ranganathan. Department innovation, verified milestones, and accreditation
                  readiness are tracking at{' '}
                  <span className="text-primary font-semibold">94.2% audit confidence</span>{' '}
                  for the upcoming statutory review.
                </p>
              </div>

              {/* Semester selector + export */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-[12px] font-semibold">
                    Current Semester (Spring 2026)
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[12px] transition-colors">
                    AY 2025-26
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[12px] transition-colors">
                    <span className="material-symbols-outlined text-[14px]">table_rows</span>Custom Range
                  </button>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary font-label-md text-[12px] font-semibold transition-colors">
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Export NAAC / NIRF Metric Sheet
                </button>
              </div>
            </div>

            {/* Verification Bottleneck alert */}
            <div className="mt-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-error-container/20 border border-error/20">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-error-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[16px] text-on-error-container">priority_high</span>
                </div>
                <p className="font-body-sm text-[12px] text-on-surface">
                  <span className="font-semibold text-error">Verification Bottleneck:</span>{' '}
                  14 student credential submissions approaching the 24h institutional SLA threshold.
                </p>
              </div>
              <button onClick={() => navigate('/verify')}
                className="flex items-center gap-1 font-label-md text-[12px] text-primary hover:underline whitespace-nowrap flex-shrink-0">
                Review Faculty Verification Queue →
              </button>
            </div>
          </div>

          {/* ── 4-KPI ribbon ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Verified Certificates */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Verified Certificates</span>
                <span className="material-symbols-outlined text-[18px] text-outline">workspace_premium</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="font-headline-lg text-[2rem] font-bold text-on-surface leading-none">482</span>
                <span className="font-label-sm text-[11px] text-emerald-700 font-semibold mb-0.5">↑ +18%</span>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant">vs last semester • 94.2% audit accuracy</p>
              <div className="mt-1">
                {/* Mini sparkline */}
                <svg width="100%" height="24" viewBox="0 0 80 24" preserveAspectRatio="none">
                  <polyline points="0,20 15,16 30,12 45,8 60,10 80,4" fill="none" stroke="hsl(var(--md-sys-color-primary))" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-label-sm text-[10px] text-outline">NAAC 5.3.3</span>
            </div>

            {/* KPI 2: Student Participation */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Student Participation</span>
                <span className="material-symbols-outlined text-[18px] text-outline">groups</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="font-headline-lg text-[2rem] font-bold text-on-surface leading-none">74.6%</span>
                <span className="font-label-sm text-[11px] text-primary font-semibold mb-0.5">+6.2% QoQ</span>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant">612 of 820 eligible CSE students active</p>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-label-sm text-[9px] text-outline">Threshold Target: 70%</span>
                  <span className="font-label-sm text-[9px] text-emerald-700 font-semibold">+4.6% Surpassed</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container rounded-full">
                  <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: '74.6%' }} />
                </div>
              </div>
            </div>

            {/* KPI 3: Contests & Hackathons */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Contests &amp; Hackathons</span>
                <span className="material-symbols-outlined text-[18px] text-outline">emoji_events</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="font-headline-lg text-[2rem] font-bold text-on-surface leading-none">86</span>
                <span className="font-label-sm text-[11px] text-tertiary font-semibold mb-0.5">Live Competitions</span>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant">38 National • 12 Inter-Coll. • 36 Local</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-label-sm text-[10px] font-bold">14 Podiums</span>
                <span className="px-1.5 py-0.5 rounded bg-secondary-container/40 text-secondary font-label-sm text-[10px] font-bold">22 Finalists</span>
              </div>
            </div>

            {/* KPI 4: Activity Points Pool */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Activity Points Pool</span>
                <span className="material-symbols-outlined text-[18px] text-outline">trophy</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="font-headline-lg text-[2rem] font-bold text-on-surface leading-none">1,840</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant mb-0.5">Pts Earned</span>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant">Avg 3.8 pts/student • Institutional Rank #1</p>
              <div className="flex items-center justify-between mt-1">
                <span className="font-label-sm text-[10px] text-primary">⚡ Lead: +240 vs ECE</span>
                <span className="font-label-sm text-[10px] text-outline">AY CAP: 2,500</span>
              </div>
            </div>
          </div>

          {/* ── Middle section: Tracks chart + Sparkline ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Participation & Achievements by Track */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-headline-sm text-[15px] text-on-surface font-bold">Participation &amp; Achievements by Track</h2>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">Actual completed verified credentials vs semester targets</p>
                </div>
                <div className="flex items-center gap-3 font-label-sm text-[10px] text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Actual Verified</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-surface-container-high inline-block" />Department Target</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {TRACK_DATA.map(t => (
                  <div key={t.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[15px] text-on-surface-variant">{t.icon}</span>
                        <span className="font-label-md text-[12px] text-on-surface">{t.label}</span>
                      </div>
                      <div className="font-label-sm text-[11px] text-on-surface-variant">
                        <span className="font-semibold text-on-surface">{t.students} students</span>
                        {' '}<span className="text-primary font-bold">{t.pct}%</span>
                        {' '}/ {t.target} tgt
                      </div>
                    </div>
                    {/* Progress bar: target (full width) with actual overlay */}
                    <div className="relative w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                      <div className={`absolute left-0 top-0 h-full rounded-full ${t.barColor}`}
                        style={{ width: `${t.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Focus footer */}
              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
                <div className="flex items-center gap-1.5 font-label-sm text-[11px] text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px] text-secondary">auto_awesome</span>
                  <span><span className="font-semibold text-on-surface">Special Focus:</span> IoT &amp; Hardware tracks scheduled for faculty-mentored lab sprint in March.</span>
                </div>
                <button className="font-label-md text-[11px] text-primary hover:underline whitespace-nowrap">Configure Targets</button>
              </div>
            </div>

            {/* Activity Points Trajectory sparkline */}
            <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-headline-sm text-[15px] text-on-surface font-bold">Activity Points Trajectory</h2>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">Month-over-month verification volume &amp; credential surges</p>
                </div>
                <span className="font-label-sm text-[10px] text-outline">AY 25-26</span>
              </div>

              {/* Chart */}
              <div className="flex-1 min-h-[130px]">
                <Sparkline />
              </div>

              {/* Stats under chart */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/10">
                <div>
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-0.5">Quarterly Delta</div>
                  <div className="font-headline-sm text-[18px] font-bold text-on-surface">+340 Pts</div>
                  <div className="font-label-sm text-[10px] text-emerald-700">+23% vs Q2</div>
                </div>
                <div>
                  <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-0.5">Accreditation Peak</div>
                  <div className="font-headline-sm text-[18px] font-bold text-on-surface">Nov 2025</div>
                  <div className="font-label-sm text-[10px] text-on-surface-variant">148 Verifications</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom section: Year Cohorts + Ledger ─────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Year-wise Student Cohorts */}
            <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-[15px] text-on-surface font-bold">Year-wise Student Cohorts</h2>
                <span className="font-label-sm text-[11px] text-on-surface-variant">3 Batches Enrolled</span>
              </div>
              <div className="flex flex-col gap-4">
                {YEAR_COHORTS.map(c => (
                  <div key={c.year} className="flex items-center gap-3">
                    <DonutRing pct={c.pct} color={c.ringColor} size={56} />
                    <div className="flex-1">
                      <div className="font-label-md text-[13px] text-on-surface font-semibold">{c.year}</div>
                      <div className="font-label-sm text-[10px] text-on-surface-variant">{c.squads} Active Squads • {c.activity}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-label-lg text-[13px] text-on-surface font-bold">{c.enrolled} / {c.total}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* NAAC Coordinator */}
              <div className="pt-3 border-t border-outline-variant/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-[11px] font-bold flex-shrink-0">PK</div>
                  <div>
                    <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider">NAAC Criterion 5 Coordinator</div>
                    <div className="font-label-md text-[12px] text-on-surface font-semibold">Dr. Priya K. (Associate Professor, CSE)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Department Verifications Ledger */}
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-headline-sm text-[15px] text-on-surface font-bold">Recent Department Verifications Ledger</h2>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">Real-time faculty evaluations approved toward institutional repository</p>
                </div>
                <div className="flex items-center gap-1 font-label-sm text-[11px] text-on-surface-variant">
                  <span>Showing latest 5 of 482</span>
                  <button className="text-primary hover:underline ml-1">View All</button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-outline-variant/10">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-container">
                      {['Student & Roll', 'Credential / Milestone', 'Track', 'Faculty Evaluator', 'Points', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-label-sm text-[10px] text-outline uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {LEDGER_ROWS.map(row => (
                      <tr key={row.student} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-3 py-3">
                          <div className="font-label-md text-[12px] text-on-surface font-semibold">{row.student}</div>
                          <div className="font-label-sm text-[10px] text-on-surface-variant">{row.roll}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-body-sm text-[11px] text-on-surface truncate max-w-[160px]">{row.cred}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] font-semibold ${row.trackCls}`}>{row.track}</span>
                        </td>
                        <td className="px-3 py-3 font-body-sm text-[11px] text-on-surface-variant whitespace-nowrap">{row.evaluator}</td>
                        <td className="px-3 py-3 font-label-md text-[12px] text-primary font-bold">{row.pts}</td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-1 text-emerald-700 font-label-sm text-[11px] font-semibold">
                            <span className="material-symbols-outlined text-[14px]">verified</span>{row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ledger footer */}
              <div className="flex items-center justify-between font-label-sm text-[10px] text-on-surface-variant pt-1 border-t border-outline-variant/10">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px] text-emerald-600">lock</span>
                  All sign-offs cryptographically logged in college accreditation vault
                </div>
                <div className="font-code-sm text-[10px]">Ledger Hash: 0x9f4a…e12d</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
