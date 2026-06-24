"use client";

// Interactive founder RFQ cockpit. Drives the wallet-signed taker actions via
// useRfqFlow and reuses the demo LifecycleRail + DataPanel (fed with LIVE steps,
// not the static snapshot). SettlementStage is intentionally NOT reused yet --
// it renders snapshot economics, which would be misleading against live data.

import { useEffect, useMemo, useState } from "react";
import LifecycleRail from "@/app/demo/components/LifecycleRail";
import DataPanel from "@/app/demo/components/DataPanel";
import { useRfqFlow, type CreateForm } from "@/hooks/useRfqFlow";
import { RFQ_CHAIN_ID, RFQ_TOKEN_IN, RFQ_TOKEN_OUT, RFQ_AGENT_NFT } from "@/lib/rfqConfig";

const QUOTE_TTL_SECS = 60; // calibrate via rfqViews.quoteTtlSecs() once live

// Token defaults come from the configured target (env) so the founder isn't
// pasting addresses; fall back to the mainnet test pair as placeholders.
const DEFAULT_FORM: CreateForm = {
  agentNftAddr: RFQ_AGENT_NFT,
  tokenIn: RFQ_TOKEN_IN || "0x64ceb0ff89e190cd58e66aa3702d887a0bcd084e205f1d5857e2ff3ae61a0b7f",
  amountIn: "1000000",
  tokenOut: RFQ_TOKEN_OUT || "0x4799c7cc256a0cb38d28847eae42be5caf5f21e5272a4d3eef52965c1d00cff6",
  minAmountOut: "996000",
  requestFeeQuants: "0",
  capId: "0",
};

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-500 ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}

function TxLink({ label, hash }: { label: string; hash?: string }) {
  if (!hash) return null;
  const explorer = RFQ_CHAIN_ID === 8 ? "https://suprascan.io/tx" : "https://testnet.suprascan.io/tx";
  return (
    <div className="text-xs text-zinc-400">
      {label}:{" "}
      <a
        href={`${explorer}/${hash}`}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-emerald-400 hover:underline"
      >
        {hash.slice(0, 18)}…
      </a>
    </div>
  );
}

export default function FounderCockpit({ walletAddress }: { walletAddress: string }) {
  const flow = useRfqFlow();
  const [form, setForm] = useState<CreateForm>(DEFAULT_FORM);
  const [selectedId, setSelectedId] = useState<string>(flow.steps[0].id);

  const set = (k: keyof CreateForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // TTL ticker for the accept window.
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const ttlRemaining =
    flow.quote?.signedAtSecs != null ? flow.quote.signedAtSecs + QUOTE_TTL_SECS - nowSec : null;

  const selected = useMemo(
    () => flow.steps.find((s) => s.id === selectedId) ?? flow.steps[0],
    [flow.steps, selectedId],
  );

  const canCreate = flow.phase === "idle" || flow.phase === "error" || flow.phase === "cancelled";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs">
        <span className="font-mono text-zinc-400">{walletAddress}</span>
        <span className="text-zinc-500">
          phase: <span className="text-zinc-200">{flow.phase}</span>
          {flow.busy && <span className="ml-2 text-emerald-400">working…</span>}
        </span>
      </div>

      {flow.error && (
        <p className="rounded border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          {flow.error}
        </p>
      )}

      <LifecycleRail steps={flow.steps} activeId={selected.id} onSelect={setSelectedId} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Action column */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-200">1 · Create request</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Agent NFT (selected identity)" value={form.agentNftAddr} onChange={set("agentNftAddr")} mono />
            <Field label="cap_id (CLI-minted)" value={form.capId} onChange={set("capId")} />
            <Field label="token_in" value={form.tokenIn} onChange={set("tokenIn")} mono />
            <Field label="amount_in" value={form.amountIn} onChange={set("amountIn")} />
            <Field label="token_out" value={form.tokenOut} onChange={set("tokenOut")} mono />
            <Field label="min_amount_out" value={form.minAmountOut} onChange={set("minAmountOut")} />
            <Field label="request_fee_quants" value={form.requestFeeQuants} onChange={set("requestFeeQuants")} />
          </div>
          <button
            disabled={!canCreate || flow.busy}
            onClick={() => flow.createRequest(form)}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-40"
          >
            Sign & create_request
          </button>

          <h2 className="mt-2 text-sm font-semibold text-zinc-200">2 · Quote</h2>
          <div className="flex items-center gap-3">
            <Field label="request_id" value={flow.requestId} onChange={flow.setRequestId} />
            <button
              disabled={!flow.requestId || flow.busy}
              onClick={flow.refreshQuote}
              className="mt-5 rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:border-emerald-500 disabled:opacity-40"
            >
              Refresh quote
            </button>
          </div>
          {flow.quote && (
            <div className="rounded border border-zinc-800 bg-zinc-950 p-3 text-xs">
              <div className="text-zinc-300">
                amount_out: <span className="font-mono">{flow.quote.amountOut ?? "—"}</span>
              </div>
              <div className="text-zinc-300">
                deadline_secs:{" "}
                <span className="font-mono">{flow.quote.settlementDeadlineSecs ?? "—"}</span>
              </div>
              {ttlRemaining != null && (
                <div className={ttlRemaining > 0 ? "text-emerald-400" : "text-rose-400"}>
                  TTL: {ttlRemaining > 0 ? `${ttlRemaining}s left` : "expired — quote stale"}
                </div>
              )}
            </div>
          )}
          <button
            disabled={!flow.quote?.amountOut || flow.busy || (ttlRemaining != null && ttlRemaining <= 0)}
            onClick={() => flow.acceptQuote(form.capId)}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-40"
          >
            Sign & accept_quote
          </button>

          <h2 className="mt-2 text-sm font-semibold text-zinc-200">3 · Settle</h2>
          <div className="flex items-center gap-3">
            <Field label="quote_id" value={flow.quoteId} onChange={flow.setQuoteId} />
            <button
              disabled={!flow.quoteId || flow.busy}
              onClick={flow.settle}
              className="mt-5 rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-40"
            >
              Sign & execute_settlement
            </button>
          </div>

          <details className="mt-2 text-xs text-zinc-500">
            <summary className="cursor-pointer">Recovery</summary>
            <div className="mt-2 flex gap-2">
              <button
                disabled={!flow.requestId || flow.busy}
                onClick={flow.cancel}
                className="rounded border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-amber-500 disabled:opacity-40"
              >
                cancel_request
              </button>
              <button
                disabled={!flow.quoteId || flow.busy}
                onClick={flow.claimUnwind}
                className="rounded border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-amber-500 disabled:opacity-40"
              >
                claim_unwind
              </button>
              <button
                onClick={flow.reset}
                className="rounded border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-zinc-500"
              >
                reset
              </button>
            </div>
          </details>
        </section>

        {/* Inspector column */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-200">Step inspector</h2>
          <DataPanel step={selected} />
          <div className="flex flex-col gap-1">
            <TxLink label="create_request" hash={flow.txHashes.create_request} />
            <TxLink label="accept_quote" hash={flow.txHashes.accept_quote} />
            <TxLink label="execute_settlement" hash={flow.txHashes.execute_settlement} />
            <TxLink label="cancel_request" hash={flow.txHashes.cancel_request} />
            <TxLink label="claim_unwind" hash={flow.txHashes.claim_unwind} />
          </div>
        </section>
      </div>
    </div>
  );
}
