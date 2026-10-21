import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ApiError } from '@/lib/apiClient';

type LoginRole = 'student' | 'faculty';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<LoginRole>('student');
  const [form, setForm] = useState({ enrollmentNo: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const isFaculty = role === 'faculty';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full max-w-5xl">

        {/* ── LEFT PANEL — Brand ──────────────────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-primary text-on-primary rounded-xl p-8 shadow-xl relative overflow-hidden">
          {/* Decorative glows */}
          <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-primary-container/40 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-56 h-56 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <div>
                <span className="font-headline-sm text-headline-sm block">Campus Innovation</span>
                <span className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-wider block">Engineering Incubator Hub</span>
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm">
                <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim animate-ping" />
                Fall 2025 Cohort Intake Active
              </span>
              <h1 className="font-headline-xl text-headline-xl text-surface-bright leading-tight">
                Launch prototypes.<br />Find co-founders.<br />Earn research credit.
              </h1>
              <p className="font-body-md text-body-md text-primary-fixed-dim">
                The unified collegiate workspace for technical builders, hackathon squads, and verified academic innovation.
              </p>
            </div>

            {/* Feature cards */}
            <div className="space-y-3">
              {[
                { icon: 'bolt', title: 'Discover Hackathons', desc: 'Access inter-collegiate hackathons, grants, and regional tech sprints.', color: 'bg-secondary-container text-on-secondary-container' },
                { icon: 'group_work', title: 'Vetted Teammates', desc: 'Filter peers across CS, ECE, Mech & Civil by verified tech stack.', color: 'bg-primary-fixed text-on-primary-fixed' },
                { icon: 'verified_user', title: 'Direct Credit Validation', desc: 'Faculty-approved sync for NPTEL, patents, and capstone credits.', color: 'bg-tertiary-fixed text-on-tertiary-fixed' },
              ].map(({ icon, title, desc, color }) => (
                <div key={icon} className="flex items-start gap-3 p-4 rounded-xl bg-primary-container/40 backdrop-blur-sm">
                  <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-surface-bright">{title}</h3>
                    <p className="font-body-sm text-body-sm text-primary-fixed-dim mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats footer */}
          <div className="relative z-10 mt-6 bg-primary-container/60 p-4 rounded-xl backdrop-blur-md flex items-center justify-between">
            <div>
              <span className="font-headline-sm text-headline-sm block text-surface-bright">4,200+ Students</span>
              <span className="font-label-sm text-label-sm text-primary-fixed-dim">CS • ECE • Mech • Civil Active</span>
            </div>
            <span className="material-symbols-outlined text-secondary-fixed text-2xl">verified</span>
          </div>
        </div>

        {/* ── RIGHT PANEL — Login Form ─────────────────────────────────── */}
        <div className="lg:col-span-7 flex flex-col bg-surface-container-lowest rounded-xl p-8 shadow-md">

          {/* Role tabs + New Activation */}
          <div className="flex items-center justify-between pb-6">
            {/* Role tabs — FULLY FUNCTIONAL */}
            <div className="inline-flex p-1 rounded-xl bg-surface-container-low" role="tablist">
              <button
                id="role-student-btn"
                type="button"
                role="tab"
                aria-selected={!isFaculty}
                onClick={() => setRole('student')}
                className={`px-4 py-2 rounded-lg font-label-lg text-label-lg transition-all duration-200 ${
                  !isFaculty
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">badge</span>
                  Student Portal
                </span>
              </button>
              <button
                id="role-faculty-btn"
                type="button"
                role="tab"
                aria-selected={isFaculty}
                onClick={() => setRole('faculty')}
                className={`px-4 py-2 rounded-lg font-label-lg text-label-lg transition-all duration-200 ${
                  isFaculty
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">assignment_ind</span>
                  Faculty / Admin
                </span>
              </button>
            </div>

            <Link to="/register" className="px-3 py-1.5 rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-all">
              New Activation
            </Link>
          </div>

          {/* Heading — changes based on role */}
          <div className="mb-6">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              {isFaculty ? 'Faculty & Evaluator Portal Login' : 'Institutional Verification & Login'}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              {isFaculty
                ? 'Sign in with your faculty employee credentials to access the dashboard.'
                : 'Authenticate through your official campus directory credentials.'}
            </p>
          </div>

          {/* Faculty context badge */}
          {isFaculty && (
            <div className="mb-5 p-3.5 rounded-xl bg-surface-container-low flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-lg">assignment_ind</span>
              </div>
              <div>
                <p className="font-label-lg text-label-lg text-on-surface">Faculty / Admin Portal</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Use your Employee ID as the Enrollment Number</p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-lg shrink-0">error_outline</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
            {/* Enrollment No */}
            <div>
              <label htmlFor="enrollmentNo" className="font-label-lg text-label-lg text-on-surface mb-1.5 flex items-center gap-1.5">
                {isFaculty ? 'Employee / Faculty ID' : 'Institutional Roll / Enrollment Number'}
                <span className="text-error">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-xl">fingerprint</span>
                </div>
                <input
                  id="enrollmentNo"
                  type="text"
                  required
                  value={form.enrollmentNo}
                  onChange={e => setForm(f => ({ ...f, enrollmentNo: e.target.value.toUpperCase() }))}
                  placeholder={isFaculty ? 'e.g. FAC0042 or EMP-001' : 'e.g. 22CS0001'}
                  className="w-full pl-11 pr-4 py-3 bg-surface-container-low text-on-surface font-code-sm text-code-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5">
                  Account Password <span className="text-error">*</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-xl">key</span>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your security passkey"
                  className="w-full pl-11 pr-12 py-3 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              id="login-submit"
              className="w-full py-3.5 px-6 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                  {isFaculty ? 'Verifying Faculty Record…' : 'Validating Student Record…'}
                </>
              ) : (
                <>
                  <span>Complete Verification &amp; Enter Campus</span>
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-auto pt-8 flex items-center justify-between text-on-surface-variant">
            <div className="flex items-center gap-2 font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-base">support_agent</span>
              {isFaculty ? (
                <span>New faculty? <Link to="/register" className="text-primary font-label-sm text-label-sm underline">Contact admin</Link></span>
              ) : (
                <span>New student? <Link to="/register" className="text-primary font-label-sm text-label-sm underline">Activate account</Link></span>
              )}
            </div>
            <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline">
              <span className="material-symbols-outlined text-base text-secondary-container">security</span>
              FERPA &amp; AICTE Compliant
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
