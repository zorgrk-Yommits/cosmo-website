// Data-sparse UX telemetry for the /buy flow (G1b-3).
//
// Whitelisted events only, fire-and-forget, same-origin. The backend
// (sale-quoter /api/sale/telemetry) stores event + step + timestamps and
// NOTHING else — no wallet address, no IP logging, no fingerprint. Failures
// are swallowed: telemetry must never affect the flow.

export type SaleTelemetryEvent =
  | 'view'
  | 'connect'
  | 'quote'
  | 'review'
  | 'sign'
  | 'settle'
  | 'error';

export function pingSaleTelemetry(event: SaleTelemetryEvent, step: string): void {
  try {
    void fetch('/api/sale/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, step, ts: Date.now() }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // never throw from telemetry
  }
}
