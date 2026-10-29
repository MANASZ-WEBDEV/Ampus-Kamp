import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar }   from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';

// ── Countdown helpers ─────────────────────────────────────────────────────────
function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  return `${h}H ${m}M ${s}S`;
}

// ── Dummy data ────────────────────────────────────────────────────────────────
type AppState = 'pending' | 'accepted' | 'review';

interface Applicant {
  id: string;
  img: string;
  imgAlt: string;
  name: string;
  match: string;
  tag: string;
  tagCls: string;
  info: string;
  dept: string;
  appliedAgo: string;
  squad: string;
  role: string;
  roleCls: string;
  state: AppState;
  pitch: string;
  skills: string[];
  artifacts?: { icon: string; label: string; href?: string; cls: string }[];
  footerNote: string;
  footerIcon: string;
  secondaryAction: string;
  secondaryIcon: string;
  // accepted state extras
  acceptedToken?: string;
  successMsg?: string;
}

const APPLICANTS: Applicant[] = [
  {
    id: 'a1',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBevPyEM65S_Iqq50daLagTNX9tUMhsMR4fcDhBO72WWi9w4LxCsAhfmXrDKOdGVHFTkYESitWbozwam6JXLCjkc9ZUHj3QV0Y1t0-INQVET8EZE7YyAoTyH1PHSK6KBACA6cDTHxJDySAbW-zO1198WtObQhixZzWuH2sU1Qwi2ilY7HQzWYRyz-05m-_tWWwx0TVZ0eGj8I0G9vxWSj0Nd_6slRtD6pYcUt1eZUTLrf9_L8bU9d1cQA',
    imgAlt: 'Tanvi Deshmukh – CSE student',
    name: 'Tanvi Deshmukh',
    match: '96% MATCH',
    tag: 'Verified Student',
    tagCls: 'bg-primary/10 text-primary',
    info: '3rd Year CSE • CGPA 8.8 • Rank #4 AI Cohort • Autonomous UAV Lab',
    dept: 'Dept. of Computer Science',
    appliedAgo: 'Applied 2h ago',
    squad: 'Team NeuroPulse • SIH \'26',
    role: 'Role: ML Engineer',
    roleCls: 'text-primary',
    state: 'pending',
    pitch: '"Built an edge detection CNN pipeline for agricultural UAVs last semester. Proficient in PyTorch, TensorRT, and FastAPI deployment. Ready to lead the edge intelligence and real-time inference track for SIH 2026."',
    skills: ['PyTorch 2.2', 'Computer Vision', 'FastAPI', 'TensorRT', 'Edge AI', 'Docker'],
    artifacts: [
      { icon: 'code',         label: 'github.com/tanvi-d/agri-edge-cv', href: '#', cls: 'text-primary' },
      { icon: 'emoji_events', label: 'Kaggle Grandmaster Top 2%',        cls: 'text-on-surface-variant' },
      { icon: 'verified',     label: 'Transcript Validated (Dean of Academics)', cls: 'text-emerald-700' },
    ],
    footerNote: 'Decision locks slot on campus ledger',
    footerIcon: 'info',
    secondaryAction: 'Schedule Quick Chat',
    secondaryIcon: 'calendar_add_on',
  },
  {
    id: 'a2',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuClMMm3gTdsi8u40L9crDV9PghksqWXw-fjiYl9tearj6PGTtzJ6j8lK9SVyNCvPuWUDx-04diqf7CQLui3xMFrAROSble8Mhqm6DG0we4QbPSGUMYCmyn8241JuhzsSuMzwjxlH0VylkV_cqBy1sxjrz_ryI1GMCxiEgUT6wWCzVDxI6GJ-C_HkFtgwIxZLL4N0UD92GW3iAbNf24Caa9kMtoDanihKBrbesJnfPFw37hjKvw5fYvTcQ',
    imgAlt: 'Rohan Kulkarni – IT student',
    name: 'Rohan Kulkarni',
    match: '',
    tag: 'Accepted 10m ago',
    tagCls: 'bg-emerald-100 text-emerald-800',
    info: '4th Year IT • Assigned Role: Solidity / Smart Contracts Security Lead',
    dept: '',
    appliedAgo: '',
    squad: 'Team LedgerPay • FinTech Hackathon',
    role: '',
    roleCls: '',
    state: 'accepted',
    pitch: '',
    skills: [],
    acceptedToken: 'TOKEN: #ROST-9021',
    successMsg: 'Rohan is now confirmed on your squad roster! Coordinate sprint deliverables, assign smart contract modules, and sync on code reviews immediately. The institutional ledger has generated verified onboarding keys.',
    footerNote: '',
    footerIcon: '',
    secondaryAction: 'Direct DM',
    secondaryIcon: 'forum',
  },
  {
    id: 'a3',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4-n_zLnc2ecf160ymR0emEBHmoYpkdmJcH7c4BJTHiTxLC_B99ko8ragyq-qnMgN7bKKPM8kXOTjGB_9gMwuuOf_90DUPvjJj-MWhe7_UutBMxpLzz7uD0LtP81qjxKYzQM4-WY1oMWFWulkbUDKgivNmHYYXM_twrUWpSvfOBp9xwR-VZZ1mQFmNlLX6O-tVZTY8V-09vkBtYdCuPP_rN9re6OsOc2lZh-RL9vFim4PucCy71KthKg',
    imgAlt: 'Aditya Menon – ECE student',
    name: 'Aditya Menon',
    match: '89% MATCH',
    tag: 'Robotics Lead',
    tagCls: 'bg-surface-container-high text-on-surface-variant',
    info: '2nd Year ECE • Robotics Club Core • FabLab Certified',
    dept: 'Dept. of Electronics & Comm.',
    appliedAgo: 'Applied 5h ago',
    squad: 'Team MechaVolt • RoboWars 2026',
    role: 'Role: ROS2 / Telemetry Lead',
    roleCls: 'text-secondary',
    state: 'review',
    pitch: '"Handled PX4 autopilot firmware for college drone club. Have local devkit ready for low-latency serial links and motor ESC calibration. Can commit 20+ hours weekly at FabLab."',
    skills: ['ROS2 Humble', 'PX4 Autopilot', 'C++', 'Drone Telemetry', 'STM32 Microcontrollers'],
    footerNote: 'Repository benchmark: Passed 12 unit tests',
    footerIcon: 'terminal',
    secondaryAction: 'Schedule FabLab Trial',
    secondaryIcon: 'biotech',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TeamCommandHubPage() {
  const navigate = useNavigate();
  const countdown = useCountdown(47 * 3600 + 42 * 60 + 19);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'archived'>('incoming');

  const tabs = [
    { id: 'incoming' as const, label: 'Incoming Applications', count: 3 },
    { id: 'outgoing' as const, label: 'Outgoing / Sent Requests', count: 2 },
    { id: 'archived' as const, label: 'Archived / Concluded', count: 5 },
  ];

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle="Team Finder" />

      <main className="w-full pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb + Action Bar ─────────────────────────────────────── */}
        <section className="w-full pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container-lowest px-5 py-4 rounded-xl shadow-sm">
            <div className="flex flex-col gap-0.5 min-w-0">
              <nav className="flex items-center gap-1.5 font-body-sm text-sm text-outline flex-wrap">
                <span>Campus Ledger</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <button onClick={() => navigate('/teams')} className="hover:text-primary transition-colors">Team Finder</button>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-label-lg">Team Requests Hub</span>
              </nav>
              <div className="flex items-center gap-2 font-code-sm text-[11px] text-on-surface-variant mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Ledger Node: INVENTUM-CAMPUS-04 (Synced)</span>
                <span className="text-outline">•</span>
                <span className="text-primary font-semibold">ECDSA-256 Verified</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="team-hub-switch-btn"
                onClick={() => navigate('/teams')}
                className="px-3 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg font-label-lg text-sm transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">group</span>
                Switch to Team Finder
              </button>
              <button
                id="team-hub-create-btn"
                className="px-3 py-2 bg-primary text-on-primary rounded-lg font-label-lg text-sm hover:bg-primary-container transition-all shadow-sm flex items-center gap-2 active:scale-[0.98]">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create Squad Listing
              </button>
            </div>
          </div>
        </section>

        {/* ── Page Header + KPI Ribbon ────────────────────────────────────── */}
        <section className="w-full pb-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-md text-[11px] mb-2">
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
                Squad Coordination Desk
              </div>
              <h1 className="font-headline-xl text-[2rem] lg:text-[2.25rem] text-on-surface tracking-tight font-bold leading-tight">
                Team Command Hub — Squad Requests &amp; Applications
              </h1>
              <p className="font-body-md text-sm text-on-surface-variant mt-2 leading-relaxed">
                Manage incoming candidate applications for your squads, evaluate pitches and code repositories, and track your outgoing squad join requests.
              </p>
            </div>
            <div className="flex items-center gap-2 font-code-sm text-[12px] bg-surface-container-high text-primary px-4 py-2 rounded-lg flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">lock_clock</span>
              <span>PORTAL LOCK: {countdown}</span>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Incoming Applications', value: '3 Pending',   badge: 'Urgent',   badgeCls: 'bg-secondary-container/20 text-on-secondary-container', icon: 'mail',       sub: '1 requires review < 24h',  subIcon: 'priority_high', subCls: 'text-error' },
              { label: 'Accepted Roster Slots', value: '4 / 6 Filled', badge: "SIH '26", badgeCls: 'bg-primary/10 text-primary', icon: 'badge',        sub: 'Team NeuroPulse on pace',   subIcon: 'check_circle', subCls: 'text-primary' },
              { label: 'Outgoing Requests',     value: '2 In Review', badge: 'Outbound', badgeCls: 'bg-tertiary-container/20 text-tertiary', icon: 'send',         sub: '1 awaiting captain reply',  subIcon: 'schedule',     subCls: 'text-on-surface-variant' },
              { label: 'Roster Freeze Warning', value: '48h Left',    badge: 'Critical', badgeCls: 'bg-error-container text-on-error-container', icon: 'alarm',        sub: 'Min. 4-member squad lock',  subIcon: 'verified_user', subCls: 'text-on-surface-variant' },
            ].map(k => (
              <div key={k.label} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-primary/5 pointer-events-none">
                  <span className="material-symbols-outlined text-[90px]">{k.icon}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-label-md text-[10px] text-outline uppercase tracking-wider">{k.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full font-label-sm text-[10px] ${k.badgeCls}`}>{k.badge}</span>
                  </div>
                  <div className="font-headline-lg text-[1.75rem] text-on-surface font-bold">{k.value}</div>
                </div>
                <div className={`mt-4 flex items-center gap-1.5 font-body-sm text-[12px] ${k.subCls}`}>
                  <span className="material-symbols-outlined text-[16px]">{k.subIcon}</span>
                  <span>{k.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Registration Lock Warning Banner ──────────────────────────────── */}
        <div className="w-full bg-secondary-container/15 rounded-xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-container/30 text-on-secondary-container flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            <div>
              <div className="font-headline-sm text-[1rem] text-on-surface font-semibold flex items-center gap-2">
                Registration Lock Warning
                <span className="font-code-sm text-[11px] text-on-secondary-container font-semibold">[SIH-T-48H]</span>
              </div>
              <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">
                Squad leaders must confirm final rosters before official competition portals seal submissions in 48 hours. Accepted members gain instant access to encrypted WhatsApp Squad channels and institutional on-duty slips.
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-surface-container-lowest text-on-surface font-label-lg text-sm rounded-lg shadow-sm hover:bg-surface-container transition-colors whitespace-nowrap flex-shrink-0">
            Review Policy
          </button>
        </div>

        {/* ── Tab Switcher + Filters ─────────────────────────────────────── */}
        <section className="w-full bg-surface-container-lowest p-4 rounded-xl shadow-sm mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  id={`hub-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-label-lg text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-container text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}>
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    activeTab === tab.id
                      ? 'bg-secondary-container text-on-secondary-fixed'
                      : 'bg-surface-container text-outline'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-label-md text-[12px] flex items-center gap-1.5 hover:bg-surface-container transition-colors">
                <span className="text-outline">Event:</span>
                <span className="font-semibold">All Competitions (3)</span>
                <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
              </button>
              <button className="px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-label-md text-[12px] flex items-center gap-1.5 hover:bg-surface-container transition-colors">
                <span className="text-outline">Squad:</span>
                <span className="font-semibold">All Active (2)</span>
                <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
              </button>
              <button className="px-3 py-2 bg-surface-container-low rounded-lg text-on-surface font-label-md text-[12px] flex items-center gap-1.5 hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-[16px] text-outline">sort</span>
                <span>Match %</span>
              </button>
              <button className="p-2 text-outline hover:text-primary rounded-lg hover:bg-surface-container transition-colors" title="Refresh">
                <span className="material-symbols-outlined text-[20px]">refresh</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 12-col Grid ─────────────────────────────────────────────────── */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT: Applicant Cards (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5">

            {APPLICANTS.map(app => (
              <article key={app.id} className="bg-surface-container-lowest rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">

                {/* ── Header row ─────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4">
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={app.img} alt={app.imgAlt}
                        className="w-14 h-14 rounded-xl object-cover shadow-sm"
                        loading="lazy"
                      />
                      {app.state === 'accepted' ? (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px]">
                          <span className="material-symbols-outlined text-[13px]">check</span>
                        </div>
                      ) : app.state === 'review' ? (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center text-[11px]">
                          <span className="material-symbols-outlined text-[13px]">precision_manufacturing</span>
                        </div>
                      ) : (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px]">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-headline-md text-[1.125rem] text-on-surface font-bold">{app.name}</h3>
                        {app.match && (
                          <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-code-sm text-[11px] font-semibold">{app.match}</span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded font-label-sm text-[11px] font-semibold flex items-center gap-1 ${app.tagCls}`}>
                          {app.state === 'accepted' && <span className="material-symbols-outlined text-[13px]">done_all</span>}
                          {app.tag}
                        </span>
                      </div>
                      <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">{app.info}</p>
                      {app.state === 'accepted' ? (
                        <div className="font-label-sm text-[11px] text-primary font-semibold mt-0.5">Squad: {app.squad}</div>
                      ) : (
                        <div className="flex items-center gap-3 mt-1 text-[11px] font-label-md text-outline flex-wrap">
                          {app.dept && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">school</span>
                              {app.dept}
                            </span>
                          )}
                          {app.appliedAgo && <span>•</span>}
                          {app.appliedAgo && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              {app.appliedAgo}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Squad badge / token */}
                  {app.state === 'accepted' ? (
                    <div className="flex items-center gap-1.5 font-code-sm text-[11px] text-outline flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">lock</span>
                      {app.acceptedToken}
                    </div>
                  ) : (
                    <div className="flex-shrink-0 sm:text-right">
                      <span className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface font-label-md text-[11px] inline-block">
                        {app.squad}
                      </span>
                      <div className={`font-label-sm text-[11px] font-semibold mt-1 ${app.roleCls}`}>{app.role}</div>
                    </div>
                  )}
                </div>

                {/* ── Accepted state: success banner + channels ──────── */}
                {app.state === 'accepted' && (
                  <>
                    <div className="bg-emerald-50 text-emerald-900 rounded-lg p-4 my-4">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-emerald-600 text-[22px] flex-shrink-0">celebration</span>
                        <div>
                          <div className="font-label-lg text-[13px] font-bold">{app.name} is now confirmed on your squad roster!</div>
                          <p className="font-body-sm text-[12px] text-emerald-800 mt-0.5 leading-relaxed">{app.successMsg}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-low p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-[20px]">forum</span>
                        <span className="font-label-lg text-[13px] text-on-surface">Encrypted Squad Communication Channels Ready</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a href="#" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-label-lg text-[12px] transition-colors flex items-center gap-2 shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          Join WhatsApp Squad Group →
                        </a>
                        <button className="px-3 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-lg text-[12px] transition-colors">Direct DM</button>
                        <button className="px-3 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-lg text-[12px] transition-colors">Full Profile</button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Pending/Review state: pitch + skills + artifacts ── */}
                {app.state !== 'accepted' && (
                  <>
                    {/* Pitch quote */}
                    <div className="bg-surface-container-low rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-1.5 font-label-sm text-[10px] text-primary uppercase font-bold mb-1.5">
                        <span className="material-symbols-outlined text-[14px]">format_quote</span>
                        Candidate Pitch
                      </div>
                      <p className="font-body-md text-[13px] text-on-surface italic leading-relaxed">{app.pitch}</p>
                    </div>

                    {/* Skills */}
                    <div className="mb-4">
                      <div className="font-label-sm text-[10px] text-outline uppercase tracking-wider mb-2">
                        {app.state === 'review' ? 'Technical Competencies' : 'Validated Tech Stack & Skills'}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {app.skills.map(s => (
                          <span key={s} className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface font-code-sm text-[11px]">{s}</span>
                        ))}
                      </div>
                    </div>

                    {/* Artifacts */}
                    {app.artifacts && (
                      <div className="flex flex-wrap items-center gap-4 py-2 font-body-sm text-[12px] mb-4">
                        {app.artifacts.map((a, i) => (
                          a.href ? (
                            <a key={i} href={a.href} className={`inline-flex items-center gap-1.5 hover:underline font-label-md ${a.cls}`}>
                              <span className="material-symbols-outlined text-[16px]">{a.icon}</span>
                              <span>{a.label}</span>
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </a>
                          ) : (
                            <span key={i} className={`inline-flex items-center gap-1.5 font-label-md ${a.cls}`}>
                              <span className="material-symbols-outlined text-[16px]">{a.icon}</span>
                              <span>{a.label}</span>
                            </span>
                          )
                        ))}
                      </div>
                    )}

                    {/* Action bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-outline-variant/10">
                      {app.footerNote && (
                        <div className="flex items-center gap-1.5 font-label-md text-[11px] text-outline">
                          <span className="material-symbols-outlined text-[16px]">{app.footerIcon}</span>
                          <span>{app.footerNote}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button className="px-3 py-2 rounded-lg text-error hover:bg-error-container/20 font-label-lg text-[12px] transition-colors flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px]">close</span>
                          Decline
                        </button>
                        <button className="px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container text-on-surface font-label-lg text-[12px] transition-colors flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px]">{app.secondaryIcon}</span>
                          {app.secondaryAction}
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-[12px] font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.98]">
                          <span className="material-symbols-outlined text-[18px]">check</span>
                          {app.state === 'review' ? 'Accept to Squad' : 'Accept to Squad Roster'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>

          {/* RIGHT: Sidebar (4 cols) */}
          <aside className="lg:col-span-4 flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">

            {/* 1. Squad Roster Status */}
            <section className="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between pb-3">
                <h2 className="font-headline-sm text-[14px] text-on-surface font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
                  Squad Roster Status
                </h2>
                <span className="font-code-sm text-[10px] text-outline">LIVE SYNC</span>
              </div>

              {/* Squad 1 */}
              <div className="py-4 border-b border-outline-variant/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label-lg text-[13px] font-bold text-on-surface">Team NeuroPulse</span>
                  <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">4 / 6 Filled</span>
                </div>
                <p className="font-body-sm text-[11px] text-on-surface-variant mb-3">Smart India Hackathon 2026 • Captain: Aarav Sharma</p>
                <div className="flex items-center gap-1.5">
                  {['AS', 'PN', 'VS', 'RK'].map((ini, i) => (
                    <div key={ini} className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      i === 0 ? 'bg-primary-container text-on-primary' :
                      i === 3 ? 'bg-emerald-600 text-white' :
                      'bg-surface-container-highest text-on-surface'
                    }`}>{ini}</div>
                  ))}
                  <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </div>
                  <span className="ml-1 font-label-sm text-[11px] text-secondary font-semibold">2 Spots Left</span>
                </div>
              </div>

              {/* Squad 2 */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label-lg text-[13px] font-bold text-on-surface">Team MechaVolt</span>
                  <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-secondary-container/20 text-on-secondary-container font-semibold">2 / 4 Filled</span>
                </div>
                <p className="font-body-sm text-[11px] text-on-surface-variant mb-3">RoboWars 2026 • Captain: Priya Nair</p>
                <div className="flex items-center gap-1.5">
                  {['PN', 'KD'].map((ini, i) => (
                    <div key={ini} className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      i === 0 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface'
                    }`}>{ini}</div>
                  ))}
                  <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </div>
                  <span className="ml-1 font-label-sm text-[11px] text-error font-semibold">2 Needed</span>
                </div>
              </div>
            </section>

            {/* 2. Outgoing Applications */}
            <section className="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between pb-3">
                <h2 className="font-headline-sm text-[14px] text-on-surface font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">send_time_extension</span>
                  Outgoing Applications
                </h2>
                <span className="w-2 h-2 rounded-full bg-tertiary" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-surface-container-low rounded-lg flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-label-lg text-[12px] font-bold text-on-surface">Solaris Autonomous Rover</span>
                    <span className="font-code-sm text-[11px] text-secondary font-semibold">18h left</span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">Applied for: Sensor Fusion Lead</p>
                  <div className="flex items-center gap-1.5 mt-1 font-label-sm text-[10px] text-outline">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Under Review by Captain (Aarav S.)
                  </div>
                </div>
                <div className="p-3 bg-surface-container-low rounded-lg flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-label-lg text-[12px] font-bold text-on-surface">Quantum Sprint</span>
                    <span className="font-code-sm text-[11px] text-emerald-600 font-semibold">Confirmed</span>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">Applied for: Frontend Architect</p>
                  <div className="flex items-center gap-1.5 mt-1 font-label-sm text-[11px] text-emerald-700 font-semibold">
                    <span className="material-symbols-outlined text-[14px]">event_available</span>
                    Interview Offered • Tomorrow 5:00 PM
                  </div>
                </div>
              </div>
              <a href="#" className="mt-4 inline-flex items-center gap-1.5 font-label-lg text-[12px] text-primary hover:underline font-semibold">
                View All Outgoing Applications
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </section>

            {/* 3. Leader OD & Compliance Policy */}
            <section className="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
              <h2 className="font-headline-sm text-[14px] text-on-surface font-semibold flex items-center gap-2 pb-3">
                <span className="material-symbols-outlined text-primary text-[20px]">policy</span>
                Leader OD &amp; Compliance Policy
              </h2>
              <div className="flex flex-col gap-4">
                {[
                  { iconBg: 'bg-emerald-100 text-emerald-700', icon: 'check',         title: 'Gender Diversity Rule',      desc: 'Minimum 1 female candidate required for SIH 2026.', extra: 'Satisfied ✓', extraCls: 'text-emerald-700' },
                  { iconBg: 'bg-primary/10 text-primary',       icon: 'add_chart',     title: 'Multidisciplinary Score',    desc: '+15 evaluation points awarded for cross-departmental squads (CSE + ECE + Mech).', extra: '', extraCls: '' },
                  { iconBg: 'bg-secondary-container/30 text-on-secondary-container', icon: 'hourglass_top', title: 'Faculty Mentor Sign-Off', desc: 'Mandatory departmental mentor sign-off required 24h prior to portal freeze.', extra: '', extraCls: '' },
                ].map(r => (
                  <div key={r.title} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${r.iconBg}`}>
                      <span className="material-symbols-outlined text-[15px]">{r.icon}</span>
                    </div>
                    <div>
                      <div className="font-label-md text-[12px] font-bold text-on-surface">{r.title}</div>
                      <p className="font-body-sm text-[11px] text-on-surface-variant">
                        {r.desc}{r.extra && <span className={` font-semibold ml-1 ${r.extraCls}`}>{r.extra}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Institutional Trust Ledger */}
            <section className="bg-surface-container-high/60 p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[22px]">fingerprint</span>
                </div>
                <div className="min-w-0">
                  <div className="font-label-md text-[10px] uppercase tracking-wider text-outline font-bold">Institutional Trust Ledger</div>
                  <div className="font-code-sm text-[11px] font-semibold truncate text-primary">#REQ-8891-ECDSA-VERIFIED</div>
                </div>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant mt-3 leading-snug">
                All team invitations and acceptances are cryptographically sealed with the campus ECDSA-256 ledger to preserve project intellectual property rights.
              </p>
            </section>

          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
