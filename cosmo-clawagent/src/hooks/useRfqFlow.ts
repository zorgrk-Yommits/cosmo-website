"use client";

// Interactive RFQ taker flow for the founder cockpit. Orchestrates
// supraTx (build) -> starkeySign (wallet sign+send) -> rfqViews (read).
//
// This is the live counterpart to demo/lib/lifecycle.ts (which only replays a
// static snapshot). Only TAKER actions are driven here; the maker side
// (submit_quote/fund_quote) is served off-chain by the maker-daemon, so this
// flow polls for the quote rather than producing it.
//
// id discovery: after a successful create_request we set request_id =
// get_next_request_id() - 1 (robust against unknown view shapes). The founder
// can override ids manually if auto-detect is off on a given chain.

import { useCallback, useMemo, useState } from "react";
import type { LifecycleStep } from "@/app/demo/lib/lifecycle";
import * as tx from "@/lib/supraTx";
import { signAndSend } from "@/lib/starkeySign";
import {
  getNextQuoteId,
  getNextRequestId,
  getQuote,
} from "@/lib/rfqViews";

export type FlowPhase =
  | "idle"
  | "requesting"
  | "requested"
  | "quoted"
  | "accepting"
  | "accepted"
  | "settling"
  | "settled"
  | "cancelled"
  | "unwound"
  | "error";

export type CreateForm = {
  agentNftAddr: string;
  tokenIn: string;
  amountIn: string;
  tokenOut: string;
  minAmountOut: string;
  requestFeeQuants: string;
  capId: string;
};

// Tolerant view of get_quote -- calibrated against the live view once a target
// chain is deployed. Until then we extract leniently and keep the raw payload.
export type QuoteView = {
  amountOut: string | null;
  signedAtSecs: number | null;
  settlementDeadlineSecs: number | null;
  raw: unknown;
};

type TxMap = Partial<Record<"create_request" | "accept_quote" | "execute_settlement" | "cancel_request" | "claim_unwind", string>>;

function toBig(v: unknown): string | null {
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "string" && /^\d+$/.test(v)) return v;
  return null;
}
function toNum(v: unknown): number | null {
  const b = toBig(v);
  return b === null ? null : Number(b);
}

// invokeViewMethod returns `any` (often an array of return values, sometimes a
// nested struct). Pull amount_out / signed_at / deadline by key or position.
function parseQuote(raw: unknown): QuoteView | null {
  if (raw === null || raw === undefined) return null;
  const root = Array.isArray(raw) ? raw[0] ?? raw : raw;
  const o = (root && typeof root === "object" ? root : {}) as Record<string, unknown>;
  const arr = Array.isArray(raw) ? (raw as unknown[]) : [];
  const amountOut = toBig(o.amount_out) ?? toBig(arr[0]);
  const signedAtSecs = toNum(o.signed_at_secs) ?? toNum(arr[1]);
  const settlementDeadlineSecs = toNum(o.settlement_deadline_secs) ?? toNum(arr[2]);
  if (amountOut === null && signedAtSecs === null) return null;
  return { amountOut, signedAtSecs, settlementDeadlineSecs, raw };
}

