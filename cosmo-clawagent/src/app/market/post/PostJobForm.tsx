'use client';

// /market/post — public job intake. Client-side checks mirror the server's
// zod schema (lengths, 7-day deadline ceiling); the server remains the
// authority. Honeypot field "website" is rendered invisibly.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Send, ShieldQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, submitJob } from '../lib/marketApi';
import { addMyJob } from '../lib/myJobs';
import HonestyBox from '../components/HonestyBox';

// Mirror of the server-side rail constraint: deadlines at most 7 days out
// (the on-chain job window is clamped to [now+60s, now+7d] at escrow time).
const MAX_DEADLINE_DAYS = 7;

interface FormState {
  title: string;
  description: string;
  acceptanceCriteria: string;
  budgetAmount: string;
  deadlineLocal: string;
  contactEmail: string;
  buyerWallet: string;
  website: string; // honeypot
}

const EMPTY: FormState = {
  title: '',
  description: '',
  acceptanceCriteria: '',
  budgetAmount: '',
  deadlineLocal: '',
  contactEmail: '',
  buyerWallet: '',
  website: '',
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
      {hint && <span className="mt-0.5 block font-sans text-xs text-slate-500">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {error && <span className="mt-1 block font-mono text-xs text-rose-300">{error}</span>}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none';

export default function PostJobForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const deadlineBounds = useMemo(() => {
    const min = new Date(Date.now() + 2 * 3600 * 1000); // 1h server floor + slack
    const max = new Date(Date.now() + MAX_DEADLINE_DAYS * 24 * 3600 * 1000);
    return { min: toLocalInputValue(min), max: toLocalInputValue(max) };
  }, []);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (form.title.trim().length < 8) errs.title = 'At least 8 characters.';
    if (form.title.trim().length > 120) errs.title = 'At most 120 characters.';
    if (form.description.trim().length < 40)
      errs.description = 'At least 40 characters — providers need enough to scope the work.';
    if (form.acceptanceCriteria.trim().length < 20)
      errs.acceptanceCriteria = 'At least 20 characters — say what "done" means.';
    if (!/^\d{1,12}(\.\d{1,6})?$/.test(form.budgetAmount.trim()))
      errs.budgetAmount = 'Decimal number, up to 6 fraction digits (e.g. 100 or 12.5).';
    const deadline = form.deadlineLocal ? new Date(form.deadlineLocal) : null;
    if (!deadline || Number.isNaN(deadline.getTime())) {
      errs.deadlineLocal = 'Pick a deadline.';
    } else {
      const secs = Math.floor(deadline.getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);
      if (secs < now + 3600) errs.deadlineLocal = 'Deadline must be at least 1 hour out.';
      if (secs > now + MAX_DEADLINE_DAYS * 86400)
        errs.deadlineLocal = `At most ${MAX_DEADLINE_DAYS} days out — the on-chain job window is capped at 7 days.`;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.contactEmail.trim()))
      errs.contactEmail = 'Valid email required — it is how we reach you about moderation and offers.';
    if (form.buyerWallet.trim() && !/^0x[0-9a-fA-F]{1,64}$/.test(form.buyerWallet.trim()))
      errs.buyerWallet = 'Hex address starting with 0x, or leave empty.';
    return errs;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const res = await submitJob({
        title: form.title.trim(),
        description: form.description.trim(),
        acceptanceCriteria: form.acceptanceCriteria.trim(),
        budgetAmount: form.budgetAmount.trim(),
        budgetAsset: 'wCOSMO',
        deadlineTs: Math.floor(new Date(form.deadlineLocal).getTime() / 1000),
        contactEmail: form.contactEmail.trim(),
        buyerWallet: form.buyerWallet.trim() || undefined,
        website: form.website,
      });
      // Remember the job locally (nobody should have to memorize an id) and
      // take the user straight to their job page.
      addMyJob({ id: res.id, title: form.title.trim(), createdAt: Date.now() });
      setSubmitted({ id: res.id });
      router.push(`/market/job/?id=${encodeURIComponent(res.id)}`);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fieldErrors)) mapped[k] = v.join(' ');
        setErrors(mapped);
        setServerError('Some fields were rejected by the server — see above.');
      } else {
        setServerError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      <section className="relative z-10 mx-auto max-w-3xl px-6 pt-24 pb-8">
        <Link
          href="/market/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          All jobs
        </Link>

        <h1 className="mt-6 font-mono text-3xl font-bold tracking-tight text-slate-100 md:text-4xl">
          Post a job
        </h1>
        <p className="mt-3 font-sans text-base leading-relaxed text-slate-300">
          Describe the digital work you need done. Submissions go through a moderation queue;
          once approved, the job is listed publicly and curated pilot providers can make offers.
        </p>

        {submitted ? (
          <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              <h2 className="font-mono text-sm font-bold text-slate-100">Submission received</h2>
            </div>
            <p className="mt-2 font-sans text-sm leading-relaxed text-slate-300">
              Taking you to your job page… If nothing happens,{' '}
              <Link
                href={`/market/job/?id=${encodeURIComponent(submitted.id)}`}
                className="text-sky-400 hover:text-sky-300"
              >
                open it here
              </Link>
              .
            </p>
            <p className="mt-3 break-all rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-emerald-300">
              {submitted.id}
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <Field label="Title" hint="One line, 8-120 characters." error={errors.title}>
              <input
                className={inputCls}
                value={form.title}
                onChange={set('title')}
                maxLength={120}
                placeholder="e.g. Verify and summarize a dataset of 500 records"
              />
            </Field>

            <Field
              label="Description"
              hint="What needs to be done, inputs you will provide, expected output format. 40-8000 characters."
              error={errors.description}
            >
              <textarea
                className={cn(inputCls, 'min-h-32')}
                value={form.description}
                onChange={set('description')}
                maxLength={8000}
              />
            </Field>

            <Field
              label="Acceptance criteria"
              hint='What "done" means — these criteria are frozen into the job specification on approval.'
              error={errors.acceptanceCriteria}
            >
              <textarea
                className={cn(inputCls, 'min-h-24')}
                value={form.acceptanceCriteria}
                onChange={set('acceptanceCriteria')}
                maxLength={4000}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Budget (wCOSMO)"
                hint="Maximum you are willing to pay."
                error={errors.budgetAmount}
              >
                <input
                  className={inputCls}
                  value={form.budgetAmount}
                  onChange={set('budgetAmount')}
                  inputMode="decimal"
                  placeholder="100"
                />
              </Field>

              <Field
                label="Deadline"
                hint="At most 7 days out — the on-chain job window is capped at 7 days."
                error={errors.deadlineLocal}
              >
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.deadlineLocal}
                  onChange={set('deadlineLocal')}
                  min={deadlineBounds.min}
                  max={deadlineBounds.max}
                />
              </Field>
            </div>

            <Field
              label="Contact email"
              hint="Stored server-side only and never published. Used solely to reach you about moderation and offers; deleted with the job record. Reply to any message from us to request deletion."
              error={errors.contactEmail}
            >
              <input
                className={inputCls}
                type="email"
                value={form.contactEmail}
                onChange={set('contactEmail')}
                placeholder="you@example.com"
              />
            </Field>

            <Field
              label="Your Supra wallet (optional)"
              hint="If you already have one — it becomes the buyer wallet for the on-chain escrow. You can add it later."
              error={errors.buyerWallet}
            >
              <input
                className={inputCls}
                value={form.buyerWallet}
                onChange={set('buyerWallet')}
                placeholder="0x…"
              />
            </Field>

            {/* Honeypot — invisible to humans, tempting to bots. */}
            <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </label>
            </div>

            {serverError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-mono text-xs text-rose-300">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/15 px-5 py-2.5 font-mono text-sm text-purple-200 transition-all hover:border-purple-400 hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>

            <p className="flex items-start gap-2 font-sans text-xs leading-relaxed text-slate-500">
              <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Payment happens later and on-chain: after approval you select an offer and fund the
              escrow from your own wallet. Posting a job costs nothing and commits you to nothing.
            </p>
          </form>
        )}
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-6 py-6 pb-24">
        <HonestyBox />
      </section>
    </div>
  );
}
