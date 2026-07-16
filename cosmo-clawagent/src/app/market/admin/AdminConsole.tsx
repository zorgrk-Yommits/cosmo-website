'use client';

// /market/admin — operator console. The page itself is static and public;
// every API call goes to /api/market/admin/* which nginx gates with
// BasicAuth. Credentials are asked for once and kept in sessionStorage
// (never in localStorage, never in the bundle).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, KeyRound, RefreshCw, Trash2, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Full (admin) job shape — includes the private fields the public API strips.
interface AdminJob {
  id: string;
  status: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  budgetAmount: string;
  budgetAsset: string;
  deadlineTs: number;
  contactEmail: string;
  buyerWallet?: string;
  createdAt: number;
  moderationNote?: string;
  specHash?: string;
}

interface AdminProvider {
  id: string;
  name: string;
  skills: string[];
  wallet: string;
  status: 'active' | 'paused';
  links: string[];
  bio?: string;
}

const CRED_KEY = 'cosmo-market-admin-auth';

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none';

const btnCls =
  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition-all disabled:cursor-not-allowed disabled:opacity-50';

function fmtTs(secs: number): string {
  return new Date(secs * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

export default function AdminConsole() {
  const [auth, setAuth] = useState<string | null>(null);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [queue, setQueue] = useState<AdminJob[] | null>(null);
  const [providers, setProviders] = useState<AdminProvider[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Provider form
  const [pForm, setPForm] = useState({ name: '', skills: '', wallet: '', bio: '', links: '' });

  useEffect(() => {
    setAuth(sessionStorage.getItem(CRED_KEY));
  }, []);

  const call = useCallback(
    async (path: string, init?: RequestInit, credentials = auth): Promise<unknown> => {
      const res = await fetch(`/api/market/admin${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          authorization: `Basic ${credentials}`,
          ...(init?.headers ?? {}),
        },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(CRED_KEY);
        setAuth(null);
        throw new Error('Not authorized — check credentials.');
      }
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : `HTTP ${res.status}`);
      return body;
    },
    [auth],
  );

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [q, p] = await Promise.all([call('/queue'), call('/providers')]);
      setQueue((q as { jobs: AdminJob[] }).jobs);
      setProviders((p as { providers: AdminProvider[] }).providers);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [call]);

  useEffect(() => {
    if (auth) void reload();
  }, [auth, reload]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const cred = btoa(`${user}:${pass}`);
    try {
      await call('/queue', undefined, cred);
      sessionStorage.setItem(CRED_KEY, cred);
      setAuth(cred);
      setPass('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    }
  }

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function createProvider(e: React.FormEvent) {
    e.preventDefault();
    await act('create-provider', () =>
      call('/providers', {
        method: 'POST',
        body: JSON.stringify({
          name: pForm.name.trim(),
          skills: pForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
          wallet: pForm.wallet.trim(),
          bio: pForm.bio.trim() || undefined,
          links: pForm.links.split(/\s+/).filter(Boolean),
          status: 'active',
        }),
      }).then(() => setPForm({ name: '', skills: '', wallet: '', bio: '', links: '' })),
    );
  }

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-24">
        <Link
          href="/market/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          Market
        </Link>

        <h1 className="mt-6 font-mono text-3xl font-bold tracking-tight text-slate-100">
          Market admin
        </h1>

        {!auth ? (
          <form onSubmit={login} className="mt-8 max-w-sm space-y-4">
            <p className="font-sans text-sm text-slate-400">
              Operator access. The API behind this console is BasicAuth-gated at the proxy.
            </p>
            <input
              className={inputCls}
              placeholder="user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
            />
            <input
              className={inputCls}
              placeholder="password"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
            />
            {authError && <p className="font-mono text-xs text-rose-300">{authError}</p>}
            <button
              type="submit"
              className={cn(btnCls, 'border-purple-500/40 bg-purple-500/15 text-purple-200 hover:border-purple-400')}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Unlock
            </button>
          </form>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void reload()}
                className={cn(btnCls, 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white')}
              >
                <RefreshCw className="h-3 w-3" />
                Reload
              </button>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem(CRED_KEY);
                  setAuth(null);
                }}
                className={cn(btnCls, 'border-white/10 text-slate-500 hover:text-slate-300')}
              >
                Lock
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-mono text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* ── Moderation queue ── */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="font-mono text-sm font-bold text-slate-100">
                Moderation queue ({queue?.length ?? '…'})
              </h2>
              <div className="mt-4 space-y-4">
                {queue?.map((job) => (
                  <div key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-slate-100">{job.title}</span>
                      <span className="font-mono text-[11px] text-slate-500">{fmtTs(job.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-line font-sans text-sm text-slate-400">{job.description}</p>
                    <p className="mt-2 font-sans text-xs text-slate-500">
                      Acceptance: {job.acceptanceCriteria}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-slate-500">
                      <span>
                        {job.budgetAmount} {job.budgetAsset}
                      </span>
                      <span>deadline {fmtTs(job.deadlineTs)}</span>
                      <span className="text-amber-300/80">{job.contactEmail}</span>
                      {job.buyerWallet && <span>{job.buyerWallet}</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          void act(`approve-${job.id}`, () =>
                            call(`/jobs/${encodeURIComponent(job.id)}/approve`, { method: 'POST' }),
                          )
                        }
                        className={cn(btnCls, 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400')}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve + freeze spec
                      </button>
                      <input
                        className={cn(inputCls, 'w-56 py-1.5 text-xs')}
                        placeholder="rejection note (internal)"
                        value={notes[job.id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [job.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          void act(`reject-${job.id}`, () =>
                            call(`/jobs/${encodeURIComponent(job.id)}/reject`, {
                              method: 'POST',
                              body: JSON.stringify({ moderationNote: notes[job.id] ?? '' }),
                            }),
                          )
                        }
                        className={cn(btnCls, 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:border-rose-400')}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {queue && queue.length === 0 && (
                  <p className="font-mono text-xs text-slate-500">Queue is empty.</p>
                )}
              </div>
            </div>

            {/* ── Providers ── */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="font-mono text-sm font-bold text-slate-100">
                Providers ({providers?.length ?? '…'})
              </h2>
              <div className="mt-4 space-y-3">
                {providers?.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-100">{p.name}</span>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase',
                            p.status === 'active'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : 'border-slate-500/40 bg-slate-500/10 text-slate-400',
                          )}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        {p.wallet} · {p.skills.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          void act(`toggle-${p.id}`, () =>
                            call(`/providers/${encodeURIComponent(p.id)}`, {
                              method: 'PUT',
                              body: JSON.stringify({
                                name: p.name,
                                skills: p.skills,
                                wallet: p.wallet,
                                bio: p.bio,
                                links: p.links,
                                status: p.status === 'active' ? 'paused' : 'active',
                              }),
                            }),
                          )
                        }
                        className={cn(btnCls, 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white')}
                      >
                        {p.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          void act(`delete-${p.id}`, () =>
                            call(`/providers/${encodeURIComponent(p.id)}`, { method: 'DELETE' }),
                          )
                        }
                        className={cn(btnCls, 'border-rose-500/40 text-rose-300 hover:border-rose-400')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={createProvider} className="mt-5 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
                <input
                  className={inputCls}
                  placeholder="name"
                  value={pForm.name}
                  onChange={(e) => setPForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  className={inputCls}
                  placeholder="wallet 0x… (64 hex)"
                  value={pForm.wallet}
                  onChange={(e) => setPForm((f) => ({ ...f, wallet: e.target.value }))}
                />
                <input
                  className={inputCls}
                  placeholder="skills, comma-separated"
                  value={pForm.skills}
                  onChange={(e) => setPForm((f) => ({ ...f, skills: e.target.value }))}
                />
                <input
                  className={inputCls}
                  placeholder="links, space-separated (optional)"
                  value={pForm.links}
                  onChange={(e) => setPForm((f) => ({ ...f, links: e.target.value }))}
                />
                <input
                  className={cn(inputCls, 'sm:col-span-2')}
                  placeholder="bio (optional)"
                  value={pForm.bio}
                  onChange={(e) => setPForm((f) => ({ ...f, bio: e.target.value }))}
                />
                <div>
                  <button
                    type="submit"
                    disabled={busy !== null}
                    className={cn(btnCls, 'border-purple-500/40 bg-purple-500/15 text-purple-200 hover:border-purple-400')}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add provider
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
