import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ApiError } from '@/lib/apiClient';
import * as authApi from '@/features/auth/api/auth.api';

type LoginRole = 'student' | 'faculty';
type LoginMode = 'signin' | 'activate';

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 600;

function isValidEnrollmentPattern(value: string): boolean {
  return /^[A-Z0-9]{3,}[-A-Z0-9]*$/.test(value.toUpperCase());
}

function getPasswordStrength(pw: string): { width: string; label: string; colorClass: string } {
  if (pw.length === 0) return { width: '0%', label: '', colorClass: '' };
  if (pw.length < 6)   return { width: '20%', label: 'Weak',   colorClass: 'bg-error' };
  if (pw.length < 10)  return { width: '50%', label: 'Fair',   colorClass: 'bg-secondary-container' };
  if (pw.length < 14 || !/[^a-zA-Z0-9]/.test(pw))
                       return { width: '75%', label: 'Good',   colorClass: 'bg-primary-fixed' };
  return               { width: '100%', label: 'Robust', colorClass: 'bg-primary-container' };
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [role, setRole]                 = useState<LoginRole>('student');
  const [mode, setMode]                 = useState<LoginMode>('signin');
  const [form, setForm]                 = useState({ enrollmentNo: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const [showOtp, setShowOtp]           = useState(false);
  const [otpUserId, setOtpUserId]       = useState('');
  const [digits, setDigits]             = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft]   = useState(OTP_TTL_SECONDS);
  const [otpLoading, setOtpLoading]     = useState(false);
  const [resending, setResending]       = useState(false);
  const [resendMsg, setResendMsg]       = useState('');
  const inputRefs                       = useRef<(HTMLInputElement | null)[]>([]);

  const isFaculty   = role === 'faculty';
  const strength    = getPasswordStrength(form.password);
  const showPattern = isValidEnrollmentPattern(form.enrollmentNo) && form.enrollmentNo.length >= 4;

  useEffect(() => {
    if (!showOtp || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [showOtp, secondsLeft]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ enrollmentNo: form.enrollmentNo, password: form.password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register({ enrollmentNo: form.enrollmentNo, collegeId: form.email, password: form.password });
      setOtpUserId(res.userId);
      setDigits(Array(OTP_LENGTH).fill(''));
      setSecondsLeft(OTP_TTL_SECONDS);
      setShowOtp(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDigitChange(index: number, value: string) {
    if (value.length === OTP_LENGTH && /^\d{6}$/.test(value)) {
      const nd = value.split('');
      setDigits(nd);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, '').slice(-1);
    const nd = [...digits];
    nd[index] = digit;
    setDigits(nd);
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
  }

  async function handleVerifyOtp() {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) { setError('Please enter all 6 digits.'); return; }
    setError('');
    setOtpLoading(true);
    try {
      await authApi.verifyOtp({ userId: otpUserId, code });
      await login({ enrollmentNo: form.enrollmentNo, password: form.password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed. Try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResend() {
    setResending(true); setResendMsg(''); setError('');
    try {
      const { message } = await authApi.resendOtp({ userId: otpUserId });
      setResendMsg(message);
      setSecondsLeft(OTP_TTL_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  }

  const otpCode = digits.join('');

  return (
    /* Full-viewport, no page scroll */
    <div className="h-screen overflow-hidden flex items-center bg-background">
      <div className="flex flex-col lg:flex-row w-full max-w-5xl mx-auto my-6 lg:my-8 gap-5 lg:gap-6 px-6 h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4rem)] overflow-hidden">

        {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-[42%] flex-col justify-between bg-primary text-on-primary rounded-2xl px-9 py-8 shadow-xl relative overflow-hidden shrink-0">
          {/* Glows */}
          <div className="absolute -right-14 -bottom-14 w-64 h-64 rounded-full bg-primary-container/40 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-52 h-52 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <div>
              <span className="font-headline-sm text-headline-sm block leading-tight">Campus Innovation</span>
              <span className="font-label-sm text-label-sm text-primary-fixed-dim uppercase tracking-wider block">Engineering Incubator Hub</span>
            </div>
          </div>

          {/* Headline */}
          <div className="relative z-10 space-y-3 mt-7">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container font-code-sm text-code-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim animate-ping" />
              Academic Year 2026–27 Enrollment Open
            </span>
            <h1 className="font-headline-lg text-headline-lg text-surface-bright leading-snug">
              Build projects.<br />Win hackathons.<br />Get verified credits.
            </h1>
            <p className="font-body-sm text-body-sm text-primary-fixed-dim">
              Your college's unified platform for competitions, team formation, NPTEL credits, and faculty-backed academic innovation.
            </p>
          </div>

          {/* Feature list */}
          <div className="relative z-10 space-y-3 mt-6 flex-1">
            {[
              { icon: 'bolt',         color: 'bg-secondary-container text-on-secondary-container', title: 'Discover Hackathons & Challenges',  desc: 'Instant access to inter-collegiate hackathons, university research grants, and regional tech sprints.' },
              { icon: 'group_work',   color: 'bg-primary-fixed text-on-primary-fixed',             title: 'Vetted Cross-Dept Teammates',        desc: 'Filter prospective peers across CS, ECE, Mechanical & Civil by verified tech stack and git portfolio.' },
              { icon: 'verified_user',color: 'bg-tertiary-fixed text-on-tertiary-fixed',           title: 'Direct Credit Validation',           desc: 'Faculty-approved credit sync for NPTEL courses, patent filings, and departmental capstone credits.' },
            ].map(({ icon, color, title, desc }) => (
              <div key={icon} className="flex items-start gap-4 px-4 py-4 rounded-xl bg-primary-container/40 backdrop-blur-sm">
                <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className="material-symbols-outlined text-base">{icon}</span>
                </div>
                <div>
                  <p className="font-label-lg text-label-lg text-surface-bright leading-tight">{title}</p>
                  <p className="font-body-sm text-body-sm text-primary-fixed-dim leading-snug mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats footer */}
          <div className="relative z-10 mt-6 bg-primary-container/60 px-5 py-4 rounded-xl backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {['bg-secondary-container', 'bg-primary-fixed', 'bg-tertiary-fixed'].map((bg, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${bg} border-2 border-primary flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                  </div>
                ))}
              </div>
              <div>
                <span className="font-label-lg text-label-lg block text-surface-bright">4,200+ Students</span>
                <span className="font-label-sm text-label-sm text-primary-fixed-dim">CS · IT · CSIT · AIML · DS · CY · ECE · EEE · Mech · Civil · Chemical · Biotech</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary-fixed text-xl">verified</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-surface-container-lowest rounded-2xl shadow-md overflow-hidden">

          {/* Top bar — role tabs + mode pills (fixed, no scroll) */}
          <div className="flex items-center justify-between px-8 pt-6 pb-5 border-b border-surface-container-high shrink-0">
            <div className="inline-flex p-1 rounded-lg bg-surface-container-low" role="tablist">
              {(['student', 'faculty'] as LoginRole[]).map(r => (
                <button
                  key={r}
                  id={`role-${r}-btn`}
                  type="button"
                  role="tab"
                  aria-selected={role === r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-1.5 rounded font-label-lg text-label-lg transition-all duration-200 ${
                    role === r ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">{r === 'student' ? 'badge' : 'assignment_ind'}</span>
                    {r === 'student' ? 'Student Portal' : 'Faculty / Admin'}
                  </span>
                </button>
              ))}
            </div>
            <div className="inline-flex items-center gap-1">
              <button
                id="mode-signin-btn"
                type="button"
                onClick={() => { setMode('signin'); setShowOtp(false); setError(''); setResendMsg(''); }}
                className={`px-3 py-1.5 rounded-full font-label-md text-label-md transition-all ${
                  mode === 'signin' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >Sign In</button>
              <button
                id="mode-activate-btn"
                type="button"
                onClick={() => { setMode('activate'); setShowOtp(false); setError(''); setResendMsg(''); }}
                className={`px-3 py-1.5 rounded-full font-label-md text-label-md transition-all ${
                  mode === 'activate' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >New Student Activation</button>
            </div>
          </div>

          {/* Scrollable form area */}
          <div className="flex-1 overflow-y-auto px-8 py-7">

            {/* Heading */}
            <div className="mb-6">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {isFaculty ? 'Faculty & Evaluator Portal Login'
                  : mode === 'activate' ? 'New Student Account Activation'
                  : 'Institutional Verification & Login'}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                {isFaculty ? 'Sign in with your faculty employee credentials to access the dashboard.'
                  : mode === 'activate' ? 'Register your campus enrollment to activate your workspace account.'
                  : 'Authenticate through official campus directory credentials to gain lab & project access.'}
              </p>
            </div>

            {/* Faculty badge */}
            {isFaculty && (
              <div className="mb-4 p-3 rounded-xl bg-surface-container-low flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-base">assignment_ind</span>
                </div>
                <div>
                  <p className="font-label-lg text-label-lg text-on-surface">Faculty / Admin Portal</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Use your Employee ID as the Enrollment Number</p>
                </div>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="mb-3 p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error_outline</span>
                <span>{error}</span>
              </div>
            )}

            {/* Resend success */}
            {resendMsg && (
              <div className="mb-3 p-3 rounded-xl bg-primary-fixed/30 text-on-primary-fixed-variant font-body-sm text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>{resendMsg}</span>
              </div>
            )}

            {/* ── FORM ─────────────────────────────────────────────────────────── */}
            <form
              id="login-form"
              onSubmit={mode === 'signin' ? handleSubmit : handleRegister}
              className="space-y-5"
            >
              {/* Enrollment No */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="enrollmentNo" className="font-label-lg text-label-lg text-on-surface flex items-center gap-1">
                    {isFaculty ? 'Employee / Faculty ID' : 'Institutional Roll / Enrollment Number'}
                    <span className="text-error">*</span>
                  </label>
                  <span className="px-2 py-0.5 rounded bg-surface-container-low font-code-sm text-code-sm text-on-surface-variant">
                    Format: YY-BRANCH-ROLL
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined text-lg">fingerprint</span>
                  </div>
                  <input
                    id="enrollmentNo"
                    type="text"
                    required
                    value={form.enrollmentNo}
                    onChange={e => setForm(f => ({ ...f, enrollmentNo: e.target.value.toUpperCase() }))}
                    placeholder={isFaculty ? 'e.g. FAC0042 or EMP-001' : 'e.g. 21BCE10428'}
                    className="w-full pl-10 pr-28 py-3 bg-surface-container-lowest text-on-surface font-code-sm text-code-sm rounded-xl border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                  {showPattern && (
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        Valid Pattern
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Email — activate mode only */}
              {mode === 'activate' && !showOtp && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="emailInput" className="font-label-lg text-label-lg text-on-surface flex items-center gap-1">
                      Campus Institutional Email <span className="text-error">*</span>
                    </label>
                    <span className="font-label-sm text-label-sm text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">lock</span>
                      @engg.edu domain enforced
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-lg">alternate_email</span>
                    </div>
                    <input
                      id="emailInput"
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="aarav.sharma@engg.edu"
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-xl border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              {!showOtp && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="font-label-lg text-label-lg text-on-surface flex items-center gap-1">
                      Account Password <span className="text-error">*</span>
                    </label>
                    <button type="button" className="font-label-sm text-label-sm text-primary hover:underline">
                      Reset via Campus Portal?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-lg">key</span>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Enter your security passkey"
                      className="w-full pl-10 pr-11 py-3 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-xl border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {mode === 'activate' && form.password.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-surface-container-high overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${strength.colorClass}`} style={{ width: strength.width }} />
                      </div>
                      <span className="font-code-sm text-code-sm text-on-surface-variant">Security: <strong>{strength.label}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Verification Checkpoint (OTP) ──────────────────────────────── */}
              {showOtp && (
                <div className="p-4 rounded-xl bg-surface-container-low space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-secondary-container">format_image_left</span>
                      <span className="font-label-lg text-label-lg text-on-surface">Verification Checkpoint</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-code-sm text-code-sm">Step 2 of 2</span>
                  </div>

                  {/* Student ID card */}
                  <div className="p-3 rounded-lg bg-surface-container-lowest flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-base">badge</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-label-lg text-label-lg text-on-surface truncate">{form.enrollmentNo}</span>
                          <span className="material-symbols-outlined text-sm text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Enrolled • OTP sent to registered email</p>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-primary-container font-bold shrink-0 ml-2">ACTIVE ROSTER</span>
                  </div>

                  {/* OTP inputs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-label-md text-label-md text-on-surface">Enter 6-digit campus authentication code:</label>
                      <span className={`font-code-sm text-code-sm flex items-center gap-1 font-semibold ${secondsLeft < 60 ? 'text-error' : 'text-secondary-container'}`}>
                        <span className="material-symbols-outlined text-xs">timer</span>
                        <span id="otp-countdown">{secondsLeft > 0 ? `${formatTime(secondsLeft)} remaining` : 'Code expired'}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-2" id="otp-box-container">
                      {digits.map((d, i) => (
                        <input
                          key={i}
                          ref={el => { inputRefs.current[i] = el; }}
                          id={`otp-digit-${i}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={OTP_LENGTH}
                          value={d}
                          onChange={e => handleDigitChange(i, e.target.value)}
                          onKeyDown={e => handleKeyDown(i, e)}
                          className={`text-center font-code-sm text-headline-sm py-2 rounded-lg focus:outline-none transition-all
                            ${d ? 'bg-primary-fixed text-on-primary-fixed font-bold' : 'bg-surface-container-lowest text-on-surface border border-surface-container-high'}
                            focus:ring-2 focus:ring-primary/30`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <button
                        id="otp-resend"
                        type="button"
                        onClick={handleResend}
                        disabled={resending || secondsLeft > 540}
                        className="font-label-sm text-label-sm text-primary hover:underline disabled:text-outline disabled:no-underline disabled:cursor-not-allowed"
                      >
                        {resending ? 'Resending…' : secondsLeft > 540 ? `Resend in ${formatTime(secondsLeft - 540)}` : 'Resend code'}
                      </button>
                      {/* SmartCard SSO inline */}
                      <button
                        type="button"
                        id="smartcard-sso-btn"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-highest text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">contactless</span>
                        SmartCard / SSO
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              {!showOtp ? (
                <button
                  type="submit"
                  disabled={loading}
                  id="login-submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      {mode === 'activate' ? 'Creating Account…' : isFaculty ? 'Verifying Faculty…' : 'Validating Record…'}
                    </>
                  ) : (
                    <>
                      <span>{mode === 'activate' ? 'Activate New Student Record' : 'Complete Verification & Enter Campus'}</span>
                      <span className="material-symbols-outlined text-lg">{mode === 'activate' ? 'how_to_reg' : 'arrow_forward'}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  id="otp-submit"
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otpCode.length < OTP_LENGTH || secondsLeft <= 0}
                  className="w-full py-3.5 px-6 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {otpLoading ? (
                    <><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>Verifying…</>
                  ) : (
                    <><span>Complete Verification & Enter Campus</span><span className="material-symbols-outlined text-lg">arrow_forward</span></>
                  )}
                </button>
              )}
            </form>
          </div>

          {/* Footer — fixed at bottom of panel */}
          <div className="shrink-0 px-8 py-4 border-t border-surface-container-high flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">support_agent</span>
              <span className="font-body-sm text-body-sm">
                Trouble verifying?{' '}
                <a href="#" className="text-primary font-label-sm text-label-sm underline hover:text-primary-container">
                  Contact Campus IT Helpdesk
                </a>{' '}
                or upload badge scan.
              </span>
            </div>
            <div className="flex items-center gap-1 text-outline shrink-0 ml-4">
              <span className="material-symbols-outlined text-sm text-secondary-container">security</span>
              <span className="font-label-sm text-label-sm tracking-wide whitespace-nowrap">FERPA & AICTE Compliant</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
