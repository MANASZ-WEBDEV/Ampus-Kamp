/**
 * PasteToPostPage — /events/paste
 *
 * Faculty paste a raw campus announcement → AI extracts fields → review & confirm.
 *
 * Flow states:
 *   1. 'input'    — textarea + Extract button
 *   2. 'loading'  — spinner while LLM processes
 *   3. 'review'   — ExtractionConfirmForm with pre-filled fields
 *
 * Error cases:
 *   - 429 quota   — "You've used all X daily extractions" + "Fill manually" button
 *   - 503 no key  — "AI extraction not configured" + "Fill manually" button
 *   - Other       — generic error with retry option
 */

import { useState, useRef, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useExtraction } from '../hooks/useExtraction';
import { ExtractionConfirmForm } from '../components/ExtractionConfirmForm';
import { AppBar } from '@/components/layout/AppBar';
import type { ExtractionResult } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'input' | 'loading' | 'review';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isQuotaError(err: Error): boolean {
  return err.message.includes('429') || err.message.toLowerCase().includes('quota');
}

function isServiceUnavailable(err: Error): boolean {
  return err.message.includes('503') || err.message.toLowerCase().includes('unavailable');
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PasteToPostPage() {
  const navigate = useNavigate();
  const { mutateAsync: extract } = useExtraction();

  const [state, setState]             = useState<PageState>('input');
  const [rawMessage, setRawMessage]   = useState('');
  const [result, setResult]           = useState<ExtractionResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [isQuota, setIsQuota]         = useState(false);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);

  const charCount   = rawMessage.length;
  const charLimit   = 10000;
  const isOverLimit = charCount > charLimit;
  const canExtract  = charCount >= 10 && !isOverLimit;

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleExtract(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsQuota(false);
    setState('loading');

    try {
      const extractionResult = await extract(rawMessage);
      setResult(extractionResult);
      setState('review');
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (isQuotaError(e)) {
        setIsQuota(true);
        setError('Daily AI extraction limit reached. Try again tomorrow or fill the form manually.');
      } else if (isServiceUnavailable(e)) {
        setError('AI extraction service is currently unavailable. Please fill the form manually.');
      } else {
        setError(e.message || 'Extraction failed. Please try again.');
      }
      setState('input');
    }
  }

  function handleBack() {
    setState('input');
    setResult(null);
    setError(null);
  }

  // ── Render: Input state ───────────────────────────────────────────────────

  if (state === 'input') {
    return (
      <div className="min-h-screen bg-background pb-24 pt-14">
        <AppBar title="Paste to Post" subtitle="AI Event Extraction" />

        <div className="max-w-2xl mx-auto px-4">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="pt-5 pb-4 flex items-start justify-between">
            <div>
              <h1 className="font-headline-lg text-xl text-on-surface font-bold">
                AI Event Extraction
              </h1>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                Paste any campus announcement — AI fills the form for you.
              </p>
            </div>
            <button
              onClick={() => navigate('/events')}
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* ── How it works ─────────────────────────────────────────────── */}
          <div className="flex items-stretch gap-2 mb-5">
            {[
              { icon: 'content_paste', label: 'Paste announcement', color: 'text-primary' },
              { icon: 'arrow_forward', label: '', color: 'text-outline', small: true },
              { icon: 'auto_awesome', label: 'AI extracts fields', color: 'text-secondary' },
              { icon: 'arrow_forward', label: '', color: 'text-outline', small: true },
              { icon: 'check_circle', label: 'Review & confirm', color: 'text-tertiary' },
            ].map((step, i) => (
              step.small ? (
                <div key={i} className="flex items-center">
                  <span className="material-symbols-outlined text-[16px] text-outline/50">arrow_forward</span>
                </div>
              ) : (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-container-low text-center">
                  <span className={`material-symbols-outlined text-[22px] ${step.color}`}>{step.icon}</span>
                  <span className="font-label-sm text-[10px] text-on-surface-variant">{step.label}</span>
                </div>
              )
            ))}
          </div>

          {/* ── Error banner ─────────────────────────────────────────────── */}
          {error && (
            <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${
              isQuota
                ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
                : 'bg-error-container text-on-error-container'
            }`}>
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                {isQuota ? 'hourglass_empty' : 'error'}
              </span>
              <div>
                <p className="font-label-lg text-xs font-bold">
                  {isQuota ? 'Daily quota reached' : 'Extraction failed'}
                </p>
                <p className="font-body-sm text-xs mt-0.5">{error}</p>
                <Link
                  to="/events/new"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-bold underline-offset-2 hover:underline"
                >
                  Fill manually instead
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </Link>
              </div>
            </div>
          )}

          {/* ── Textarea form ─────────────────────────────────────────────── */}
          <form onSubmit={handleExtract} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="paste-textarea"
                className="font-label-lg text-sm text-on-surface mb-2 flex items-center justify-between"
              >
                <span>Campus Announcement Text</span>
                <span className={`font-label-sm text-xs ${
                  isOverLimit ? 'text-error' : 'text-on-surface-variant'
                }`}>
                  {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                </span>
              </label>
              <textarea
                id="paste-textarea"
                ref={textareaRef}
                rows={16}
                maxLength={charLimit + 500} // allow slight overage for UX, enforced server-side
                value={rawMessage}
                onChange={e => setRawMessage(e.target.value)}
                placeholder={`Paste the full campus announcement here (500–1500 words works best)…\n\nExample:\n🏆 Smart India Hackathon 2026 — Campus Prelims\n\nOrganised by: Department of Computer Science & Engineering\nIn association with: Innovation Council, AICTE\n\nWe are pleased to announce the campus-level preliminary round of Smart India Hackathon 2026. This is a national-level hackathon organised by the Ministry of Education and AICTE, providing students an opportunity to solve real-world problem statements from government ministries and industry partners.\n\nEligibility:\n- Open to students of CSE, IT and CSIT branches\n- 2nd and 3rd year students only\n- Team size: 2 to 6 members\n\nKey Dates:\n- Registration deadline: 31st October 2026\n- Campus prelims: 15th November 2026\n\nRegistration fee: Free\n\nRegister at: https://sih.gov.in/register\n\nFor queries contact: Dr. Ravi Shankar, Dept of CSE`}
                className={`w-full px-4 py-3 bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl
                            focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm resize-y
                            placeholder:text-on-surface-variant/50 font-mono min-h-[200px]
                            ${isOverLimit ? 'ring-1 ring-error/50' : ''}`}
              />
              {isOverLimit && (
                <p className="font-label-sm text-xs text-error mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  Announcement exceeds 10,000 character limit — please trim it.
                </p>
              )}
            </div>

            {/* ── Tips ───────────────────────────────────────────────────── */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">lightbulb</span>
              <p className="font-body-sm text-xs text-on-surface-variant">
                <strong className="text-on-surface">Paste the full announcement</strong> — the more detail you include
                (eligibility, dates, fee, team size, registration link), the better the AI extraction will be.
                500–1500 words works best.
              </p>
            </div>

            {/* ── Buttons ────────────────────────────────────────────────── */}
            <div className="flex gap-3">
              <Link
                to="/events/new"
                className="h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-label-lg text-sm font-semibold hover:bg-surface-container transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                Fill Manually
              </Link>

              <button
                type="submit"
                id="paste-extract-button"
                disabled={!canExtract}
                className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-label-lg text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                Extract with AI
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Render: Loading state ─────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 px-8 text-center">
          {/* Animated AI orb */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-primary animate-pulse">
                auto_awesome
              </span>
            </div>
          </div>

          <div>
            <h2 className="font-headline-md text-lg text-on-surface font-bold">
              Extracting Event Details
            </h2>
            <p className="font-body-sm text-sm text-on-surface-variant mt-1">
              Gemini AI is reading your announcement…
            </p>
          </div>

          {/* Animated field pills */}
          <div className="flex flex-wrap gap-2 justify-center max-w-xs">
            {['Title', 'Date', 'Team Size', 'Eligibility', 'Fee', 'Link'].map((field, i) => (
              <span
                key={field}
                className="px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-xs animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                {field}
              </span>
            ))}
          </div>

          <p className="font-body-sm text-xs text-on-surface-variant/60">
            Usually takes 2–5 seconds
          </p>
        </div>
      </div>
    );
  }

  // ── Render: Review state ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-24 pt-14">
      <AppBar title="Review & Confirm" subtitle="Paste to Post" />

      <div className="max-w-2xl mx-auto px-4">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="pt-5 pb-4">
          <h1 className="font-headline-lg text-xl text-on-surface font-bold">
            Review Extracted Fields
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            Check highlighted fields carefully — AI may have been uncertain.
          </p>
        </div>

        {result && (
          <ExtractionConfirmForm
            rawMessage={rawMessage}
            result={result}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
