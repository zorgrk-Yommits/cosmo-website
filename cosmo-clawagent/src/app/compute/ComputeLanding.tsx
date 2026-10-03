'use client';

// /compute — the provider entry page ("Earn"). Site-clarity plan, stage 3:
// picture first, one plain sentence, the risks stated where the offer is made,
// and every number that the contract can change read LIVE on mount (read-only
// views, no wallet) instead of being written into the copy.
//
// Placing the safety deposit is self-service (/compute/bond); everything after
// runs through personal onboarding. The onboarding contact stays PROSE ONLY
// (community channel, no link) by decision.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, ClipboardCopy, FileText, Lock, ShieldCheck } from 'lucide-react';
import job001 from '@/data/compute-job001-2026-07-06.json';
import attest001 from '@/data/compute-attest001-2026-07-08.json';
import patch001 from '@/data/compute-patch001-2026-07-10.json';
import { COMPUTE_PKG_ADDR, fmtAmt, rpcView } from '@/lib/mainnetOnchain';
import PageIntro from '@/components/cosmo/PageIntro';
import Surface from '@/components/cosmo/Surface';
import TechDetails from '@/components/cosmo/TechDetails';
import { CtaLink } from '@/components/cosmo/Cta';
import { PROVIDER_FLOW } from '@/components/cosmo/flows';

// Live market parameters (read on mount, read-only, no wallet).
// `paused` is the provider_vault onboarding switch; `systemPaused` is the compute_rfq
// system pause. Two different switches — do not conflate them.
type LiveParams = {
  paused: boolean;
  systemPaused: boolean;
  v1Paused: boolean;
  minBond: bigint;
  maxPerProvider: bigint;
  globalCap: bigint;
  totalBonded: bigint;
  maxActiveJobs: bigint;
  cooldownSecs: bigint;
  penaltyBps: bigint;
  disputeBps: bigint;
};

async function fetchLiveParams(): Promise<LiveParams> {
  const PV = `${COMPUTE_PKG_ADDR}::provider_vault`;
  const RFQ = `${COMPUTE_PKG_ADDR}::compute_rfq`;
  const [paused, systemPaused, v1Paused, minBond, maxPer, globalCap, totalBonded, maxJobs, cooldown, penalty, dispute] =
    await Promise.all([
      rpcView(`${PV}::is_onboarding_paused`, [], []),
      rpcView(`${RFQ}::is_paused`, [], []),
      rpcView(`${RFQ}::is_v1_paused`, [], []),
      rpcView(`${PV}::get_min_provider_bond`, [], []),
      rpcView(`${PV}::get_max_bond_per_provider`, [], []),
      rpcView(`${PV}::get_global_bond_cap`, [], []),
      rpcView(`${PV}::get_total_bonded`, [], []),
      rpcView(`${PV}::get_max_active_jobs_per_provider`, [], []),
      rpcView(`${PV}::bond_cooldown_secs`, [], []),
      rpcView(`${PV}::slash_comp_bps`, [], []),
      rpcView(`${RFQ}::dispute_bond_bps`, [], []),
    ]);
  const big = (v: unknown) => BigInt(String(v ?? 0));
  // A missing or garbled view must not silently render as "open" — throw instead, so the
  // whole table falls back to em-dashes rather than claiming a gate is off.
  const bool = (v: unknown, name: string): boolean => {
    if (typeof v !== 'boolean') throw new Error(`view ${name}: expected bool, got ${typeof v}`);
    return v;
  };
  return {
    paused: bool(paused, 'is_onboarding_paused'),
    systemPaused: bool(systemPaused, 'is_paused'),
    v1Paused: bool(v1Paused, 'is_v1_paused'),
    minBond: big(minBond),
    maxPerProvider: big(maxPer),
    globalCap: big(globalCap),
    totalBonded: big(totalBonded),
    maxActiveJobs: big(maxJobs),
    cooldownSecs: big(cooldown),
    penaltyBps: big(penalty),
    disputeBps: big(dispute),
  };
}

