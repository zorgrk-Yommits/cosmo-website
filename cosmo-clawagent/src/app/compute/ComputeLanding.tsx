'use client';

// /compute — landing + onboarding page for the outcome-RFQ compute market.
//
// Deliberately static: no wallet interaction, no live RPC, no signup backend.
// Onboarding stays white-glove during the guarded phase; the only interactive
// element is the copy-to-clipboard pilot template (community-rfq pattern).
// Market parameters below were re-verified read-only on Supra Mainnet (chain 8)
// on 2026-07-07 — re-verify before editing (provider_vault views).
// See plans/compute-landing-page-plan.md.

import { useCallback, useState } from 'react';
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

// ── verified Mainnet parameters (chain 8, provider_vault views, 2026-07-07) ──
const PARAMS = [
  { label: 'Provider onboarding', value: 'open (not paused)' },
  { label: 'Minimum provider bond', value: '100 wCOSMO' },
  { label: 'Cap per provider', value: '1,000 wCOSMO' },
  { label: 'Global bond cap', value: '5,000 wCOSMO (100 bonded today)' },
  { label: 'Active jobs per provider', value: '1 (guarded v1)' },
  { label: 'No-delivery slash', value: '10% of job price, paid to the buyer' },
  { label: 'Dispute bond', value: '500 bps of job price (buyer-side)' },
];

const LOOP = [
  { step: '01', title: 'Request', text: 'A buyer creates an outcome request: workload URI, input hash, max price, deadline, review window. The full max price is escrowed on-chain.' },
  { step: '02', title: 'Quote', text: 'A bonded provider quotes a price. Quotes flow through a signed quote path — the quality gate of the guarded phase.' },
  { step: '03', title: 'Accept', text: 'The buyer accepts a quote. Any residual between max price and quoted price is refunded exactly; the job becomes active.' },
  { step: '04', title: 'Deliver', text: 'The provider runs the workload and delivers against a verifiable result hash. v1 targets deterministic, re-computable workloads.' },
  { step: '05', title: 'Approve', text: 'The buyer verifies and approves within the review window. Timeout and dispute paths exist so neither side can strand the other.' },
  { step: '06', title: 'Settle', text: 'Settlement pays the provider from escrow, on-chain. The outcome is a receipt that feeds the provider’s track record.' },
];

