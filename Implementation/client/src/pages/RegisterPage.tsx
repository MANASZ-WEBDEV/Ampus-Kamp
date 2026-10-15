import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '@/features/auth/api/auth.api';
import { ApiError } from '@/lib/apiClient';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ enrollmentNo: '', collegeId: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = (p: string) => {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-error', 'bg-secondary-container', 'bg-primary-fixed', 'bg-primary-container'];
  const score = passwordStrength(form.password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (score < 2) {
      setError('Password is too weak. Add uppercase letters, numbers, or symbols.');
      return;
    }
    setLoading(true);
    try {
      const { userId, message } = await authApi.register({
        enrollmentNo: form.enrollmentNo,
        collegeId: form.collegeId,
        password: form.password,
      });
      navigate('/verify', { state: { userId, message }, replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full max-w-5xl">

        {/* ── LEFT — Brand ────────────────────────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-primary text-on-primary rounded-xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-primary-container/40 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
              <div>
                <span className="font-headline-sm text-headline-sm block">Campus Innovation</span>
                <span className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-wider block">Engineering Incubator Hub</span>
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm mb-3">
                <span className="material-symbols-outlined text-xs">how_to_reg</span>
                New Student Activation
              </span>
              <h1 className="font-headline-xl text-headline-xl text-surface-bright leading-tight">
                Activate your campus identity.
              </h1>
              <p className="font-body-md text-body-md text-primary-fixed-dim mt-3">
                Your enrollment number and college ID are verified against the official student roster.
                Name, department, and year are pulled directly from the record — you don't need to enter them.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-3 mt-2">
              {[
                { step: '01', icon: 'fingerprint', label: 'Enter enrollment no. + college ID' },
                { step: '02', icon: 'key', label: 'Set a secure password' },
                { step: '03', icon: 'mark_email_read', label: 'Verify OTP sent to your college email' },
              ].map(({ step, icon, label }) => (
                <div key={step} className="flex items-center gap-4 p-3.5 rounded-xl bg-primary-container/40">
                  <div className="w-9 h-9 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0 font-code-sm text-code-sm font-bold">
                    {step}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-fixed-dim text-lg">{icon}</span>
                    <span className="font-body-sm text-body-sm text-surface-bright">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-6 bg-primary-container/60 p-4 rounded-xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-fixed text-xl">info</span>
              <p className="font-body-sm text-body-sm text-primary-fixed-dim">
                Faculty & admin accounts are provisioned by your campus IT office. Use the login page if you already have credentials.
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Registration Form ───────────────────────────────── */}
        <div className="lg:col-span-7 flex flex-col bg-surface-container-lowest rounded-xl p-8 shadow-md">
          <div className="flex items-center justify-between pb-6">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">New Student Activation</h2>
            <Link to="/login" className="font-label-lg text-label-lg text-primary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Sign In
            </Link>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6">
            Your roster entry will be verified — name, department & year are auto-filled from the official record.
          </p>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-lg shrink-0">error_outline</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 flex-1" id="register-form">
            {/* Enrollment No */}
            <div>
              <label htmlFor="reg-enrollmentNo" className="font-label-lg text-label-lg text-on-surface mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">Enrollment Number <span className="text-error">*</span></span>
                <span className="px-2 py-0.5 rounded bg-surface-container-low font-code-sm text-code-sm text-on-surface-variant">Format: YY-BRANCH-ROLL</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-xl">fingerprint</span>
                </div>
                <input
                  id="reg-enrollmentNo"
                  type="text"
                  required
                  value={form.enrollmentNo}
                  onChange={e => setForm(f => ({ ...f, enrollmentNo: e.target.value.toUpperCase() }))}
                  placeholder="e.g. 22CS0001"
                  className="w-full pl-11 pr-4 py-3 bg-surface-container-low text-on-surface font-code-sm text-code-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* College ID */}
            <div>
              <label htmlFor="reg-collegeId" className="font-label-lg text-label-lg text-on-surface mb-1.5 flex items-center gap-1.5">
                College ID <span className="text-error">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-xl">badge</span>
                </div>
                <input
                  id="reg-collegeId"
                  type="text"
                  required
                  value={form.collegeId}
                  onChange={e => setForm(f => ({ ...f, collegeId: e.target.value }))}
                  placeholder="e.g. COL2025"
                  className="w-full pl-11 pr-4 py-3 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="font-label-lg text-label-lg text-on-surface mb-1.5 flex items-center gap-1.5">
                Password <span className="text-error">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-xl">key</span>
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="w-full pl-11 pr-12 py-3 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface focus:outline-none">
                  <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {/* Strength meter */}
              {form.password && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= score ? strengthColor[score] : 'bg-surface-container-high'}`} />
                    ))}
                  </div>
                  <span className="font-code-sm text-code-sm text-on-surface-variant">{strengthLabel[score]}</span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="reg-confirm" className="font-label-lg text-label-lg text-on-surface mb-1.5 flex items-center gap-1.5">
                Confirm Password <span className="text-error">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-xl">lock</span>
                </div>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Re-enter password"
                  className={`w-full pl-11 pr-4 py-3 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl focus:outline-none focus:ring-2 transition-all shadow-sm ${form.confirm && form.confirm !== form.password ? 'focus:ring-error/30 ring-2 ring-error/30' : 'focus:ring-primary/30'}`}
                />
                {form.confirm && form.confirm === form.password && (
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-xl text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} id="register-submit"
              className="w-full py-3.5 px-6 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2">
              {loading ? (
                <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Verifying Roster Entry…</>
              ) : (
                <><span>Activate Student Record</span><span className="material-symbols-outlined text-xl">how_to_reg</span></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-surface-container-high flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
            <span>Already activated?</span>
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