export function useRfqFlow() {
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string>("");
  const [quoteId, setQuoteId] = useState<string>("");
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [txHashes, setTxHashes] = useState<TxMap>({});
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (next: FlowPhase, fn: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        setPhase(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const createRequest = useCallback(
    (form: CreateForm) =>
      run("requested", async () => {
        const hash = await signAndSend(
          tx.createRequest({
            agentNftAddr: form.agentNftAddr,
            tokenIn: form.tokenIn,
            amountIn: form.amountIn,
            tokenOut: form.tokenOut,
            minAmountOut: form.minAmountOut,
            requestFeeQuants: form.requestFeeQuants,
          }),
        );
        setTxHashes((m) => ({ ...m, create_request: hash }));
        const nextId = toNum(await getNextRequestId());
        if (nextId !== null && nextId > 0) setRequestId(String(nextId - 1));
      }),
    [run],
  );

  const refreshQuote = useCallback(async () => {
    if (!requestId) return;
    try {
      const q = parseQuote(await getQuote(requestId));
      setQuote(q);
      if (q) setPhase((p) => (p === "requested" ? "quoted" : p));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [requestId]);

  const acceptQuote = useCallback(
    (capId: string) =>
      run("accepted", async () => {
        if (!requestId) throw new Error("No request id.");
        if (!quote?.amountOut || quote.signedAtSecs === null || quote.settlementDeadlineSecs === null)
          throw new Error("No complete quote to accept (refresh first).");
        const hash = await signAndSend(
          tx.acceptQuote({
            requestId,
            capId,
            expectedAmountOut: quote.amountOut,
            expectedSignedAt: quote.signedAtSecs,
            expectedSettlementDeadlineSecs: quote.settlementDeadlineSecs,
          }),
          { expirySecs: 50 }, // stay inside the ~60s quote TTL envelope
        );
        setTxHashes((m) => ({ ...m, accept_quote: hash }));
        const nq = toNum(await getNextQuoteId());
        if (nq !== null && nq > 0) setQuoteId(String(nq - 1));
      }),
    [run, requestId, quote],
  );

  const settle = useCallback(
    () =>
      run("settled", async () => {
        if (!quoteId) throw new Error("No quote id (set it or accept first).");
        const hash = await signAndSend(tx.executeSettlement({ quoteId }));
        setTxHashes((m) => ({ ...m, execute_settlement: hash }));
      }),
    [run, quoteId],
  );

  const cancel = useCallback(
    () =>
      run("cancelled", async () => {
        if (!requestId) throw new Error("No request id.");
        const hash = await signAndSend(tx.cancelRequest({ requestId }));
        setTxHashes((m) => ({ ...m, cancel_request: hash }));
      }),
    [run, requestId],
  );

  const claimUnwind = useCallback(
    () =>
      run("unwound", async () => {
        if (!quoteId) throw new Error("No quote id.");
        const hash = await signAndSend(tx.claimUnwind({ quoteId }));
        setTxHashes((m) => ({ ...m, claim_unwind: hash }));
      }),
    [run, quoteId],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setRequestId("");
    setQuoteId("");
    setQuote(null);
    setTxHashes({});
  }, []);

  // Live rail steps (reuses the demo LifecycleStep shape -> LifecycleRail/DataPanel).
  const steps: LifecycleStep[] = useMemo(() => {
    const done = (label: string) => Boolean(txHashes[label as keyof TxMap]);
    const mk = (
      id: string,
      title: string,
      kind: LifecycleStep["kind"],
      label: string,
      extra: Partial<LifecycleStep> = {},
    ): LifecycleStep => ({
      id,
      label,
      title,
      kind,
      sender: "",
      txHash: txHashes[label as keyof TxMap] ?? null,
      vmStatus: null,
      blockHeight: null,
      timestamp: null,
      eventName: null,
      events: [],
      isSettlement: label === "execute_settlement",
      ...extra,
    });
    return [
      mk("create_request", "Create request", "onchain", "create_request"),
      mk("await_quote", "Maker quotes (off-chain)", "offchain", "submit_quote", {
        eventName: quote ? "QuoteReady" : null,
      }),
      mk("accept_quote", "Accept quote", "onchain", "accept_quote"),
      mk("execute_settlement", "Execute settlement", "onchain", "execute_settlement"),
    ].map((s) => ({ ...s, vmStatus: done(s.label) ? "Executed successfully" : s.vmStatus }));
  }, [txHashes, quote]);

  return {
    phase,
    error,
    busy,
    requestId,
    setRequestId,
    quoteId,
    setQuoteId,
    quote,
    txHashes,
    steps,
    createRequest,
    refreshQuote,
    acceptQuote,
    settle,
    cancel,
    claimUnwind,
    reset,
  };
}