const PROVIDER_TEMPLATE = [
  'COSMO Compute — scoped pilot proposal (provider)',
  '',
  'Wallet (Supra, chain 8): 0x…',
  'Capacity I can offer (hardware / runtime / availability): …',
  'Deterministic workload classes I can run (e.g. batch inference, hashing, data pipelines): …',
  'Can obtain / post the v1 provider bond (100 wCOSMO): yes/no',
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
          <span className="neon-text-purple">Outcome settlement</span>
          <span className="block text-2xl md:text-3xl text-slate-400 font-normal mt-2 tracking-wide">
            for compute and verifiable work
          </span>
        </h1>

        <p className="text-slate-200 text-lg leading-relaxed mb-4 font-mono max-w-2xl">
          A buyer escrows payment. A bonded provider delivers against a verifiable result hash.
          Settlement happens on-chain — or not at all.
        </p>
        <p className="text-slate-400 text-base leading-relaxed mb-8 font-sans max-w-2xl">
          This is not a marketplace pitch. It is a small, deliberately guarded outcome-RFQ market,
          live on Supra Mainnet, with the first real job already settled end-to-end. It is not
          permissionless and not self-service: one active job per provider, deterministic
          workloads, a gated quote path — and personal onboarding for every participant.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <a
            href="#pilot"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-semibold transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
          >
            <Cpu className="w-4 h-4" />
            Propose a guarded pilot
          </a>
          <a
            href="#proof"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-500/30 text-purple-300 hover:border-purple-400 hover:text-purple-200 font-mono transition-all"
          >
            See the settled job
            <ArrowRight className="w-4 h-4" />
          </a>
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

      {/* ── Proof: ATTEST-001 + JOB-001 ── */}
      <section id="proof" className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <h2 className="font-mono text-xl text-slate-100 mb-2">
          Proof — real jobs, settled on mainnet
        </h2>

        <h3 className="font-mono text-base text-slate-200 mt-4 mb-2">
          ATTEST-001 — the first traded good
        </h3>
        <p className="font-sans text-sm leading-relaxed text-slate-400 max-w-3xl mb-4">
          On {attest001.settled_at_utc}, a buyer paid 200 wCOSMO for an independent,
          ed25519-signed attestation of four live protocol invariants (wCOSMO peg backing,
          provider bond above minimum, every admin equal to the 2-of-3 multisig, the
          request-fee floor) — delivered by an attestor with a 100 wCOSMO bond at stake.
          Approval was not a click: it was gated by a machine acceptance check with eight
          criteria — signature against the key frozen in the request, deadline, schema
          binding to request and job id, freshness (4 seconds used of a 300-second budget),
          raw evidence per check, live reproducibility, verdict logic, and the on-chain
          hash anchor. Anyone can re-run the acceptance from the public repo:
          {' '}<span className="font-mono text-slate-300">attest001.py verify --job-id 1</span>.
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-slate-500 max-w-3xl mb-4">
          Transparency: buyer and attestor are operating-team accounts. What is real either
          way: the attested on-chain state itself, the bond at stake, and the
          machine-checkable acceptance — all independently verifiable. Request and delivery
          are pinned on-chain: input hash {short(attest001.input_hash)} (frozen request),
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
          JOB-001 — the machinery proof (two days earlier)
        </h3>
        <p className="font-sans text-sm leading-relaxed text-slate-400 max-w-3xl mb-4">
          On {job001.settled_at_utc}, the first real compute job settled on Supra Mainnet: a
          deterministic workload (a 1,000,000-step SHA3 chain), requested with 300 wCOSMO
          escrowed, quoted and delivered at 200 wCOSMO against an on-chain result hash, approved
          by the buyer and settled directly to the bonded provider. Input and result hashes are
          on-chain and re-computable from the published workload spec.
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-slate-500 max-w-3xl mb-4">
          Transparency: buyer and provider in this first job belong to the operating team — it
          proves the machinery end-to-end, not external demand. That is exactly the gap the pilot
          program below is meant to close. Job economics: price 200 wCOSMO, residual 100 wCOSMO
          refunded exactly, provider bond untouched, settle path 0 (buyer approval).
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

      {/* ── Provider + Buyer paths ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-purple-300" />
              <h3 className="font-mono text-sm text-slate-100">Provide compute</h3>
            </div>
            <p className="font-sans text-sm leading-relaxed text-slate-400 mb-4">
              Providers post their own bond and run their own keys. The bond is slashable — that
              is what makes the on-chain track record credible. Onboarding is open under caps,
              and every provider is onboarded personally during the guarded phase.
            </p>
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
              Values verified read-only on Supra Mainnet (chain 8) on 2026-07-07. All parameters
              are v1 working values and can change through governance before broader opening.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
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
              <li>· if a provider fails to deliver, 10% of the job price is paid to you from their bond</li>
              <li>· a dispute path with its own bond keeps both sides honest</li>
            </ul>
            <p className="mt-3 font-sans text-sm leading-relaxed text-slate-400">
              For a first pilot we help scope the workload, hand-hold the wCOSMO and gas setup,
              and walk the job through together.
            </p>
          </div>
        </div>
      </section>

      {/* ── Honesty box ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-amber-300" />
            <h3 className="font-mono text-sm text-slate-100">Guarded v1 — read this before reaching out</h3>
          </div>
          <p className="font-sans text-sm leading-relaxed text-slate-400">
            This market is intentionally small. Caps are low, each provider can run one active
            job at a time, quotes flow through a signed quote path operated by the COSMO team,
            and onboarding is manual. It is not permissionless, not self-service, and not a
            general GPU marketplace. What it is: a live settlement primitive with real money,
            real bonds and public evidence for every step — looking for its first external
            participants. The broader class of service settlement remains roadmap.
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
            <a href="/COSMO_Manifesto_v4.0.pdf" className="text-purple-300 hover:text-purple-200">
              Manifesto v4.0 (PDF) →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