// Which request functions a buyer can call right now. The system pause gates every
// create, so it has to be read too: E_PAUSED is asserted before E_V1_PAUSED.
function entryPoint(live: LiveParams): string {
  if (live.systemPaused) return 'new requests globally paused';
  const v2 = 'create_outcome_request_v2 (used by the market) and create_outcome_request_v2_coin<CoinType>';
  return live.v1Paused ? `${v2}; v1 create_outcome_request is closed` : `${v2}; v1 create_outcome_request still open`;
}

const ZERO_BI = BigInt(0);
const DASH = '—';

const pct = (bps: bigint) => `${Number(bps) / 100}%`;

function days(secs: bigint): string {
  const d = Number(secs) / 86400;
  return d >= 1 ? `${Number.isInteger(d) ? d : d.toFixed(1)} days` : `${Math.round(Number(secs) / 3600)} hours`;
}

const wc = (v: bigint) => `${fmtAmt(v)} wCOSMO`;

// What a provider needs to know, in plain words. Every value is live.
function plainParams(live: LiveParams | null): { label: string; value: string }[] {
  return [
    { label: 'Sign-up for providers', value: live ? (live.paused ? 'paused' : 'open') : DASH },
    { label: 'Minimum deposit', value: live ? wc(live.minBond) : DASH },
    {
      label: 'Most one provider can deposit',
      value: live ? (live.maxPerProvider > ZERO_BI ? wc(live.maxPerProvider) : 'no limit') : DASH,
    },
    {
      label: 'Most all providers can deposit together',
      value: live
        ? `${live.globalCap > ZERO_BI ? wc(live.globalCap) : 'no limit'} (${fmtAmt(live.totalBonded)} deposited today)`
        : DASH,
    },
    { label: 'Jobs at the same time, per provider', value: live ? live.maxActiveJobs.toString() : DASH },
    {
      label: 'Penalty for not delivering',
      value: live ? `${pct(live.penaltyBps)} of the required deposit, paid to the buyer` : DASH,
    },
    { label: 'Lock on the rest after a penalty', value: live ? days(live.cooldownSecs) : DASH },
    { label: 'Payment tokens', value: 'wCOSMO, CASH, SUPRA (since 2026-07-11)' },
  ];
}

// The provider journey. Route links render as <Link>, #anchors as plain <a>.
// No earnings promises: the only numbers are what already-paid jobs paid.
const JOURNEY: {
  step: string;
  title: string;
  body: string;
  showMin?: boolean; // renders the live minimum deposit under the body
  links: { href: string; label: string }[];
}[] = [
  {
    step: '01',
    title: 'Understand the deal',
    body: 'You are paid per job, out of the payment the buyer locked up front, once the buyer approves your result or the time to check it runs out. While you work, your safety deposit stands behind the job. One job at a time, small limits, no earnings promises.',
    links: [{ href: '#risks', label: 'What can go wrong →' }],
  },
  {
    step: '02',
    title: 'Place your safety deposit',
    body: 'Self-service with the StarKey wallet: put down at least the minimum. It is held by a contract, not by us. You can withdraw it whenever none of your jobs is active.',
    showMin: true,
    links: [{ href: '/compute/bond/', label: 'Place your safety deposit →' }],
  },
  {
    step: '03',
    title: 'Get onboarded',
    body: 'Onboarding is personal, not a form: copy the provider template below, fill it in and send it through the COSMO community channel. We review it and set up your first job together. Onboarded providers appear on the provider list.',
    links: [
      { href: '#pilot', label: 'Copy the provider template →' },
      { href: '/market/providers/', label: 'See the provider list →' },
    ],
  },
  {
    step: '04',
    title: 'Make offers on jobs',
    body: 'Buyers post jobs on the market. You answer with an offer signed by your wallet: a price and a delivery time. When a buyer chooses your offer, they lock the payment before you start.',
    links: [{ href: '/market/', label: 'Browse the job board →' }],
  },
  {
    step: '05',
    title: 'Hand in the result and get paid',
    body: 'Hand in the result before the deadline. Where a job defines an automatic check, payment depends on passing it. The three jobs paid so far paid the delivering side 285, 200 and 200 wCOSMO. Those are real payments, not forecasts.',
    links: [{ href: '#proof', label: 'See the paid jobs →' }],
  },
];

