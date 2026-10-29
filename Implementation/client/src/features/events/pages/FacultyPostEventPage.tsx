import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEvent } from '../hooks/useCreateEvent';
import type { CreateEventInput, EventType } from '../types';
import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';

// ── Static data ───────────────────────────────────────────────────────────────
const EVENT_TYPES: { value: EventType; label: string; icon: string; color: string }[] = [
  { value: 'hackathon',   label: 'Hackathon',          icon: 'bolt',             color: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  { value: 'competition', label: 'Paper Presentation', icon: 'description',      color: 'bg-primary-fixed text-on-primary-fixed-variant' },
  { value: 'workshop',    label: 'Workshop',           icon: 'build',            color: 'bg-secondary-fixed text-on-secondary-fixed' },
  { value: 'seminar',     label: 'Designathon',        icon: 'palette',          color: 'bg-surface-variant text-on-surface-variant' },
  { value: 'sports',      label: 'Research Sprint',    icon: 'science',          color: 'bg-primary-container text-on-primary' },
];

const BRANCH_OPTIONS = ['CSE', 'IT', 'CSIT', 'ECE', 'EEE', 'AIML', 'DS', 'CY', 'MECH', 'CIVIL'];
const YEAR_OPTIONS   = [
  { label: '1st Year', value: 1 },
  { label: '2nd Year', value: 2 },
  { label: '3rd Year', value: 3 },
  { label: '4th Year', value: 4 },
];

const BROADCAST_CHANNELS = [
  { id: 'push',     icon: 'notifications_active', label: 'Push Broadcast Notification', sub: 'Alert 1,420 matched students across CSE, IT, ECE, EEE', enabled: true },
  { id: 'pin',      icon: 'push_pin',             label: 'Pin to Campus Spotlight',     sub: 'Feature at hero level in Student Feed for 72 hours',     enabled: true },
  { id: 'calendar', icon: 'calendar_today',        label: 'Sync with Department Calendar', sub: 'Export event schedule to Outlook / Google Calendar feeds', enabled: false },
];

const RUBRIC_ROWS = [
  { category: 'National Hackathon (Winner)',   pts: '+5 Pts' },
  { category: 'Vendor Cloud Cert (Assoc)',     pts: '+3 Pts' },
  { category: 'NPTEL Elite + Silver (>75%)',   pts: '+4 Pts' },
  { category: 'Paper Published (Scopus/IEEE)', pts: '+5 Pts' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FacultyPostEventPage() {
  const navigate = useNavigate();
  const { mutateAsync: createEvent, isPending } = useCreateEvent();

  const [form, setForm] = useState<CreateEventInput>({
    title:            'TechNova 2026 National Hackathon',
    type:             'hackathon',
    organizer:        'IIT Kharagpur • Campus Innovation Council',
    deadline:         '2026-02-28',
    eventDate:        '2026-03-22',
    eligibility:      { branches: ['CSE', 'IT', 'ECE', 'EEE'], years: [2, 3, 4] },
    teamSize:         { min: 2, max: 4 },
    fee:              '',
    link:             'https://technova2026.iitkgp.ac.in',
    summary:          'A premier 48-hour national collegiate hackathon focused on AI and sustainable hardware prototyping. Top 3 campus squads receive Rs 2 Lakhs prize pool + pre-incubation fast-track. Recognized for institutional attendance credit (On-Duty leaves endorsed).',
    registrationMode: 'external',
  });
  const [error, setError] = useState('');
  const [broadcasts, setBroadcasts] = useState({ push: true, pin: true, calendar: false });
  const [odPass, setOdPass] = useState(true);

  function setField<K extends keyof CreateEventInput>(key: K, value: CreateEventInput[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }
  function toggleBranch(b: string) {
    setForm(f => {
      const list = f.eligibility?.branches ?? [];
      return { ...f, eligibility: { ...f.eligibility, branches: list.includes(b) ? list.filter(x => x !== b) : [...list, b] } };
    });
  }
  function toggleYear(y: number) {
    setForm(f => {
      const list = f.eligibility?.years ?? [];
      return { ...f, eligibility: { ...f.eligibility, years: list.includes(y) ? list.filter(x => x !== y) : [...list, y] } };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const toISO = (d?: string) => d ? new Date(d + 'T00:00:00.000Z').toISOString() : undefined;
      await createEvent({ ...form, deadline: toISO(form.deadline), eventDate: toISO(form.eventDate) });
      navigate('/events/my');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event.');
    }
  }

  const rawNotice = `📢 *NATIONAL LEVEL HACKATHON 2026 ALERT* 📢\nRespected Faculty & Students, IIT Kharagpur is organizing TechNova 2026 Hackathon on March 22-24, 2026. Teams of 2 to 4 students from CSE, IT, ECE, EEE (2nd to 4th year). Registration deadline is Feb 28, 2026 11:59 PM. Registration fee is FREE. Cash prizes worth Rs 2 Lakhs + incubator seed grant. Apply at https://technova2026.iitkgp.ac.in. Ensure college approval.`;

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
      <AppBar subtitle="Faculty Portal" />

      <main className="w-full pt-16 max-w-7xl mx-auto px-4 lg:px-8 pb-28 lg:pb-12">

        {/* ── Breadcrumb + Faculty info ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-outline-variant/10">
          <nav className="flex items-center gap-1.5 font-label-md text-[11px] text-on-surface-variant flex-wrap">
            <span>Campus Ledger</span>
            <span className="material-symbols-outlined text-[13px]">chevron_right</span>
            <span>Faculty Portal</span>
            <span className="material-symbols-outlined text-[13px]">chevron_right</span>
            <span className="text-on-surface font-semibold">Post New Campus Event</span>
            <span className="mx-2 h-3.5 w-[1px] bg-outline-variant hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Node #INVENTUM-FACULTY-09
            </span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-[12px] font-bold">VR</div>
              <div>
                <div className="font-label-md text-[11px] text-on-surface font-semibold flex items-center gap-1.5">
                  Dr. V. Ramanathan
                  <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                </div>
                <div className="font-label-sm text-[10px] text-on-surface-variant">CS Dept. Coordinator • Emp #8841</div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="font-label-sm text-[10px] text-on-surface-variant">Dean Sign-off Active</div>
              <div className="font-code-sm text-[10px] text-primary">ECDSA-SEC256K1</div>
            </div>
          </div>
        </div>

        {/* ── Step progress ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 py-4">
          {[
            { n: 1, label: 'Pasted Raw Notice', sub: 'Parsed 100% ✓', done: true },
            { n: 2, label: 'Field Validation',  sub: '8/8 Validated', active: true },
            { n: 3, label: 'Distribution & Endorse', sub: 'Standing By', done: false },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && <div className="h-[1px] w-10 bg-outline-variant/30 hidden sm:block" />}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-label-md text-[12px] font-bold ${s.done ? 'bg-emerald-500 text-white' : s.active ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline'}`}>
                  {s.done ? <span className="material-symbols-outlined text-[14px]">check</span> : s.n}
                </div>
                <div>
                  <div className={`font-label-md text-[11px] font-semibold uppercase tracking-wide ${s.done ? 'text-on-surface-variant' : s.active ? 'text-primary' : 'text-outline'}`}>
                    {s.active ? <><span className="text-[9px]">STEP {s.n} • </span><span className="text-primary">ACTIVE</span></> : `STEP ${s.n}`}
                  </div>
                  <div className="font-label-sm text-[12px] text-on-surface font-semibold">{s.label}</div>
                  <div className={`font-label-sm text-[10px] ${s.done ? 'text-emerald-600' : s.active ? 'text-on-surface-variant' : 'text-outline'}`}>{s.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main 2-col grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT: Main form (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-5">

            {/* Neural Parser Raw Circular */}
            <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary-container/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-secondary">psychology</span>
                  </div>
                  <div>
                    <div className="font-label-lg text-[13px] text-on-surface font-semibold">Neural Parser &amp; Raw Circular</div>
                    <div className="font-label-sm text-[10px] text-on-surface-variant">Intelligent LLM Ingestion node via Ministry &amp; Campus API</div>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] transition-colors">
                  <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                  Toggle Source Text
                </button>
              </div>
              <div className="bg-surface-container-low rounded-lg p-4 font-code-sm text-[11px] text-on-surface leading-relaxed border border-outline-variant/10 whitespace-pre-wrap mb-3">
                {rawNotice}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-label-sm text-[11px] text-primary">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Extracted with 98% accuracy • 8 fields auto-populated • Verified against Ministry of Education Registry
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">refresh</span>
                    Re-paste Notice
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">receipt_long</span>
                    View Parsing Log
                  </button>
                </div>
              </div>
            </section>

            {/* Event Media & Promotional Canvas */}
            <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">image</span>
                  <span className="font-label-lg text-[13px] text-on-surface font-semibold">Event Media &amp; Promotional Canvas</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px]">
                    <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                    Regenerate AI Banner
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px]">
                    <span className="material-symbols-outlined text-[13px]">add_photo_alternate</span>
                    Replace with Custom Image
                  </button>
                </div>
              </div>
              {/* Banner preview */}
              <div className="relative rounded-lg overflow-hidden bg-surface-container h-48 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary-container/60 to-tertiary/60 flex items-end p-4">
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded">
                    <span className="material-symbols-outlined text-white text-[12px]">auto_fix_high</span>
                    <span className="font-label-sm text-[10px] text-white">Auto-suggested Banner (AI Match 94%)</span>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/40 px-2 py-1 rounded">
                    <span className="font-label-sm text-[10px] text-white">Dimensions: 1200 × 480px</span>
                  </div>
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-fixed font-label-sm text-[10px] font-bold">HACKATHON • NATIONAL TIER</span>
                      <span className="px-2 py-0.5 rounded bg-error text-on-error font-label-sm text-[10px] font-bold">12 days left</span>
                    </div>
                    <div className="font-headline-lg text-[18px] text-white font-bold leading-tight">TechNova 2026 National Hackathon</div>
                    <div className="font-label-sm text-[11px] text-white/80">IIT Kharagpur • Campus Innovation Council</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 font-label-sm text-[10px] text-on-surface-variant">
                <span>Curated from: IIT KGP TechNova Official Media Assets Hub</span>
                <span>Aspect Ratio 2.5:1</span>
              </div>
            </section>

            {/* Field Validation Form */}
            <form onSubmit={handleSubmit}>
              <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-4">

                {error && (
                  <div className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-xs flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                    {error}
                  </div>
                )}

                {/* Event Title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="ev-title" className="font-label-sm text-[10px] text-outline uppercase tracking-wider flex items-center gap-1.5">
                      Event Title
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-[9px] font-bold">Parsed ✓</span>
                    </label>
                    <span className="font-label-sm text-[10px] text-outline">Max 80 chars</span>
                  </div>
                  <input id="ev-title" value={form.title} onChange={e => setField('title', e.target.value)}
                    className="w-full h-11 px-4 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold" />
                </div>

                {/* Event Category */}
                <div>
                  <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-2">Event Category &amp; Format</label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map(t => (
                      <button key={t.value} type="button" onClick={() => setField('type', t.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-md text-[12px] border transition-all ${
                          form.type === t.value
                            ? 'bg-primary-container text-on-primary border-primary-container font-semibold shadow-sm'
                            : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/40'
                        }`}>
                        <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Organizer + Link + Validated */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Organizing Institute &amp; Host</label>
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-label-sm text-[9px] font-bold">External Lead</span>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">business</span>
                      <input value={form.organizer ?? ''} onChange={e => setField('organizer', e.target.value)}
                        className="w-full h-10 pl-9 pr-2 rounded-lg bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-1.5">Direct Registration Link</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">link</span>
                      <input value={form.link ?? ''} onChange={e => setField('link', e.target.value)}
                        className="w-full h-10 pl-9 pr-2 rounded-lg bg-surface-container-low text-on-surface font-code-sm text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-1.5">Validated URL</label>
                    <button type="button" className="h-10 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[11px] flex items-center gap-1.5 w-full">
                      <span className="material-symbols-outlined text-[14px]">wifi_tethering</span>
                      Test Link
                      <span className="material-symbols-outlined text-[14px] ml-auto">open_in_new</span>
                    </button>
                  </div>
                </div>

                {/* Deadline + Team Size + Fee */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Deadline (IST)</label>
                      <span className="px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-label-sm text-[9px] font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[11px]">calendar_today</span>
                        12d left
                      </span>
                    </div>
                    <input type="date" value={form.deadline ?? ''} onChange={e => setField('deadline', e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <div className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">28 Feb 2026, 11:59 PM</div>
                  </div>
                  <div>
                    <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-1.5">Squad Size</label>
                    <div className="flex items-center gap-2 h-10">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[16px]">group</span>
                        <input type="number" min={1} max={form.teamSize?.max ?? 10} value={form.teamSize?.min ?? 2}
                          onChange={e => setField('teamSize', { ...form.teamSize!, min: +e.target.value })}
                          className="w-full h-10 pl-8 pr-2 rounded-lg bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <span className="text-outline font-label-md text-[12px]">–</span>
                      <input type="number" min={form.teamSize?.min ?? 1} max={20} value={form.teamSize?.max ?? 4}
                        onChange={e => setField('teamSize', { ...form.teamSize!, max: +e.target.value })}
                        className="flex-1 h-10 px-2 rounded-lg bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">2 – 4 Members</div>
                  </div>
                  <div>
                    <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-1.5">Entry Fee</label>
                    <div className="relative h-10">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-code-sm text-[14px] text-outline">₹</span>
                      <input value={form.fee ?? ''} onChange={e => setField('fee', e.target.value)}
                        placeholder="0"
                        className="w-full h-10 pl-8 pr-3 rounded-lg bg-surface-container-low text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">₹0 (Free Entry)</div>
                  </div>
                </div>

                {/* Eligible Years */}
                <div>
                  <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-2">Eligible Academic Years</label>
                  <div className="flex flex-wrap gap-2">
                    {YEAR_OPTIONS.map(y => {
                      const sel = form.eligibility?.years?.includes(y.value);
                      return (
                        <button key={y.value} type="button" onClick={() => toggleYear(y.value)}
                          className={`px-3 py-1.5 rounded-full font-label-md text-[12px] border transition-all ${sel ? 'bg-primary-container text-on-primary border-primary-container font-semibold' : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/40'}`}>
                          {sel && <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">check</span>}
                          {y.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Eligible Branches */}
                <div>
                  <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider block mb-2">Eligible Branches / Programs</label>
                  <div className="flex flex-wrap gap-2">
                    {BRANCH_OPTIONS.map(b => {
                      const sel = form.eligibility?.branches?.includes(b);
                      return (
                        <button key={b} type="button" onClick={() => toggleBranch(b)}
                          className={`px-2.5 py-1 rounded-full font-label-md text-[11px] transition-all ${sel ? 'bg-primary-container text-on-primary font-semibold' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
                          {b}{sel ? ' ×' : ''}
                        </button>
                      );
                    })}
                    <button type="button" className="px-2.5 py-1 rounded-full font-label-md text-[11px] bg-surface-container text-primary hover:bg-surface-container-high flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">add</span>
                      Add Branch
                    </button>
                  </div>
                </div>

                {/* Campus Feed Summary */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <label className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Campus Feed Summary &amp; Academic Highlights</label>
                      <span className="material-symbols-outlined text-[14px] text-tertiary">auto_awesome</span>
                    </div>
                    <button type="button" className="font-label-sm text-[11px] text-primary hover:underline flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">refresh</span>
                      Re-synthesize via AI
                    </button>
                  </div>
                  <textarea rows={3} value={form.summary ?? ''} onChange={e => setField('summary', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>

                {/* Campus Activity Points Allocation */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-label-md text-[12px] text-on-surface font-semibold">Campus Activity Points Allocation</div>
                    <div className="font-body-sm text-[11px] text-on-surface-variant">Accredited automatically to student academic portfolio upon verified certificate submission</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-primary/10 text-primary font-label-sm text-[11px] font-bold">+4 Activity Pts</span>
                    <button type="button" className="flex items-center gap-0.5 text-primary font-label-md text-[11px] hover:underline">
                      Rubric <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Bottom action bar ─────────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
                <button type="button" onClick={() => navigate(-1)}
                  className="px-5 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-sm flex items-center justify-center gap-2">
                  Cancel / Discard Draft
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" className="px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Draft
                  </button>
                  <button type="submit" disabled={isPending}
                    id="publish-event-btn"
                    className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-sm font-semibold shadow-sm hover:bg-primary-container transition-all flex items-center gap-2 disabled:opacity-60 active:scale-[0.98]">
                    {isPending
                      ? <><span className="w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />Publishing…</>
                      : <><span className="material-symbols-outlined text-[16px]">send</span>Publish Event to Campus Hub ▷</>
                    }
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* RIGHT SIDEBAR (4 cols) */}
          <aside className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">

            {/* Live Student Feed Simulator */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">preview</span>
                  <span className="font-label-md text-[12px] text-on-surface font-semibold">Live Student Feed Simulator</span>
                </div>
                <button onClick={() => navigate('/events')} className="font-label-sm text-[11px] text-primary hover:underline">Screen 3 View</button>
              </div>
              {/* Event card preview */}
              <div className="rounded-lg overflow-hidden border border-outline-variant/10">
                <div className="relative h-28 bg-gradient-to-br from-primary to-primary-container flex items-end p-3">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-fixed font-label-sm text-[9px] font-bold">HACKATHON • NATIONAL TIER</span>
                    <span className="px-1.5 py-0.5 rounded bg-error text-on-error font-label-sm text-[9px] font-bold">12 days left</span>
                  </div>
                  <div>
                    <div className="font-headline-sm text-[13px] text-on-primary font-bold leading-tight">TechNova 2026 National Hackathon</div>
                    <div className="font-label-sm text-[10px] text-on-primary/80">IIT Kharagpur • Campus Innovation Council</div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mb-2">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">group</span>Squad: 2-4 members</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">emoji_events</span>Prize: ₹2,00,000</span>
                  </div>
                  <p className="font-body-sm text-[10px] text-on-surface-variant leading-relaxed mb-3">A premier 48-hour national collegiate hackathon focused on AI and sustainable…</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-primary/10 text-primary font-label-sm text-[10px] font-semibold">+4 Activity Pts</span>
                    <span className="px-2 py-1 rounded bg-surface-container text-on-surface font-label-sm text-[10px]">Free</span>
                    <button className="ml-auto px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-[11px] font-semibold">Apply Now →</button>
                  </div>
                </div>
              </div>
              <p className="font-label-sm text-[10px] text-on-surface-variant mt-2 text-center">Matches filters for 1,420 registered engineering students</p>
            </div>

            {/* Campus Broadcast Channels */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold mb-3">Campus Broadcast Channels</h2>
              <div className="flex flex-col gap-3">
                {BROADCAST_CHANNELS.map(ch => (
                  <div key={ch.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 flex-shrink-0">{ch.icon}</span>
                      <div className="min-w-0">
                        <div className="font-label-md text-[12px] text-on-surface font-semibold">{ch.label}</div>
                        <div className="font-body-sm text-[10px] text-on-surface-variant leading-snug">{ch.sub}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setBroadcasts(prev => ({ ...prev, [ch.id]: !prev[ch.id as keyof typeof broadcasts] }))}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${broadcasts[ch.id as keyof typeof broadcasts] ? 'bg-primary' : 'bg-surface-container-high'}`}>
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 mt-1 ${broadcasts[ch.id as keyof typeof broadcasts] ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
                {/* OD Pass */}
                <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/10">
                  <input type="checkbox" id="od-pass" checked={odPass} onChange={e => setOdPass(e.target.checked)}
                    className="w-4 h-4 rounded border-outline accent-primary" />
                  <label htmlFor="od-pass" className="font-label-md text-[11px] text-on-surface cursor-pointer">
                    <span className="font-semibold">Automatic On-Duty (OD) Attendance Pass</span>
                    <p className="font-body-sm text-[10px] text-on-surface-variant">Grant pre-authorised collegiate attendance leaves for verified shortlisted student applicants.</p>
                  </label>
                </div>
              </div>
            </div>

            {/* Faculty Endorsement & Compliance */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[18px] text-primary">task_alt</span>
                <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold">Faculty Endorsement &amp; Compliance</h2>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant mb-3 leading-relaxed">
                By publishing, you certify that this external competition meets institutional academic integrity standards and qualifies eligible students for college travel grants &amp; OD attendance.
              </p>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">verified_user</span>
                <div>
                  <div className="font-label-md text-[12px] text-on-surface font-semibold">Digitally Signed: Dr. V. Ramanathan</div>
                  <div className="font-code-sm text-[10px] text-on-surface-variant">ECDSA Key #8841-A • Feb 2026</div>
                </div>
              </div>
            </div>

            {/* Accreditation Rubric */}
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-headline-sm text-[13px] text-on-surface font-semibold">Point Rubric</h2>
                <span className="font-code-sm text-[10px] text-outline">Rev. 2025</span>
              </div>
              <div className="rounded-lg overflow-hidden border border-outline-variant/10">
                <div className="grid grid-cols-2 bg-surface-container px-3 py-2">
                  <span className="font-label-sm text-[9px] text-outline uppercase tracking-wider">Activity</span>
                  <span className="font-label-sm text-[9px] text-outline uppercase tracking-wider text-right">Points</span>
                </div>
                {RUBRIC_ROWS.map(r => (
                  <div key={r.category} className="grid grid-cols-2 px-3 py-2 border-t border-outline-variant/10">
                    <span className="font-body-sm text-[10px] text-on-surface">{r.category}</span>
                    <span className="font-label-sm text-[10px] text-primary font-semibold text-right">{r.pts}</span>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
