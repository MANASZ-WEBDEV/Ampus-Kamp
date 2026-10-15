import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import * as authApi from '@/features/auth/api/auth.api';
import { ApiError } from '@/lib/apiClient';

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 600; // 10 minutes

export default function OtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const state = location.state as { userId?: string; message?: string } | null;
  const userId = state?.userId ?? '';

  // Redirect if arrived without userId
  useEffect(() => {
    if (!userId) navigate('/register', { replace: true });
  }, [userId, navigate]);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function handleDigitChange(index: number, value: string) {
    // Handle paste of full OTP
    if (value.length === OTP_LENGTH && /^\d{6}$/.test(value)) {
      const newDigits = value.split('');
      setDigits(newDigits);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter all 6 digits.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.verifyOtp({ userId, code });
      await refreshUser(); // update AuthContext
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed. Try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const { message } = await authApi.resendOtp({ userId });
      setResendMsg(message);
      setSecondsLeft(OTP_TTL_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  }

  const code = digits.join('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="material-symbols-outlined text-on-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Check your inbox</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              {state?.message ?? 'A 6-digit verification code was sent to your college email.'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6 p-3.5 rounded-xl bg-surface-container-low">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-container">format_image_left</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Verification Checkpoint</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-code-sm text-code-sm">Step 2 of 2</span>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-lg shrink-0">error_outline</span>
              <span>{error}</span>
            </div>
          )}

          {/* Success / resend message */}
          {resendMsg && (
            <div className="mb-4 p-4 rounded-xl bg-primary-fixed/30 text-on-primary-fixed-variant font-body-sm text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>{resendMsg}</span>
            </div>
          )}

          {/* OTP input boxes */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-3">
              <label className="font-label-md text-label-md text-on-surface">Enter 6-digit campus authentication code:</label>
              <span className={`font-code-sm text-code-sm flex items-center gap-1 font-semibold ${secondsLeft < 60 ? 'text-error' : 'text-secondary-container'}`}>
                <span className="material-symbols-outlined text-xs">timer</span>
                <span>{secondsLeft > 0 ? `${formatTime(secondsLeft)} remaining` : 'Code expired'}</span>
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
                  className={`text-center font-headline-sm text-headline-sm py-3 rounded-xl transition-all focus:outline-none shadow-sm
                    ${d ? 'bg-primary-fixed text-on-primary-fixed font-bold' : 'bg-surface-container-low text-on-surface'}
                    ${error ? 'ring-2 ring-error/40' : 'focus:ring-2 focus:ring-primary/30'}`}
                />
              ))}
            </div>
          </div>

          {/* Verify button */}
          <button
            id="otp-submit"
            onClick={handleVerify}
            disabled={loading || code.length < OTP_LENGTH || secondsLeft <= 0}
            className="w-full mt-5 py-3.5 px-6 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Verifying…</>
            ) : (
              <><span>Complete Verification & Enter Campus</span><span className="material-symbols-outlined text-xl">arrow_forward</span></>
            )}
          </button>

          {/* Resend */}
          <div className="mt-4 text-center">
            <button
              id="otp-resend"
              onClick={handleResend}
              disabled={resending || secondsLeft > 540} // allow resend after 60s
              className="font-label-lg text-label-lg text-primary hover:underline disabled:text-outline disabled:no-underline disabled:cursor-not-allowed transition-colors"
            >
              {resending ? 'Resending…' : secondsLeft > 540 ? `Resend in ${formatTime(secondsLeft - 540)}` : 'Resend code'}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-surface-container-high text-center">
            <Link to="/login" className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to login
            </Link>
          </div>
        </div>

        {/* Trust signal */}
        <div className="mt-4 flex items-center justify-center gap-2 text-outline font-label-sm text-label-sm">
          <span className="material-symbols-outlined text-base text-secondary-container">security</span>
          FERPA & AICTE Compliant
        </div>
      </div>
    </div>
  );
}