const PROVIDER_TEMPLATE = [
  'COSMO Compute — scoped pilot proposal (provider)',
  '',
  'Wallet (Supra, chain 8): 0x…',
  'Capacity I can offer (hardware / runtime / availability): …',
  'Deterministic workload classes I can run (e.g. batch inference, hashing, data pipelines): …',
  'Safety deposit: already placed via /compute/bond? yes/no',
  'Background (infra / DePIN / agents): …',
].join('\n');

const BUYER_TEMPLATE = [
  'COSMO Compute — scoped pilot proposal (workload)',
  '',
  'Wallet (Supra, chain 8): 0x…',
  'Workload (what should run, expected output): …',
  'Is the result deterministically verifiable (same input → same output)? yes/no/unsure',
  'Rough budget in wCOSMO and desired timeline: …',
  'Contact: …',
].join('\n');

function txUrl(hash: string): string {
  return `${job001.explorer_tx_base}${hash}`;
}

function short(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function CopyTemplateButton({ template, label }: { template: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable — the template stays visible below */
    }
  }, [template]);
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex items-center gap-2 rounded-lg border border-phase-active/50 bg-phase-active/20 px-4 py-2 font-mono text-xs text-phase-active transition-all hover:border-phase-active hover:bg-phase-active/30"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

