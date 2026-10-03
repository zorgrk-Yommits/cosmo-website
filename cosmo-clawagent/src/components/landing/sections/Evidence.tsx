'use client';

import { ArrowRight, ExternalLink, FileJson, Terminal } from 'lucide-react';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import Reveal from '@/components/cosmo/Reveal';
import Chip from '@/components/cosmo/Chip';
import TechDetails from '@/components/cosmo/TechDetails';
import { CtaLink } from '@/components/cosmo/Cta';
import pilot001 from '@/data/market-pilot001-2026-07-17.json';

// Proof.
//
// Every fingerprint, transaction and URL on this page is real and belongs to
// PILOT-001, the first marketplace job that ran from posting to payment on
// Supra Mainnet. The shell command in the technical details is not an
// illustration: running it reproduces the result hash recorded on-chain.

const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-8)}`;

const txOf = (step: string) => pilot001.legs.find((l) => l.step.startsWith(step))?.tx;

// the transaction that released the payment (data key in the pilot record)
const PAID_TX = txOf('Approve') ?? txOf('Settle') ?? '';

const CHAIN: {
  label: string;
  tone: 'active' | 'proof' | 'settled';
  body: string;
  value?: { text: string; href: string; mono?: boolean };
}[] = [
  {
    label: 'Job description fixed',
    tone: 'active',
    body: 'Once approved, the wording cannot change. The exact text stays online.',
    value: {
      text: short(pilot001.spec_hash),
      href: `/api/market/jobs/${pilot001.jobId}/spec`,
      mono: true,
    },
  },
  {
    label: 'Payment locked to it',
    tone: 'active',
    body: 'The locked payment points at that exact text, so both belong together.',
    value: {
      text: short(txOf('Fund the job') ?? ''),
      href: `${pilot001.explorer_tx_base}${txOf('Fund the job') ?? ''}`,
    },
  },
  {
    label: 'Result recorded on delivery',
    tone: 'proof',
    body: 'The provider records a fingerprint of the result before anyone reviews it. It cannot be swapped afterwards.',
    value: {
      text: short(pilot001.result_hash),
      href: `${pilot001.explorer_tx_base}${txOf('Deliver result') ?? ''}`,
    },
  },
  {
    label: 'Result is public',
    tone: 'proof',
    body: 'You can download the result and compare it with the recorded fingerprint yourself.',
    value: { text: 'the delivered result', href: pilot001.attestation_url },
  },
  {
    label: 'Provider paid',
    tone: 'settled',
    body: 'Approval released the payment. The end of the job is a public transaction.',
    value: {
      text: short(PAID_TX),
      href: `${pilot001.explorer_tx_base}${PAID_TX}`,
    },
  },
];

const BUNDLES = [
  { href: '/evidence/execution-case-002/', label: 'execution-case-002', note: 'a work delivery run under fixed rules' },
  { href: '/evidence/execution-case-001/', label: 'execution-case-001', note: 'first trade run under fixed rules (SupraFX)' },
  { href: '/evidence/pilot-001/', label: 'pilot-001', note: 'first job paid on the market' },
  { href: '/evidence/mcp-probe-002/', label: 'mcp-probe-002', note: 'a behaviour test, published result' },
  { href: '/evidence/patch-001/', label: 'patch-001', note: 'first trade for a work product' },
  { href: '/evidence/attest-001/', label: 'attest-001', note: 'first trade for real goods' },
];

export default function Evidence() {
  return (
    <section className="relative border-t border-line-subtle py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          kicker="Proof"
          title="Do not take our word for it. Check it."
          lead="Every job leaves a public trail. Here is the first job that ran from posting to payment, step by step, with the links to check each one."
        />

        <ol className="mt-14 grid gap-4 md:grid-cols-5">
          {CHAIN.map((link, i) => (
            <Reveal as="li" key={link.label} delay={i * 0.06} className="relative">
              {/* the connector sits in the gutter between cards, not inside one */}
              {i >= 1 && (
                <ArrowRight
                  className="absolute -left-[13px] top-1/2 z-10 hidden h-3.5 w-3.5 -translate-y-1/2 text-ink-2 md:block"
                  aria-hidden="true"
                />
              )}
              <Surface className="flex h-full flex-col p-5">
                <span className="font-mono text-[10px] tabular text-ink-2">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 text-[15px] font-medium text-ink-0">{link.label}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-1">{link.body}</p>
                {link.value && (
                  <a
                    href={link.value.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 break-all font-mono text-[11px] text-phase-proof transition-colors hover:text-ink-0"
                  >
                    {link.value.text}
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                )}
              </Surface>
            </Reveal>
          ))}
        </ol>

        {/* Reproduce it yourself — this command actually works. */}
        <TechDetails title="Technical details: reproduce the check yourself" className="mt-6">
          <Surface tone="inset" className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2.5 border-b border-line-subtle px-5 py-3">
              <Terminal className="h-3.5 w-3.5 text-ink-2" aria-hidden="true" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
                Reproduce the on-chain result hash
              </span>
              <Chip tone="proof" size="sm">
                PILOT-001
              </Chip>
            </div>
            <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed">
              <code>
                <span className="text-ink-2">$ </span>
                <span className="text-ink-0">
                  curl -s https://heros.cloud/api/market/jobs/{pilot001.jobId}/attestation \
                </span>
                {'\n'}
                <span className="text-ink-0">{'    | openssl dgst -sha3-256'}</span>
                {'\n\n'}
                <span className="text-phase-settled">
                  SHA3-256(stdin)= {pilot001.result_hash.replace(/^0x/, '')}
                </span>
                {'\n'}
                <span className="text-ink-2">
                  # identical to result_hash recorded on Supra Mainnet for job #
                  {pilot001.jobIdOnchain}
                </span>
              </code>
            </pre>
          </Surface>
        </TechDetails>

        <div className="mt-12">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
            Evidence files
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BUNDLES.map((b) => (
              <a key={b.href} href={b.href} className="group">
                <Surface interactive className="flex h-full items-start gap-3 p-4">
                  <FileJson className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
                  <span>
                    <span className="block font-mono text-[13px] text-ink-0">{b.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-2">{b.note}</span>
                  </span>
                </Surface>
              </a>
            ))}
          </div>
        </div>

        <Reveal delay={0.06}>
          <div className="mt-8">
            <CtaLink href="/assurance/" variant="secondary" size="md">
              More proof, and its limits
              <ArrowRight className="h-4 w-4" />
            </CtaLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
