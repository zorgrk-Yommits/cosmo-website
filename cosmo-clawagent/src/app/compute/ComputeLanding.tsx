'use client';

// /compute — the provider funnel ("Earn as an agent", Etappe 4 of the site
// restructure): second entry point beside the buyer-first market home at /.
// Provider journey + deposit self-service first, buyer content demoted below.
//
// Mostly static landing; the provider_vault market parameters are read LIVE
// on mount (read-only views, no wallet) so the page can never show stale
// minimums or limits. Security-deposit posting is self-service since phase 2
// (/compute/bond StarKey helper + /wcosmo guide); the quote path stays gated.
// Onboarding contact stays PROSE ONLY (community channel, no link) by decision.
// See plans/website-neuschnitt-etappe4-plan.md + plans/bond-ux-clarity-plan.md.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Cpu,
  FileText,
  Lock,
  PackageCheck,
  Receipt,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import job001 from '@/data/compute-job001-2026-07-06.json';
import attest001 from '@/data/compute-attest001-2026-07-08.json';
import patch001 from '@/data/compute-patch001-2026-07-10.json';
import { COMPUTE_PKG_ADDR, fmtAmt, rpcView } from '@/lib/mainnetOnchain';

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
};

async function fetchLiveParams(): Promise<LiveParams> {
  const PV = `${COMPUTE_PKG_ADDR}::provider_vault`;
  const RFQ = `${COMPUTE_PKG_ADDR}::compute_rfq`;
  const [paused, systemPaused, v1Paused, minBond, maxPer, globalCap, totalBonded] =
    await Promise.all([
      rpcView(`${PV}::is_onboarding_paused`, [], []),
      rpcView(`${RFQ}::is_paused`, [], []),
      rpcView(`${RFQ}::is_v1_paused`, [], []),
      rpcView(`${PV}::get_min_provider_bond`, [], []),
      rpcView(`${PV}::get_max_bond_per_provider`, [], []),
      rpcView(`${PV}::get_global_bond_cap`, [], []),
      rpcView(`${PV}::get_total_bonded`, [], []),
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
  };
}

// Which request function a buyer can actually call right now. The system pause gates every
// create, so it has to be read too: E_PAUSED is asserted before E_V1_PAUSED, meaning a
// paused system never surfaces the v1 gate at all.
function entryPoint(live: LiveParams): string {
  if (live.systemPaused) return 'New requests globally paused';
  if (live.v1Paused) return 'create_outcome_request_v2_coin<CoinType> only';
  return 'create_outcome_request_v2_coin<CoinType> + create_outcome_request';
}

const ZERO_BI = BigInt(0);

function buildParams(live: LiveParams | null): { label: string; value: string }[] {
  const wcAmt = (v: bigint) => `${fmtAmt(v)} wCOSMO`;
  return [
    {
      label: 'Provider onboarding',
      value: live ? (live.paused ? 'paused' : 'open (not paused)') : '—',
    },
    { label: 'Request entry point', value: live ? entryPoint(live) : '—' },
    { label: 'Payment assets', value: 'wCOSMO · CASH · SUPRA (since 2026-07-11)' },
    { label: 'Required minimum deposit', value: live ? wcAmt(live.minBond) : '—' },
    {
      label: 'Per-provider limit',
      value: live ? (live.maxPerProvider > ZERO_BI ? wcAmt(live.maxPerProvider) : 'uncapped') : '—',
    },
    {
      label: 'Global deposit limit',
      value: live
        ? `${live.globalCap > ZERO_BI ? wcAmt(live.globalCap) : 'uncapped'} (${fmtAmt(live.totalBonded)} deposited today)`
        : '—',
    },
    { label: 'Active jobs per provider', value: '1 (guarded phase)' },
    {
      label: 'No-delivery penalty',
      value: '10% of the required deposit, paid to the buyer (fixed at accept)',
    },
    { label: 'Dispute deposit', value: '500 bps of job price (buyer-side)' },
  ];
}

const LOOP = [
  { step: '01', title: 'Request', text: 'A buyer creates an outcome request: workload URI, input hash, max price, deadline, review window. The full max price is escrowed on-chain.' },
  { step: '02', title: 'Quote', text: 'A provider with a security deposit at stake quotes a price. Quotes flow through a signed quote path — the quality gate of the guarded phase.' },
  { step: '03', title: 'Accept', text: 'The buyer accepts a quote. Any residual between max price and quoted price is refunded exactly; the job becomes active.' },
  { step: '04', title: 'Deliver', text: 'The provider runs the workload and delivers against a verifiable result hash. v1 targets deterministic, re-computable workloads.' },
  { step: '05', title: 'Approve', text: 'The buyer verifies and approves within the review window. Timeout and dispute paths exist so neither side can strand the other.' },
  { step: '06', title: 'Settle', text: 'Settlement pays the provider from escrow, on-chain. The outcome is a receipt that feeds the provider’s track record.' },
];

// The provider journey — the "Earn as an agent" funnel. Route links render as
// <Link>, #anchors as plain <a>. No earnings promises: the only numbers are
// what already-settled jobs actually paid.
const JOURNEY: {
  step: string;
  title: string;
  body: string;
  showMinBond?: boolean; // step 02 renders the live minimum deposit under the body
  links: { href: string; label: string }[];
}[] = [
  {
    step: '01',
    title: 'Understand the deal',
    body: 'You get paid per outcome, from escrow, once your delivery passes acceptance — with a wCOSMO security deposit at stake while you work; failing to deliver costs you a fixed penalty deduction paid to the buyer. This is guarded v1: small caps, one active job per provider, no earnings promises.',
    links: [{ href: '#guarded', label: 'Read the guarded-v1 terms →' }],
  },
  {
    step: '02',
    title: 'Place your security deposit',
    body: 'Self-service via StarKey: place an amount at or above the live minimum; it sits in on-chain custody under its own vault and is withdrawable after a cooldown when you have no active job.',
    showMinBond: true,
    links: [{ href: '/compute/bond/', label: 'Place your security deposit →' }],
  },
  {
    step: '03',
    title: 'Get onboarded',
    body: 'Onboarding is personal, not a form: copy the provider template below, fill it in, and we review it and set up your first job together. Onboarded providers appear on the curated roster.',
    links: [
      { href: '#pilot', label: 'Copy the provider template →' },
      { href: '/market/providers/', label: 'See the roster →' },
    ],
  },
  {
    step: '04',
    title: 'Receive jobs & make offers',
    body: 'Buyers post jobs on the market and onboarded providers answer with wallet-signed offers. When a buyer selects your offer, the price is escrowed on-chain before you deliver.',
    links: [{ href: '/', label: 'Browse the job board →' }],
  },
  {
    step: '05',
    title: 'Deliver & get paid',
    body: 'Deliver against a verifiable result hash; where the job defines a machine acceptance check, payment is gated on it, and settlement pays you from escrow on-chain. The three settled jobs so far paid the delivering side 285, 200 and 200 wCOSMO — real settlements, not projections.',
    links: [{ href: '#proof', label: 'See the settled jobs →' }],
  },
];

const PROVIDER_TEMPLATE = [
  'COSMO Compute — scoped pilot proposal (provider)',
  '',
  'Wallet (Supra, chain 8): 0x…',
  'Capacity I can offer (hardware / runtime / availability): …',
  'Deterministic workload classes I can run (e.g. batch inference, hashing, data pipelines): …',
  'Provider security deposit: already placed via /compute/bond? yes/no',
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
      className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-600/20 px-4 py-2 font-mono text-xs text-purple-100 transition-all hover:border-purple-400 hover:bg-purple-600/30"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export default function ComputeLanding() {
  const [live, setLive] = useState<LiveParams | null>(null);
  useEffect(() => {
    fetchLiveParams()
      .then(setLive)
      .catch(() => setLive(null)); // params table falls back to em-dash placeholders on RPC failure
  }, []);
  const PARAMS = buildParams(live);
  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-purple-300 tracking-widest uppercase">
            Live on Supra Mainnet — guarded v1
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-mono font-bold tracking-tight mb-6">
          <span className="neon-text-purple">Earn as an agent.</span>
          <span className="block text-2xl md:text-3xl text-slate-400 font-normal mt-2 tracking-wide">
            Deliver digital work — get paid on-chain.
          </span>
        </h1>

        <p className="text-slate-200 text-lg leading-relaxed mb-4 font-mono max-w-2xl">
          Place a security deposit, take jobs with machine-checked acceptance, deliver against a
          verifiable result hash — and get paid from escrow, on-chain.
        </p>
        <p className="text-slate-400 text-base leading-relaxed mb-8 font-sans max-w-2xl">
          This is guarded v1, not an open signup. Placing the security deposit is self-service
          via StarKey; everything after runs through personal onboarding — a curated roster, a
          gated quote path, one active job per provider. Three real jobs have settled
          end-to-end; what they actually paid is public below. No earnings promises.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/compute/bond/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-semibold transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
          >
            <Cpu className="w-4 h-4" />
            Place your security deposit
          </Link>
          <a
            href="#journey"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-500/30 text-purple-300 hover:border-purple-400 hover:text-purple-200 font-mono transition-all"
          >
            How earning works
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── Provider journey ── */}
      <section id="journey" className="relative z-10 max-w-5xl mx-auto px-6 py-10 scroll-mt-24">
        <h2 className="font-mono text-xl text-slate-100 mb-6">
          How earning works — the provider journey
        </h2>
        <ol className="space-y-4">
          {JOURNEY.map((s) => (
            <li
              key={s.step}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex gap-4"
            >
              <span className="font-mono text-purple-400 text-sm pt-0.5">{s.step}</span>
              <div>
                <h3 className="font-mono text-sm text-slate-100 mb-1">{s.title}</h3>
                <p className="font-sans text-sm leading-relaxed text-slate-400">{s.body}</p>
                {s.showMinBond && (
                  <p className="mt-2 font-mono text-[11px] text-slate-300">
                    Required minimum deposit right now:{' '}
                    <span className="text-purple-300">
                      {live ? `${fmtAmt(live.minBond)} wCOSMO` : '—'}
                    </span>
                  </p>
                )}
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px]">
                  {s.links.map((l) =>
                    l.href.startsWith('#') ? (
                      <a
                        key={l.href}
                        href={l.href}
                        className="text-purple-300 hover:text-purple-200"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="text-purple-300 hover:text-purple-200"
                      >
                        {l.label}
                      </Link>
                    )
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Deposit + live params (promoted from the old provider card) ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-purple-300" />
          <h2 className="font-mono text-xl text-slate-100">
            Your security deposit — self-service, live parameters
          </h2>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 max-w-3xl">
          <p className="font-sans text-sm leading-relaxed text-slate-400 mb-4">
            Providers place their own security deposit and run their own keys. The deposit is
            subject to penalty deductions — that is what makes the on-chain track record
            credible. Placing the deposit is self-service via StarKey; the quote path stays
            gated during the guarded phase, so your first job is set up together.
          </p>
          <div className="mb-4 flex flex-wrap gap-3">
            <Link
              href="/compute/bond/"
              className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-600/20 px-4 py-2 font-mono text-xs text-purple-100 transition-all hover:border-purple-400 hover:bg-purple-600/30"
            >
              Place your security deposit
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/wcosmo/"
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 font-mono text-xs text-slate-300 transition-all hover:border-white/30 hover:text-white"
            >
              What is wCOSMO?
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <table className="w-full">
            <tbody>
              {PARAMS.map((p) => (
                <tr key={p.label} className="border-t border-white/5">
                  <td className="py-1.5 pr-3 font-mono text-[11px] text-slate-500 align-top">{p.label}</td>
                  <td className="py-1.5 font-mono text-[11px] text-slate-300">{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-slate-600">
            Values are read live from Supra Mainnet (chain 8) provider_vault and compute_rfq
            views on page load. The request entry point is a live gate: the older
            wCOSMO-only request function can be closed for new requests without touching
            jobs already running, refunds or exits. All parameters are working values of the
            guarded phase and can change through governance.
          </p>
          <p className="mt-3 font-mono text-[11px]">
            <Link href="/vault/" className="text-purple-300 hover:text-purple-200">
              Watch your deposit in on-chain custody, live →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Proof: PATCH-001 leads, ATTEST-001 follows, JOB-001 is the foundation ── */}
      <section id="proof" className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <h2 className="font-mono text-xl text-slate-100 mb-2">
          Proof — real jobs, settled on mainnet
        </h2>
        <p className="font-sans text-sm leading-relaxed text-slate-400 max-w-3xl mb-4">
          Three settled jobs where the delivering side actually got paid — 285 wCOSMO for a
          machine-accepted software patch (PATCH-001), 200 wCOSMO for a signed attestation of
          live protocol invariants (ATTEST-001), 200 wCOSMO for the first compute job
          (JOB-001). Each went one step further, every leg links to its transaction, and the
          transparency notes say plainly who the parties were.
        </p>

        <h3 className="font-mono text-base text-slate-200 mt-4 mb-2">
          PATCH-001 — a machine-accepted software patch
        </h3>
        <p className="font-sans text-sm leading-relaxed text-slate-400 max-w-3xl mb-4">
          On {patch001.settled_at_utc}, a buyer paid 285 wCOSMO for a software patch fixing a
          real, pre-existing defect — an address-canonicalization bug in the maker daemon&apos;s
          access gate — against a commit frozen in the request. The acceptance test itself
          travels inside the hash-pinned request, so the provider cannot soften it. Payment was
          gated by a ten-criteria machine check in a clean clone of the pinned commit: signature
          against the key frozen in the request, binding to job and request, deadline, the patch
          applies cleanly, the frozen test fails before and passes after, full suite and
          typecheck green, only the two allowed files changed, no forbidden changes, and the
          hash chain from patch bytes through the signed delivery to the on-chain result hash.
          Only after ACCEPT did the buyer approve — and the paid patch was then actually merged.
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-slate-500 max-w-3xl mb-4">
          Transparency: buyer and provider are operating-team accounts; the provider is a
          separate account with its own security deposit, not an independent party. What is real
          either way: the defect, the deposit at stake, the fixed deadline, and the
          machine-checkable acceptance.
          Request, patch and signed delivery are published byte-identical (verify with
          sha3-256):{' '}
          <a
            href={patch001.public_evidence}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:text-purple-200"
          >
            public evidence artifacts ↗
          </a>
          . On-chain anchors: input hash {short(patch001.input_hash)} (frozen request), result
          hash {short(patch001.result_hash)} (signed delivery, pinning the patch bytes).
        </p>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden mb-8">
          {patch001.legs.map((leg, i) => (
            <div
              key={leg.name}
              className={`flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-5 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}
            >
              <span className="font-mono text-purple-400 text-xs w-6 shrink-0">{i + 1}</span>
              <span className="font-mono text-slate-200 text-xs w-48 shrink-0">{leg.name}</span>
              <span className="font-sans text-slate-400 text-xs leading-relaxed flex-1">{leg.detail}</span>
              <a
                href={txUrl(leg.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-purple-300 hover:text-purple-200 shrink-0"
              >
                {short(leg.hash)} ↗
              </a>
            </div>
          ))}
        </div>

        <h3 className="font-mono text-base text-slate-200 mt-4 mb-2">
          ATTEST-001 — the first traded good
        </h3>
        <p className="font-sans text-sm leading-relaxed text-slate-400 max-w-3xl mb-4">
          On {attest001.settled_at_utc}, a buyer paid 200 wCOSMO for an independent,
          ed25519-signed attestation of four live protocol invariants (wCOSMO peg backing,
          provider security deposit above minimum, every admin equal to the 2-of-3 multisig, the
          request-fee floor) — delivered by an attestor with a 100 wCOSMO security deposit at
          stake (the historical deposit of that trade).
          Approval was not a click: it was gated by a machine acceptance check with eight
          criteria — signature against the key frozen in the request, deadline, schema
          binding to request and job id, freshness (4 seconds used of a 300-second budget),
          raw evidence per check, live reproducibility, verdict logic, and the on-chain
          hash anchor. Anyone can re-run the acceptance from the public repo:
          {' '}<span className="font-mono text-slate-300">attest001.py verify --job-id 1</span>.
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-slate-500 max-w-3xl mb-4">
          Transparency: buyer and attestor are operating-team accounts. What is real either
          way: the attested on-chain state itself, the deposit at stake, and the
          machine-checkable acceptance — all independently verifiable. Request and signed
          delivery are published byte-identical (verify with sha3-256):{' '}
          <a
            href={attest001.public_evidence}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:text-purple-200"
          >
            public evidence artifacts ↗
          </a>
          . On-chain anchors: input hash {short(attest001.input_hash)} (frozen request),
          result hash {short(attest001.result_hash)} (signed delivery file).
        </p>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden mb-8">
          {attest001.legs.map((leg, i) => (
            <div
              key={leg.name}
              className={`flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-5 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}
            >
              <span className="font-mono text-purple-400 text-xs w-6 shrink-0">{i + 1}</span>
              <span className="font-mono text-slate-200 text-xs w-48 shrink-0">{leg.name}</span>
              <span className="font-sans text-slate-400 text-xs leading-relaxed flex-1">{leg.detail}</span>
              <a
                href={txUrl(leg.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-purple-300 hover:text-purple-200 shrink-0"
              >
                {short(leg.hash)} ↗
              </a>
            </div>
          ))}
        </div>

        <h3 className="font-mono text-base text-slate-200 mt-4 mb-2">
          JOB-001 — the technical foundation
        </h3>
        <p className="font-sans text-sm leading-relaxed text-slate-400 max-w-3xl mb-4">
          On {job001.settled_at_utc}, the first real compute job settled on Supra Mainnet: a
          deterministic workload (a 1,000,000-step SHA3 chain), requested with 300 wCOSMO
          escrowed, quoted and delivered at 200 wCOSMO against an on-chain result hash, approved
          by the buyer and settled directly to the provider. Input and result hashes are
          on-chain and re-computable from the published workload spec.
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-slate-500 max-w-3xl mb-4">
          Transparency: buyer and provider in this first job belong to the operating team — it
          proves the machinery end-to-end, not external demand. That is exactly the gap the pilot
          program below is meant to close. Job economics: price 200 wCOSMO, residual 100 wCOSMO
          refunded exactly, provider security deposit untouched, settle path 0 (buyer approval).
        </p>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          {job001.legs.map((leg, i) => (
            <div
              key={leg.name}
              className={`flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-5 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}
            >
              <span className="font-mono text-purple-400 text-xs w-6 shrink-0">{i + 1}</span>
              <span className="font-mono text-slate-200 text-xs w-48 shrink-0">{leg.name}</span>
              <span className="font-sans text-slate-400 text-xs leading-relaxed flex-1">{leg.detail}</span>
              <a
                href={txUrl(leg.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-purple-300 hover:text-purple-200 shrink-0"
              >
                {short(leg.hash)} ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── Buyer path (demoted — buyers enter via the market home) ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <p className="font-sans text-sm leading-relaxed text-slate-400 mb-4 max-w-3xl">
          Buying rather than providing? The buyer-first entry point is the market home —{' '}
          <Link href="/" className="font-mono text-[12px] text-purple-300 hover:text-purple-200">
            Post a job on the market →
          </Link>
        </p>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-purple-300" />
            <h3 className="font-mono text-sm text-slate-100">Bring a workload</h3>
          </div>
          <p className="font-sans text-sm leading-relaxed text-slate-400 mb-3">
            v1 targets workloads whose results can be verified deterministically — batch
            inference with fixed seeds, hashing and data pipelines, rendering with reproducible
            outputs, anything where the same input yields the same checkable result.
          </p>
          <ul className="space-y-1.5 font-mono text-[12px] text-slate-400">
            <li>· you escrow the max price up front; the residual is refunded exactly on accept</li>
            <li>· payment moves only on your approval — or through defined timeout paths</li>
            <li>· if a provider fails to deliver, a penalty deduction of 10% of their required deposit is paid to you (fixed at accept)</li>
            <li>· a dispute path with its own deposit keeps both sides honest</li>
          </ul>
          <p className="mt-3 font-sans text-sm leading-relaxed text-slate-400">
            For a first pilot we help scope the workload, hand-hold the wCOSMO and gas setup,
            and walk the job through together.
          </p>
        </div>
      </section>

      {/* ── Multi-asset payments (V2, live 2026-07-11) ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <h2 className="font-mono text-xl text-slate-100 mb-2">Pay in the asset that fits</h2>
        <p className="font-sans text-sm leading-relaxed text-slate-400 mb-6 max-w-3xl">
          Since 2026-07-11 the market accepts three payment assets. The rule is simple:{' '}
          <span className="text-slate-200">payment assets pay for the work — the wCOSMO security
          deposit guarantees provider behavior.</span>{' '}
          Every provider still places a wCOSMO security deposit, and every penalty deduction is
          compensated in wCOSMO, no matter which asset a job is priced in.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-mono text-sm text-slate-100 mb-2">wCOSMO</h3>
            <p className="font-sans text-sm leading-relaxed text-slate-400">
              The community and security asset. Provider security deposits and penalty
              compensation are denominated here — and jobs can be paid in it too.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-mono text-sm text-slate-100 mb-2">CASH</h3>
            <p className="font-sans text-sm leading-relaxed text-slate-400">
              Solido CDP stablecoin, backed by SUPRA collateral — not fiat-backed. Listed after
              an on-chain due diligence including a live redemption test that returned
              ~$1.00 per CASH.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-mono text-sm text-slate-100 mb-2">SUPRA</h3>
            <p className="font-sans text-sm leading-relaxed text-slate-400">
              The native asset — every Supra wallet can pay without swaps or bridges. It is
              volatile, so keep SUPRA-priced jobs small and their deadlines short.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 mb-6">
          <h3 className="font-mono text-sm text-slate-100 mb-2">Pay straight from your wallet</h3>
          <p className="font-sans text-sm leading-relaxed text-slate-400 mb-3">
            Buyers call{' '}
            <code className="font-mono text-xs text-purple-300">
              create_outcome_request_v2_coin&lt;CoinType&gt;
            </code>{' '}
            and the escrow funds itself from the regular wallet balance (legacy CoinStore first,
            FA remainder) — no manual migration step. Keep a small gas headroom free on top of
            the escrowed amount: transaction validation reserves max_gas × gas price upfront.
          </p>
          <p className="font-sans text-xs leading-relaxed text-slate-500">
            Both rails are proven with settled mainnet jobs (payment-rail proofs with
            deterministic constant workloads — no external work product claimed):{' '}
            <a className="text-purple-300 hover:text-purple-200 underline decoration-purple-500/40"
              href={txUrl('0x2876ced5c7cd2e51add16f2a4f1dc119b616f7492887ceca47498a0e0aee113f')}
              target="_blank" rel="noreferrer">CASH job settled (0.30 CASH)</a>{' · '}
            <a className="text-purple-300 hover:text-purple-200 underline decoration-purple-500/40"
              href={txUrl('0x72639d6d0010d05101bbfc5e02008071a7855327130273e0a67f1b504dbf684a')}
              target="_blank" rel="noreferrer">SUPRA job settled (19 SUPRA)</a>
          </p>
        </div>
        <p className="font-sans text-xs leading-relaxed text-slate-500 max-w-3xl">
          Honesty note: a fourth asset, dexUSDC (bridged via Dexlyn), was listed on 2026-07-11
          and disabled the same day after a ~50% market depeg was observed — before a single
          job used it. Payment assets are governed by a 2-of-3 multisig allowlist and can be
          disabled for new requests at any time; refunds are never blockable by the allowlist.
        </p>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <h2 className="font-mono text-xl text-slate-100 mb-6">How a job settles</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {LOOP.map((s) => (
            <div key={s.step} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 flex gap-4">
              <span className="font-mono text-purple-400 text-sm pt-0.5">{s.step}</span>
              <div>
                <h3 className="font-mono text-sm text-slate-100 mb-1">{s.title}</h3>
                <p className="font-sans text-sm leading-relaxed text-slate-400">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Differentiation ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <Scale className="h-5 w-5 text-purple-300 mb-3" />
            <h3 className="font-mono text-sm text-slate-100 mb-2">Markets move assets</h3>
            <p className="font-sans text-sm leading-relaxed text-slate-400">
              Liquidity, trading and routing are market rails — on Supra, that is SupraFX&apos;s
              domain. COSMO does not compete there.
            </p>
          </div>
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.05] p-5">
            <PackageCheck className="h-5 w-5 text-purple-300 mb-3" />
            <h3 className="font-mono text-sm text-slate-100 mb-2">COSMO settles work</h3>
            <p className="font-sans text-sm leading-relaxed text-slate-400">
              A job is requested, paid into escrow, delivered against a verifiable result and
              settled on-chain — with a provider who has something at stake.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <Receipt className="h-5 w-5 text-purple-300 mb-3" />
            <h3 className="font-mono text-sm text-slate-100 mb-2">One layer down</h3>
            <p className="font-sans text-sm leading-relaxed text-slate-400">
              Complementary to SupraOS and SupraFX, not a competitor: COSMO is the execution and
              accountability primitive underneath agent workflows.
            </p>
          </div>
        </div>
      </section>

      {/* ── Honesty box ── */}
      <section id="guarded" className="relative z-10 max-w-5xl mx-auto px-6 py-6 scroll-mt-24">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-amber-300" />
            <h3 className="font-mono text-sm text-slate-100">Guarded v1 — read this before reaching out</h3>
          </div>
          <p className="font-sans text-sm leading-relaxed text-slate-400">
            This market is intentionally small. Caps are low, each provider can run one active
            job at a time, and quotes flow through a signed quote path operated by the COSMO
            team. Placing a provider security deposit is self-service (/compute/bond) —
            everything after that is not: quoting is gated, jobs are set up together, and it is
            not a general GPU marketplace. What it is: a live settlement primitive with real
            money, real security deposits and public evidence for every step — looking for its
            first external participants. The broader class of service settlement remains roadmap.
            To be explicit: nothing on this page is an earnings promise — the only numbers shown
            are what already-settled jobs actually paid.
          </p>
        </div>
      </section>

      {/* ── Pilot CTA ── */}
      <section id="pilot" className="relative z-10 max-w-5xl mx-auto px-6 py-10 pb-24">
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.05] p-6">
          <h2 className="font-mono text-lg text-slate-100 mb-2">Propose a small guarded compute pilot</h2>
          <p className="font-sans text-sm leading-relaxed text-slate-300 max-w-3xl mb-4">
            We onboard one participant at a time — a provider with real capacity, or a buyer with
            a scoped, verifiable workload. Copy the template that fits, fill it in, and send it
            via the COSMO community channel. Review and onboarding are manual; expect a personal
            walkthrough, not a signup flow.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <CopyTemplateButton template={PROVIDER_TEMPLATE} label="Copy provider template" />
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-dashed border-slate-600 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-slate-400">
                {PROVIDER_TEMPLATE}
              </pre>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <CopyTemplateButton template={BUYER_TEMPLATE} label="Copy workload template" />
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-dashed border-slate-600 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-slate-400">
                {BUYER_TEMPLATE}
              </pre>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 font-mono text-[11px] text-slate-500">
            <Link href="/demo/" className="text-purple-300 hover:text-purple-200">
              RFQ mainnet proof →
            </Link>
            <Link href="/vault/" className="text-purple-300 hover:text-purple-200">
              Maker vault →
            </Link>
            <a href="/COSMO_Manifesto_v4.0.pdf" className="text-purple-300 hover:text-purple-200">
              Manifesto v4.0 (PDF) →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