// One paid job: a plain sentence up front, the full account and every
// transaction one click away.
function PaidJob({
  name,
  plain,
  technical,
  legs,
}: {
  name: string;
  plain: string;
  // the full account; rendered inside the technical details
  technical: React.ReactNode;
  legs: { name: string; detail: string; hash: string }[];
}) {
  return (
    <Surface className="p-5">
      <h3 className="text-base font-semibold text-ink-0">{name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-1">{plain}</p>
      <TechDetails title="Technical details: what was checked, and every transaction" className="mt-4">
        <div className="space-y-3">{technical}</div>
        <ol className="mt-4 divide-y divide-line-subtle rounded-lg border border-line-subtle">
          {legs.map((leg, i) => (
            <li key={leg.name} className="flex flex-col gap-1 px-4 py-3 md:flex-row md:items-center md:gap-4">
              <span className="w-5 shrink-0 font-mono text-xs text-ink-2">{i + 1}</span>
              <span className="shrink-0 break-all font-mono text-xs text-ink-0 md:w-48">{leg.name}</span>
              <span className="flex-1 text-xs leading-relaxed">{leg.detail}</span>
              <a
                href={txUrl(leg.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 font-mono text-[11px] text-phase-proof hover:text-ink-0"
              >
                {short(leg.hash)} ↗
              </a>
            </li>
          ))}
        </ol>
      </TechDetails>
    </Surface>
  );
}

export default function ComputeLanding() {
  const [live, setLive] = useState<LiveParams | null>(null);
  useEffect(() => {
    fetchLiveParams()
      .then(setLive)
      .catch(() => setLive(null)); // values fall back to em-dash placeholders on RPC failure
  }, []);
  const PARAMS = plainParams(live);
  const penalty = live ? pct(live.penaltyBps) : 'part';
  const lock = live ? days(live.cooldownSecs) : 'a set time';

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* ── Intro: what this is, the picture, the next action ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-10 pt-20 md:px-6 md:pt-24">
        <PageIntro
          maturity="pilot"
          maturityDetail="hand-picked providers"
          title="Earn by doing jobs for AI agents."
          lead="Put down a safety deposit, make offers on jobs, hand in the result, and get paid from the payment the buyer locked up front."
          flow={PROVIDER_FLOW.map(({ id, icon, label }) => ({ id, icon, label }))}
          flowLabel="How it works for a provider: wallet, safety deposit, make an offer, do the work, get paid, withdraw the deposit."
        >
          <CtaLink href="/compute/bond/" variant="primary" size="lg">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Place your safety deposit
          </CtaLink>
          <CtaLink href="#journey" variant="secondary" size="lg">
            How earning works
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CtaLink>
        </PageIntro>

        <p className="mt-6 max-w-2xl text-pretty text-sm leading-relaxed text-ink-2">
          This is not an open sign-up. Anyone can place the deposit; getting jobs runs through
          personal onboarding, one provider at a time. No earnings promises: the only numbers on
          this page are what paid jobs actually paid.
        </p>
      </section>

      {/* ── Provider journey ── */}
      <section id="journey" className="relative z-10 mx-auto max-w-5xl scroll-mt-24 px-4 py-10 md:px-6">
        <h2 className="mb-6 text-balance text-2xl font-semibold tracking-tight text-ink-0">How earning works</h2>
        <ol className="space-y-4">
          {JOURNEY.map((s) => (
            <li key={s.step} className="flex gap-4 rounded-xl border border-line-base bg-surface-1 p-5">
              <span className="pt-0.5 font-mono text-sm text-phase-active">{s.step}</span>
              <div>
                <h3 className="mb-1 text-base font-semibold text-ink-0">{s.title}</h3>
                <p className="text-sm leading-relaxed text-ink-1">{s.body}</p>
                {s.showMin && (
                  <p className="mt-2 text-sm text-ink-1">
                    Minimum deposit right now:{' '}
                    <span className="font-mono font-semibold text-ink-0">{live ? wc(live.minBond) : DASH}</span>
                  </p>
                )}
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px]">
                  {s.links.map((l) =>
                    l.href.startsWith('#') ? (
                      <a key={l.href} href={l.href} className="text-phase-active hover:text-ink-0">
                        {l.label}
                      </a>
                    ) : (
                      <Link key={l.href} href={l.href} className="text-phase-active hover:text-ink-0">
                        {l.label}
                      </Link>
                    ),
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Risks, stated where the offer is made ── */}
      <section id="risks" className="relative z-10 mx-auto max-w-5xl scroll-mt-24 px-4 py-10 md:px-6">
        <div className="rounded-xl border border-phase-warn/25 bg-phase-warn/[0.04] p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-phase-warn" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-ink-0">What can go wrong</h2>
          </div>
          <ul className="space-y-3 text-sm leading-relaxed text-ink-1">
            <li>
              <span className="font-semibold text-ink-0">You miss the deadline.</span> {penalty} of the
              required deposit is paid to the buyer, and the rest of your deposit is locked for {lock}.
            </li>
            <li>
              <span className="font-semibold text-ink-0">The buyer disputes your result.</span> The
              payment stays locked until the dispute is decided.
            </li>
            <li>
              <span className="font-semibold text-ink-0">The contract is paused.</span> No new job
              can start while it is paused. Taking funds back still works.
            </li>
            <li>
              <span className="font-semibold text-ink-0">The rules change.</span> This is a pilot:
              limits are low and the numbers below can be changed by the 2-of-3 admin group.
            </li>
          </ul>
        </div>
      </section>

      {/* ── Deposit: live numbers ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="mb-4 flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-phase-active" aria-hidden="true" />
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink-0">Your safety deposit: the live numbers</h2>
        </div>
        <Surface className="max-w-3xl p-6">
          <p className="mb-4 text-sm leading-relaxed text-ink-1">
            You place your own deposit and keep your own keys. The deposit can be reduced by a
            penalty, and that is what gives your track record weight. It is free to withdraw
            whenever none of your jobs is active.
          </p>
          <div className="mb-5 flex flex-wrap gap-3">
            <CtaLink href="/compute/bond/" variant="primary" size="md">
              Place your safety deposit
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </CtaLink>
            <CtaLink href="/portfolio/" variant="secondary" size="md">
              Withdraw on My tokens
            </CtaLink>
            <CtaLink href="/wcosmo/" variant="ghost" size="md">
              What is wCOSMO?
            </CtaLink>
          </div>
          <dl className="divide-y divide-line-subtle border-t border-line-subtle">
            {PARAMS.map((p) => (
              <div key={p.label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
                <dt className="text-sm text-ink-2 sm:w-1/2">{p.label}</dt>
                <dd className="font-mono text-sm text-ink-0 sm:w-1/2">{p.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-2">
            Read live from Supra Mainnet when this page loads. A dash means the value could not
            be read just now.
          </p>
          <TechDetails className="mt-4">
            <dl className="space-y-2">
              <div>
                <dt className="text-ink-2">Request entry point</dt>
                <dd className="break-words font-mono text-xs text-ink-0">{live ? entryPoint(live) : DASH}</dd>
              </div>
              <div>
                <dt className="text-ink-2">Dispute bond (buyer side)</dt>
                <dd className="font-mono text-xs text-ink-0">
                  {live ? `${live.disputeBps.toString()} bps of the job price` : DASH}
                </dd>
              </div>
            </dl>
            <p className="mt-3">
              Values come from provider_vault and compute_rfq views on Supra Mainnet (chain 8). The
              request entry point is a live gate: the older wCOSMO-only request function can be
              closed for new requests without touching running jobs, refunds or exits. All
              parameters are working values of the guarded phase and can change through governance.
            </p>
          </TechDetails>
          <p className="mt-4 text-sm">
            <Link href="/vault/" className="text-phase-active hover:text-ink-0">
              See where deposits are held, live →
            </Link>
          </p>
        </Surface>
      </section>

      {/* ── Proof: three paid jobs ── */}
      <section id="proof" className="relative z-10 mx-auto max-w-5xl scroll-mt-24 px-4 py-10 md:px-6">
        <h2 className="mb-2 text-balance text-2xl font-semibold tracking-tight text-ink-0">Proof: three jobs that were paid</h2>
        <p className="mb-2 max-w-3xl text-sm leading-relaxed text-ink-1">
          In each of them the delivering side was paid on Supra Mainnet, and every step links to
          its transaction.
        </p>
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-ink-1">
          <span className="font-semibold text-ink-0">Honest limit:</span> buyer and provider in all
          three were accounts of the operating team. They show that the mechanics work, not that
          outside demand exists.
        </p>
        <div className="space-y-4">
          <PaidJob
            name={`PATCH-001 · 285 wCOSMO · ${patch001.settled_at_utc}`}
            plain="A buyer paid for a software fix. Payment depended on an automatic ten-point check, and the fix was merged afterwards."
            legs={patch001.legs}
            technical={
              <>
                <p>
                  A software patch fixing a real, pre-existing defect (an address-canonicalization
                  bug in the maker daemon&apos;s access gate) against a commit frozen in the request.
                  The acceptance test travels inside the hash-pinned request, so the provider
                  cannot soften it. Payment was gated by a ten-criteria machine check in a clean
                  clone of the pinned commit: signature against the key frozen in the request,
                  binding to job and request, deadline, the patch applies cleanly, the frozen test
                  fails before and passes after, full suite and typecheck green, only the two
                  allowed files changed, no forbidden changes, and the hash chain from patch bytes
                  through the signed delivery to the on-chain result hash.
                </p>
                <p>
                  The provider is a separate account with its own security deposit, not an
                  independent party. Request, patch and signed delivery are published
                  byte-identical (verify with sha3-256):{' '}
                  <a
                    href={patch001.public_evidence}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-phase-proof hover:text-ink-0"
                  >
                    public evidence artifacts ↗
                  </a>
                  . On-chain anchors: input hash {short(patch001.input_hash)} (frozen request),
                  result hash {short(patch001.result_hash)} (signed delivery).
                </p>
              </>
            }
          />
          <PaidJob
            name={`ATTEST-001 · 200 wCOSMO · ${attest001.settled_at_utc}`}
            plain="A buyer paid for a signed report on four live facts about the protocol. The report was checked automatically before payment."
            legs={attest001.legs}
            technical={
              <>
                <p>
                  An ed25519-signed attestation of four live protocol invariants (wCOSMO peg
                  backing, provider security deposit above minimum, every admin equal to the
                  2-of-3 multisig, the request-fee floor), delivered by an attestor with a 100
                  wCOSMO security deposit at stake (the deposit of that trade). Approval was gated
                  by a machine acceptance check with eight criteria: signature against the key
                  frozen in the request, deadline, schema binding to request and job id, freshness
                  (4 seconds used of a 300-second budget), raw evidence per check, live
                  reproducibility, verdict logic, and the on-chain hash anchor. Re-run it from the
                  public repo: <code className="font-mono text-xs">attest001.py verify --job-id 1</code>.
                </p>
                <p>
                  Request and signed delivery are published byte-identical (verify with sha3-256):{' '}
                  <a
                    href={attest001.public_evidence}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-phase-proof hover:text-ink-0"
                  >
                    public evidence artifacts ↗
                  </a>
                  . On-chain anchors: input hash {short(attest001.input_hash)} (frozen request),
                  result hash {short(attest001.result_hash)} (signed delivery file).
                </p>
              </>
            }
          />
          <PaidJob
            name={`JOB-001 · 200 wCOSMO · ${job001.settled_at_utc}`}
            plain="The first compute job: a fixed calculation. 300 wCOSMO were locked, the work was done for 200, and the remaining 100 went back to the buyer."
            legs={job001.legs}
            technical={
              <p>
                A deterministic workload (a 1,000,000-step SHA3 chain), requested with 300 wCOSMO
                escrowed, quoted and delivered at 200 wCOSMO against an on-chain result hash,
                approved by the buyer and settled directly to the provider. Input and result hashes
                are on-chain and re-computable from the published workload spec. Job economics:
                price 200 wCOSMO, residual 100 wCOSMO refunded exactly, provider security deposit
                untouched, settle path 0 (buyer approval).
              </p>
            }
          />
        </div>
      </section>

      {/* ── Buying instead ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-10 md:px-6">
        <Surface className="max-w-3xl p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-phase-active" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink-0">Want work done instead?</h2>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-ink-1">
            Buyers start on the job board. The pilot suits work whose result can be checked
            exactly: the same input always gives the same result.
          </p>
          <ul className="space-y-1.5 text-sm leading-relaxed text-ink-1">
            <li>· You lock your maximum price up front. What the offer does not use comes back to you.</li>
            <li>· The provider is paid when you approve the result, or when the time to check it runs out.</li>
            <li>· If the provider does not deliver, {penalty} of their required deposit is paid to you.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <CtaLink href="/market/post/" variant="primary" size="md">
              Post a job
            </CtaLink>
            <CtaLink href="/#flow" variant="ghost" size="md" external={false}>
              How a job works
            </CtaLink>
          </div>
        </Surface>
      </section>

      {/* ── Payment tokens (live since 2026-07-11) ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-10 md:px-6">
        <h2 className="mb-2 text-balance text-2xl font-semibold tracking-tight text-ink-0">Three tokens a job can be paid in</h2>
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-ink-1">
          The rule: <span className="text-ink-0">the payment token pays for the work, the wCOSMO
          safety deposit stands behind the provider.</span> Every provider deposits wCOSMO, and
          every deposit penalty is paid in wCOSMO, whatever token the job is priced in.
        </p>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Surface className="p-5">
            <h3 className="mb-2 font-mono text-sm text-ink-0">wCOSMO</h3>
            <p className="text-sm leading-relaxed text-ink-1">
              The token of this project. Safety deposits and penalties are counted in it, and
              jobs can be paid in it too.
            </p>
          </Surface>
          <Surface className="p-5">
            <h3 className="mb-2 font-mono text-sm text-ink-0">CASH</h3>
            <p className="text-sm leading-relaxed text-ink-1">
              A dollar-pegged token by Solido, backed by SUPRA collateral, not by money in a bank.
              Listed after an on-chain check that included a live redemption returning about
              $1.00 per CASH.
            </p>
          </Surface>
          <Surface className="p-5">
            <h3 className="mb-2 font-mono text-sm text-ink-0">SUPRA</h3>
            <p className="text-sm leading-relaxed text-ink-1">
              The native token: every Supra wallet can pay without a swap. Its price moves, so
              keep SUPRA-priced jobs small and their deadlines short.
            </p>
          </Surface>
        </div>
        <p className="max-w-3xl text-xs leading-relaxed text-ink-2">
          Honest note: a fourth token, dexUSDC (bridged via Dexlyn), was listed on 2026-07-11 and
          switched off the same day after it traded at about half its intended price, before a
          single job used it. The 2-of-3 admin group decides which tokens are allowed and can
          switch one off for new jobs at any time. Refunds can never be blocked by that list.
        </p>
        <TechDetails title="Technical details: paying straight from a wallet" className="mt-4 max-w-3xl">
          <p>
            Buyers can call <code className="font-mono text-xs">create_outcome_request_v2_coin&lt;CoinType&gt;</code>{' '}
            and the escrow funds itself from the regular wallet balance (legacy CoinStore first, FA
            remainder), with no manual migration step. Keep a small gas headroom free on top of
            the escrowed amount: transaction validation reserves max_gas × gas price upfront.
          </p>
          <p className="mt-2">
            Both rails are proven with settled mainnet jobs (payment-rail proofs with
            deterministic constant workloads, no external work product claimed):{' '}
            <a
              className="text-phase-proof underline decoration-phase-proof/40 hover:text-ink-0"
              href={txUrl('0x2876ced5c7cd2e51add16f2a4f1dc119b616f7492887ceca47498a0e0aee113f')}
              target="_blank"
              rel="noreferrer"
            >
              CASH job settled (0.30 CASH)
            </a>
            {' · '}
            <a
              className="text-phase-proof underline decoration-phase-proof/40 hover:text-ink-0"
              href={txUrl('0x72639d6d0010d05101bbfc5e02008071a7855327130273e0a67f1b504dbf684a')}
              target="_blank"
              rel="noreferrer"
            >
              SUPRA job settled (19 SUPRA)
            </a>
          </p>
        </TechDetails>
      </section>

      {/* ── Limits of the pilot ── */}
      <section id="guarded" className="relative z-10 mx-auto max-w-5xl scroll-mt-24 px-4 py-6 md:px-6">
        <div className="rounded-xl border border-phase-warn/20 bg-phase-warn/[0.04] p-5">
          <div className="mb-2 flex items-center gap-2">
            <Lock className="h-4 w-4 text-phase-warn" aria-hidden="true" />
            <h2 className="text-base font-semibold text-ink-0">The limits of this pilot: read before you write to us</h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-1">
            This market is small on purpose. Limits are low, each provider runs one job at a time,
            and offers reach the contract through a signing service run by the COSMO team. Placing
            a safety deposit is self-service. Everything after that is not: offers go through us,
            jobs are set up together, and this is not a general GPU marketplace. What it is: real
            payments, real safety deposits and public evidence for every step, looking for its
            first outside participants. Paying for other kinds of services this way is planned,
            not built. Nothing on this page is an earnings promise.
          </p>
        </div>
      </section>

      {/* ── Pilot CTA ── */}
      <section id="pilot" className="relative z-10 mx-auto max-w-5xl scroll-mt-24 px-4 py-10 pb-24 md:px-6">
        <div className="rounded-xl border border-phase-active/30 bg-phase-active/[0.05] p-6">
          <h2 className="mb-2 text-xl font-semibold text-ink-0">Propose a small pilot</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-ink-1">
            We take on one participant at a time: a provider with real capacity, or a buyer with a
            job whose result can be checked exactly. Copy the template that fits, fill it in and
            send it through the COSMO community channel. We review by hand and walk you through
            it personally.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <CopyTemplateButton template={PROVIDER_TEMPLATE} label="Copy provider template" />
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-dashed border-line-strong bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-ink-1">
                {PROVIDER_TEMPLATE}
              </pre>
            </div>
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <CopyTemplateButton template={BUYER_TEMPLATE} label="Copy buyer template" />
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-dashed border-line-strong bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-ink-1">
                {BUYER_TEMPLATE}
              </pre>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 font-mono text-[11px]">
            <Link href="/vault/" className="text-phase-active hover:text-ink-0">
              Where deposits are held →
            </Link>
            <Link href="/assurance/" className="text-phase-active hover:text-ink-0">
              Proof overview →
            </Link>
            <Link href="/protocol/" className="text-phase-active hover:text-ink-0">
              Archive →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
