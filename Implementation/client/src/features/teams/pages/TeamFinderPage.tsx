import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar }   from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OpenRole {
  icon: string;
  title: string;
  spot: string;
  badge?: string;
  badgeCls?: string;
  desc: string;
}

interface SquadCard {
  id: string;
  event: string;
  urgency: string;
  urgencyCls: string;
  urgencyIcon: string;
  capacity: string;
  teamName: string;
  verified: string;
  verifiedCls: string;
  captainImg: string;
  captainAlt: string;
  captainInfo: string;
  affLabel: string;
  affValue: string;
  affCls: string;
  pitch: string;
  tags: string[];
  roles: OpenRole[];
  footerLeft?: string;
  footerExtra?: string;
  actionLabel: string;
}

// ── Dummy squad data ───────────────────────────────────────────────────────────
const SQUADS: SquadCard[] = [
  {
    id: 's1',
    event: 'SIH 2026 • HACKATHON',
    urgency: '2 spots left • 48h to Roster Lock',
    urgencyCls: 'bg-secondary-fixed text-on-secondary-fixed animate-pulse',
    urgencyIcon: 'hourglass_top',
    capacity: '4 / 6',
    teamName: 'Team NeuroPulse',
    verified: 'Verified Captain',
    verifiedCls: 'bg-emerald-50 text-emerald-800',
    captainImg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwZIoyOqi_Niz28isNlLaB5eY_wsl6OW_KZuekE_iE18rLqFjtZIR9W-MTVYgRN6l7ggjYtCbmk5Gv4g234u1PbfdAPcgHqTIcdFYJgFXvCfn_8PuzWIHHPyUrUSKDcCfAEfRlZE-OHhsXcqEjo_m4B4RodQ5JlxNxcibSP9tZqlXUd8WAY4SU3f4VWAyiSX1_iS_hWmMpt8NWRlmdvh1QCeeBeJW1G_dGymQoci99DTlXxqdd5G102g',
    captainAlt: 'Aarav Sharma – CSE student',
    captainInfo: 'Captain: Aarav Sharma • 3rd Yr CSE • 4.9 Roster Rep • Ministry PS-1182',
    affLabel: 'Affiliation',
    affValue: 'Division of AI Research',
    affCls: 'text-primary',
    pitch: 'Building an edge AI assistive vision system for rural primary clinics under Ministry of Health PS-SIH-1182. Prototype inference pipeline ready on Jetson Orin Nano with TensorRT and dual camera devkits. Looking for an ML lead to optimize INT8 quantization & a frontend engineer for the field PWA.',
    tags: ['#EdgeAI', '#TensorRT', '#JetsonOrin', '#HealthTech', '#ReactPWA', '#SIH2026'],
    roles: [
      { icon: 'psychology', title: 'ML Engineer (PyTorch / INT8 / TensorRT)', spot: '1 spot left', badge: 'Priority Interview', badgeCls: 'bg-amber-100 text-amber-900', desc: 'Must be confident with real-time YOLOv8 ONNX conversion and edge benchmarking. 12 applicants reviewing.' },
      { icon: 'devices',    title: 'Frontend Dev (React / Tailwind / Offline PWA)',   spot: '1 spot left', badge: 'Active Review',   badgeCls: 'bg-surface-container-high text-on-surface', desc: 'Need responsive touch-first dashboard, local IndexedDB telemetry caching, and clean medical UI.' },
    ],
    footerLeft: 'Mentor: Dr. Ramanathan (HOD CSE) • 6 previous wins',
    actionLabel: 'Request to Join Squad',
  },
  {
    id: 's2',
    event: 'RoboWars 2026 • DRONE BOOTCAMP',
    urgency: '2 spots left',
    urgencyCls: 'bg-secondary-fixed text-on-secondary-fixed',
    urgencyIcon: 'bolt',
    capacity: '2 / 4',
    teamName: 'Team MechaVolt',
    verified: 'Lab Sponsored',
    verifiedCls: 'bg-emerald-50 text-emerald-800',
    captainImg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAy1bi4_3DEO2f9T230wb1b_X6DSKbPtkVxZzAK_edO6mYTQMrA4R2dPX6DufIYKjkU2l1ze3fJJccnQ7Xvu_2SDR9GKe9SbiWOx1vJhJ-XlMs-0fRLKXDoLo8-hxE7_MKFEcsrdxMnusbxwdaUYY5kB1cPsHg_c_BOHjlvQfh4Kkp8ksGfpUX7Ui4YZCuqYT-xgnh62q-oKMo44K2MIYBxAfE6DhupJZ_ZNL3QqKz_r1UPCzdDkqv8ow',
    captainAlt: 'Priya Nair – ECE student',
    captainInfo: 'Captain: Priya Nair • 3rd Yr ECE • President, Aero & Robotics Society',
    affLabel: 'Lab Allocation',
    affValue: 'Aero Lab 4 (Daily 4-8 PM)',
    affCls: 'text-secondary',
    pitch: 'Autonomous indoor SLAM navigation & obstacle avoidance micro-quadcopter. Hardware devkits, carbon fiber frames, and test bay reserved in Aero Lab 4. Need a firmware specialist with PX4/ROS2 experience to handle telemetry synchronization and low-latency flight state transitions.',
    tags: ['#ROS2', '#PX4Autopilot', '#STM32', '#LiDAR', '#C++20'],
    roles: [
      { icon: 'settings_remote', title: 'ROS2 / Drone Telemetry Lead',  spot: '1 spot', badge: undefined, badgeCls: '', desc: 'Visual odometry, Micro-XRCE-DDS client on FreeRTOS.' },
      { icon: 'memory',          title: 'Embedded C++ & ESC Power',      spot: '1 spot', badge: undefined, badgeCls: '', desc: 'Motor drivers, BLDC timing calibration, CAN bus integration.' },
    ],
    footerLeft: 'All test equipment provided by Aero Dept grants.',
    footerExtra: 'Pitch Deck & CAD Specs',
    actionLabel: 'Request to Join Squad',
  },
  {
    id: 's3',
    event: 'Blockchain Sprint • FINTECH',
    urgency: 'Only 1 spot left!',
    urgencyCls: 'bg-secondary-container text-on-secondary-fixed',
    urgencyIcon: 'local_fire_department',
    capacity: '3 / 4',
    teamName: 'Team LedgerPay',
    verified: '4th Yr Lead',
    verifiedCls: 'bg-emerald-50 text-emerald-800',
    captainImg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrlc_RlqlHQJCJew4tyO6ZIBkIFZiI2aEzzrG9RDQUhmkpSCAlmN9UEp-gcnzu0yVBR76mDP-yEwuwn2qmzcuDvmN5s5-vbBcq3OVbysc55SKaeIZWRBvqJhX4Q2WDNe3a1T6FvZe1VT-e_foXsKASmZ_-IjdF9DQuVD7W041RDK4OXFa6Yh3QiNVtqUNxlMsxULPovVOBGWNzz1NG-GU3nnmX2J1rxWU1dLOaDSv-65vhvmK9iSgtwA',
    captainAlt: 'Kabir Joshi – IT student',
    captainInfo: 'Captain: Kabir Joshi • 4th Yr IT • Campus Blockchain Club Lead',
    affLabel: 'Prize Pool',
    affValue: '₹1,50,000 + Grant',
    affCls: 'text-on-surface',
    pitch: 'Decentralized micro-grant distributor for student projects. Backend ready on Go with ECDSA verifications and zero-knowledge claim proofs. Need a smart contracts lead to verify EVM deployment, audit safety reentrancy locks, and handle automated escrow release conditions.',
    tags: ['#Solidity', '#Go', '#Foundry', '#EVM', '#ZeroKnowledge'],
    roles: [
      { icon: 'lock', title: 'Solidity / Smart Contracts Security Lead', spot: '1 spot', badge: undefined, badgeCls: '', desc: 'Must know Foundry / Hardhat unit testing and gas optimization patterns.' },
    ],
    footerLeft: 'GitHub repo & architectural draft shared upon invitation',
    footerExtra: 'View GitHub Specs',
    actionLabel: 'Apply For Role',
  },
  {
    id: 's4',
    event: 'Inter-Dept League • 7-A-SIDE FOOTBALL',
    urgency: '2 spots left',
    urgencyCls: 'bg-surface-container-high text-on-surface',
    urgencyIcon: 'sports_soccer',
    capacity: '5 / 7',
    teamName: 'Mechanical Strikers',
    verified: '',
    verifiedCls: '',
    captainImg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCV8ueF7poaouQVJOk2ZKHiLRdWxlqkBrjT9XyDl8k69Lf1tQdyn1-psJkpxjl7-hdBjCd6RicumX5woQVJHRJYZx5_pjYktCE--BWV36DXSBwDQVHChbWv617_zfj81Ca1IrWKZYn7Q2LFwEAFK7Ojn64AjTCKlcvCrYMU58L3UUeJd7lex9FJUwU_d-iHmVegPs5_DJTWuMGHA1vniG9-T76kehPvnp96YYRsQgXa-3GJnHkX3zyR8g',
    captainAlt: 'Rohan V – Mech student',
    captainInfo: 'Captain: Rohan V. • 2nd Yr Mech • Team Captain',
    affLabel: 'Training Schedule',
    affValue: 'Daily 5:30 PM (South Turf)',
    affCls: 'text-on-surface',
    pitch: 'Daily team conditioning sessions at South Sports Arena. Need energetic players committed to weekend playoff fixtures. Department provides full kits, travel allowance, and refreshments.',
    tags: [],
    roles: [
      { icon: 'sports_soccer', title: 'Central Midfielder (Playmaker)', spot: '1 spot', badge: undefined, badgeCls: '', desc: '' },
      { icon: 'sports_soccer', title: 'Goalkeeper',                     spot: '1 spot', badge: undefined, badgeCls: '', desc: '' },
    ],
    footerLeft: 'View Fixtures Calendar',
    actionLabel: 'Request to Join',
  },
];

const FREE_AGENTS = [
  { initials: 'AR', name: 'Ananya Rao',    info: '3rd Yr CSE • PyTorch, CV',     tags: 'PyTorch  YOLO',  color: 'bg-primary-container text-on-primary' },
  { initials: 'DV', name: 'Devansh Verma', info: '4th Yr Mech • CAN, Firmware',  tags: 'CAN bus  C++',   color: 'bg-secondary-container text-on-secondary-container' },
  { initials: 'SP', name: 'Sneha Patil',   info: '2nd Yr IT • UI/UX & Tailwind', tags: 'Figma  React',   color: 'bg-tertiary-container text-on-tertiary' },
];

const EVENT_CHIPS = [
  { label: 'All Events (18)', count: '', active: true },
  { label: '⚡ Smart India Hackathon', count: '8', active: false },
  { label: '🤖 RoboWars & Drones',    count: '4', active: false },
  { label: '⛓ Blockchain Sprint',     count: '3', active: false },
  { label: '⚽ Inter-Dept Sports',    count: '3', active: false },
];

const ROLE_TRACKS = ['AI / ML', 'Frontend (React/Tailwind)', 'Embedded C++ / ROS2', 'Smart Contracts', 'Sports Roster'];

// ── Page Component ─────────────────────────────────────────────────────────────
export default function TeamFinderPage() {
  const navigate = useNavigate();
  const [activeEvent, setActiveEvent] = useState(0);
  const [activeRole,  setActiveRole]  = useState<string | null>(null);
  const [urgentOnly,  setUrgentOnly]  = useState(true);
  const [search,      setSearch]      = useState('');
  const [sortBy,      setSortBy]      = useState('Deadline (Closing Soonest)');

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle="Team Finder" />

      <main className="w-full pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb + Quick Action Bar ──────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4 border-b border-outline-variant/10">
          <nav className="flex items-center gap-1.5 font-label-md text-sm text-on-surface-variant flex-wrap">
            <span>Campus Ledger</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-primary font-semibold">Team Finder</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-on-surface font-semibold">Active Squad Recruitments</span>
            <span className="hidden sm:block h-3 w-[1px] bg-outline-variant mx-1" />
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface text-[11px] font-code-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ledger Node: INVENTUM-CAMPUS-04 (Synced)
            </span>
          </nav>
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              id="team-my-applications-btn"
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-sm shadow-sm transition-all">
              <span className="material-symbols-outlined text-[18px] text-primary">mark_email_unread</span>
              My Squad Applications
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-secondary-container text-on-secondary-fixed text-[10px] font-bold">2</span>
            </button>
            <button
              id="team-post-recruitment-btn"
              onClick={() => navigate('/events')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-lg text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]">
              <span className="material-symbols-outlined text-[18px]">group_add</span>
              + Post Team Recruitment
            </button>
          </div>
        </div>

        {/* ── Hero + KPI Ribbon ───────────────────────────────────────────── */}
        <div className="w-full mt-5 p-6 lg:p-8 rounded-xl bg-surface-container-low shadow-sm relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
          <div className="absolute right-40 -bottom-20 w-64 h-64 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-[11px] tracking-wider uppercase mb-3">
                <span className="w-2 h-2 rounded-full bg-secondary-container" />
                <span className="font-bold text-secondary">Incubator Sprint Active</span>
                <span className="text-outline-variant">•</span>
                <span className="text-on-surface-variant font-medium">SIH 2026 &amp; Autumn Hackathons</span>
              </div>
              <h1 className="font-headline-xl text-[2.25rem] lg:text-[2.5rem] text-on-surface tracking-tight font-bold leading-tight">
                Find Your Crew — Squad Matchmaking
              </h1>
              <p className="font-body-md text-sm text-on-surface-variant mt-2 leading-relaxed">
                Discover high-performing multidisciplinary engineering squads, join fast-moving hackathon rosters, or recruit specialized talent across CSE, ECE, Mech, and AI/DS.
              </p>
            </div>

            {/* KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto shrink-0">
              {[
                { value: '18',  label: 'Active Squads',   sub: 'Across 6 Competitions',    color: 'text-primary',   bg: 'bg-surface-container-lowest', icon: 'groups' },
                { value: '31',  label: 'Open Roles',      sub: 'Specific Skill Requirements', color: 'text-tertiary',  bg: 'bg-surface-container-lowest', icon: 'person_search' },
                { value: '48h', label: 'SIH Roster Freeze', sub: 'Mandatory 4-member Lock', color: 'text-on-secondary-fixed', bg: 'bg-secondary-fixed/50', icon: 'timer' },
                { value: '94%', label: 'Placement Rate',  sub: 'Cohort 2024-26 Placed',    color: 'text-primary',   bg: 'bg-surface-container-lowest', icon: 'verified' },
              ].map(k => (
                <div key={k.label} className={`px-4 py-3 rounded-lg ${k.bg} shadow-sm flex flex-col gap-1`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-code-sm text-[1.25rem] font-bold ${k.color}`}>{k.value}</span>
                    <span className="material-symbols-outlined text-outline text-[18px]">{k.icon}</span>
                  </div>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">{k.label}</span>
                  <span className="font-label-sm text-[10px] text-outline">{k.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Filter Console ──────────────────────────────────────────────── */}
        <div className="w-full mt-5 p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-4">
          {/* Search row */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                id="team-finder-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by squad name, pitch, tech stack (e.g. ROS2, TensorRT, Solidity), or contest..."
                className="w-full h-11 pl-10 pr-14 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface-container-high text-outline text-[10px] font-code-sm uppercase tracking-wide">
                ⌘K
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full h-11 px-3 pr-8 appearance-none rounded-lg bg-surface-container-low text-on-surface font-label-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                  <option>Deadline (Closing Soonest)</option>
                  <option>Urgency: 1 Spot Left</option>
                  <option>Most Complete Rosters</option>
                  <option>Newest Recruitments</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">expand_more</span>
              </div>
              <button className="h-11 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors" title="Toggle view">
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </button>
            </div>
          </div>

          {/* Event category chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider mr-1">Event:</span>
            {EVENT_CHIPS.map((chip, i) => (
              <button
                key={chip.label}
                onClick={() => setActiveEvent(i)}
                className={`px-3 py-1.5 rounded-full font-label-md text-[11px] transition-all flex items-center gap-1 ${
                  activeEvent === i
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                }`}>
                {chip.label}
                {chip.count && (
                  <span className={`w-4 h-4 rounded-full text-[10px] font-bold inline-flex items-center justify-center ${
                    activeEvent === i ? 'bg-primary/20' : 'bg-surface-container-high'
                  }`}>{chip.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Role track + summary row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider mr-1">Role Track:</span>
              {ROLE_TRACKS.map(r => (
                <button
                  key={r}
                  onClick={() => setActiveRole(rr => rr === r ? null : r)}
                  className={`px-2.5 py-1 rounded-md font-label-md text-[11px] cursor-pointer transition-colors ${
                    activeRole === r
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}>{r}</button>
              ))}
              <div className="h-4 w-[1px] bg-outline-variant mx-1 hidden sm:block" />
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={urgentOnly}
                  onChange={e => setUrgentOnly(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <span className="font-label-md text-[11px] text-on-surface font-medium">Urgent (&lt; 2 spots)</span>
              </label>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-label-sm text-[11px] text-on-surface-variant">
                Showing <span className="font-bold text-on-surface">18 squads</span> •{' '}
                <span className="font-bold text-on-surface">31 positions</span> •{' '}
                <span className="text-secondary font-bold">5 closing in &lt; 48h</span>
              </span>
              <button className="font-label-sm text-[11px] text-primary hover:underline font-semibold">Reset Filters</button>
            </div>
          </div>
        </div>

        {/* ── 12-col Grid ─────────────────────────────────────────────────── */}
        <div className="w-full mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT: Squad Feed (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">

            {SQUADS.map(sq => (
              <article key={sq.id} className="p-5 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col gap-4">

                {/* Top badges + capacity */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[10px] uppercase tracking-wider font-bold">
                      {sq.event}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[10px] font-bold flex items-center gap-1 ${sq.urgencyCls}`}>
                      <span className="material-symbols-outlined text-[13px]">{sq.urgencyIcon}</span>
                      {sq.urgency}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-code-sm text-[12px]">
                    <span className="material-symbols-outlined text-[15px] text-primary">groups</span>
                    <span className="font-bold">{sq.capacity}</span> Filled
                  </div>
                </div>

                {/* Captain header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-sm shrink-0">
                      <img src={sq.captainImg} alt={sq.captainAlt} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-surface-container-lowest" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-headline-md text-[1.125rem] text-on-surface font-bold tracking-tight">{sq.teamName}</h2>
                        {sq.verified && (
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-label-sm text-[11px] font-semibold ${sq.verifiedCls}`}>
                            <span className="material-symbols-outlined text-[12px] text-emerald-600">verified</span>
                            {sq.verified}
                          </span>
                        )}
                      </div>
                      <p className="font-label-md text-[11px] text-on-surface-variant mt-0.5">{sq.captainInfo}</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end shrink-0">
                    <span className="font-label-sm text-[10px] text-outline">{sq.affLabel}</span>
                    <span className={`font-label-md text-[12px] font-semibold ${sq.affCls}`}>{sq.affValue}</span>
                  </div>
                </div>

                {/* Pitch */}
                <p className="font-body-md text-sm text-on-surface leading-relaxed">{sq.pitch}</p>

                {/* Tech tags */}
                {sq.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {sq.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-code-sm text-[11px]">{t}</span>
                    ))}
                  </div>
                )}

                {/* Open roles */}
                <div className="flex flex-col gap-2">
                  {sq.roles.length > 1 && (
                    <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-bold">
                      Open Positions ({sq.roles.length} Vacancies):
                    </span>
                  )}
                  <div className={`grid gap-2 ${sq.roles.length > 1 ? 'grid-cols-1' : 'grid-cols-1'}`}>
                    {sq.roles.map(role => (
                      <div key={role.title}
                        className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0">{role.icon}</span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-label-lg text-[12px] font-bold text-on-surface">{role.title}</h3>
                              <span className="px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-code-sm text-[10px] font-bold">{role.spot}</span>
                              {role.badge && (
                                <span className={`px-1.5 py-0.5 rounded font-label-sm text-[10px] font-bold ${role.badgeCls}`}>{role.badge}</span>
                              )}
                            </div>
                            {role.desc && (
                              <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">{role.desc}</p>
                            )}
                          </div>
                        </div>
                        <button className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-white text-primary font-label-md text-[11px] font-bold shadow-sm shrink-0 transition-transform active:scale-95">
                          Apply For Role
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-outline-variant/10">
                  <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-[11px]">
                    {sq.footerLeft && (
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-primary text-[15px]">info</span>
                        {sq.footerLeft}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {sq.footerExtra && (
                      <button className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[12px]">
                        {sq.footerExtra}
                      </button>
                    )}
                    <button
                      onClick={() => navigate('/events')}
                      className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-lg text-[12px] font-semibold shadow-sm transition-all">
                      {sq.actionLabel}
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {/* Pagination */}
            <div className="w-full py-4 flex items-center justify-between">
              <span className="font-label-md text-[11px] text-on-surface-variant">Showing 4 of 18 squads</span>
              <button className="px-5 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[12px] font-semibold transition-all">
                Load Next 6 Squad Recruitments
              </button>
            </div>
          </div>

          {/* RIGHT: Sidebar (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">

            {/* 1. Form a Squad callout */}
            <div className="p-5 rounded-xl bg-primary text-on-primary shadow-md relative overflow-hidden flex flex-col gap-4">
              <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-primary-container blur-xl pointer-events-none" />
              <div className="relative z-10">
                <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary font-label-sm text-[10px] uppercase font-bold tracking-wider">
                  Lead a Project
                </span>
                <h3 className="font-headline-md text-[1.125rem] font-bold mt-2 tracking-tight">Forming a New Squad?</h3>
                <p className="font-body-sm text-[12px] text-on-primary-container mt-1 leading-relaxed">
                  Find verified campus teammates with complimentary skills for SIH 2026, robotics leagues, or deep tech grant proposals.
                </p>
              </div>
              <button
                id="sidebar-create-squad-btn"
                className="relative z-10 w-full py-2.5 rounded-lg bg-secondary-container text-on-secondary-fixed font-label-lg text-[13px] font-bold shadow hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                + Create Squad Recruitment
              </button>
              <div className="relative z-10 flex items-start gap-2 p-3 rounded-lg bg-primary-container/60 text-[11px] font-body-sm text-on-primary-container leading-snug">
                <span className="material-symbols-outlined text-[15px] text-secondary-container shrink-0 mt-0.5">tips_and_updates</span>
                <span><strong>Pro-Tip:</strong> Teams with clearly articulated problem statements receive 5× more relevant applicants within 24 hours.</span>
              </div>
            </div>

            {/* 2. Available Free Agents */}
            <div className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-[14px] text-on-surface font-semibold">Available Free Agents</h2>
                <span className="font-label-sm text-[11px] text-primary font-bold">42 Online</span>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant -mt-1">Looking for Active Squads</p>

              <div className="flex flex-col gap-2">
                {FREE_AGENTS.map(a => (
                  <div key={a.name} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-label-md text-[12px] font-bold shrink-0 ${a.color}`}>
                      {a.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-label-md text-[12px] text-on-surface font-semibold block">{a.name}</span>
                      <span className="font-body-sm text-[10px] text-on-surface-variant truncate block">{a.info}</span>
                      <span className="font-code-sm text-[10px] text-outline">{a.tags}</span>
                    </div>
                    <button className="px-2 py-1 rounded bg-surface-container hover:bg-primary-container text-primary font-label-md text-[11px] font-semibold transition-colors shrink-0">
                      Invite
                    </button>
                  </div>
                ))}
              </div>

              <button className="flex items-center gap-1 text-primary font-label-md text-[11px] font-semibold hover:underline mt-1">
                Browse all 42 Free Agents
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>

            {/* 3. Roster Regulations */}
            <div className="rounded-xl bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary">gavel</span>
                <h2 className="font-headline-sm text-[14px] text-on-surface font-semibold">Roster Regulations</h2>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant -mt-1">
                Strict guidelines enforced by Institutional Innovation Council for academic term credit:
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { icon: 'diversity_1', title: 'Gender Diversity', desc: 'Minimum 1 female member mandatory for SIH 2026 hackathon teams.' },
                  { icon: 'auto_awesome', title: 'Multidisciplinary Bonus', desc: 'Cross-departmental squads receive +15 points during internal jury reviews.' },
                  { icon: 'lock_clock',   title: 'Mentor Lock', desc: 'Faculty mentor endorsement required before final roster freeze.' },
                ].map(r => (
                  <div key={r.title} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0 mt-0.5">{r.icon}</span>
                    <div>
                      <span className="font-label-md text-[11px] text-on-surface font-semibold block">{r.title}:</span>
                      <span className="font-body-sm text-[11px] text-on-surface-variant">{r.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="flex items-center gap-1.5 text-primary font-label-md text-[11px] font-semibold hover:underline mt-1">
                <span className="material-symbols-outlined text-[15px]">download</span>
                Download Official Team Guidelines (.PDF)
              </button>
            </div>

            {/* 4. Cryptographic Team Ledger */}
            <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">verified_user</span>
                <span className="font-label-md text-[12px] text-on-surface font-semibold">Cryptographic Team Ledger</span>
                <span className="ml-auto font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-surface-container font-code-sm text-outline">ECDSA-256</span>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant leading-snug">
                All squad invitations and roster agreements are cryptographically registered on the campus ledger to prevent duplicate registrations across competing labs.
              </p>
              <div className="flex items-center gap-2 font-code-sm text-[10px] text-outline mt-1">
                <span>1X: #SQ-8841-MATCH</span>
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Ledger Synced
                </span>
              </div>
            </div>

          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
