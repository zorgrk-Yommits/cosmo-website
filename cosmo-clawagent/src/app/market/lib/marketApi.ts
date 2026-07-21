// Typed client for the cosmo-market-api public surface (/api/market/, same
// origin via nginx). Shapes mirror the backend's PUBLIC projections exactly —
// contactEmail/moderationNote/sigProof never appear here by design.

export type JobStatus =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'selected'
  | 'onchain'
  | 'delivered'
  | 'settled';

export interface TxRefs {
  create?: string;
  submitQuote?: string;
  accept?: string;
  deliver?: string;
  settle?: string;
  dispute?: string;
}

export interface MarketJob {
  id: string;
  status: JobStatus;
  title: string;
  description: string;
  acceptanceCriteria: string;
  budgetAmount: string;
  budgetAsset: string;
  deadlineTs: number;
  buyerWallet?: string;
  createdAt: number;
  updatedAt: number;
  specCanonical?: string;
  specHash?: string;
  selectedOfferId?: string;
  requestId?: number;
  jobIdOnchain?: number;
  // Frozen delivery attestation (M5) — hash of the exact bytes served at
  // /jobs/:id/attestation; goes on-chain as result_hash.
  attestationHash?: string;
  txRefs: TxRefs;
}

export interface MarketOffer {
  id: string;
  jobId: string;
  providerId: string;
  price: string;
  deliverySecs: number;
  note?: string;
  source: 'wallet' | 'admin';
  createdAt: number;
}

export interface MarketProvider {
  id: string;
  name: string;
  skills: string[];
  wallet: string;
  status: 'active' | 'paused';
  links: string[];
  bio?: string;
  createdAt: number;
  updatedAt: number;
}

export interface JobSubmission {
  title: string;
  description: string;
  acceptanceCriteria: string;
  budgetAmount: string;
  budgetAsset: string;
  deadlineTs: number;
  contactEmail: string;
  buyerWallet?: string;
  // Honeypot — must stay empty; the form renders it invisibly.
  website?: string;
}

export const API_BASE = '/api/market';

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;
  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      typeof body.error === 'string' ? body.error : `HTTP ${res.status}`,
      body.details as Record<string, string[]> | undefined,
    );
  }
  return body as T;
}

export async function fetchJobs(): Promise<MarketJob[]> {
  const { jobs } = await request<{ jobs: MarketJob[] }>('/jobs');
  return jobs;
}

export async function fetchJob(id: string): Promise<{ job: MarketJob; offers: MarketOffer[] }> {
  return request(`/jobs/${encodeURIComponent(id)}`);
}

export async function fetchJobStatus(id: string): Promise<{
  id: string;
  status: JobStatus;
  specHash?: string;
  requestId?: number;
  txRefs: TxRefs;
  updatedAt: number;
}> {
  return request(`/jobs/${encodeURIComponent(id)}/status`);
}

export async function fetchProviders(): Promise<MarketProvider[]> {
  const { providers } = await request<{ providers: MarketProvider[] }>('/providers');
  return providers;
}

export async function submitJob(payload: JobSubmission): Promise<{ id: string; status: JobStatus }> {
  return request('/jobs', { method: 'POST', body: JSON.stringify(payload) });
}

// URL of the frozen canonical spec — this exact URL becomes the on-chain
// workload_uri once the job goes on-chain (M4).
export function specUrl(id: string): string {
  return `${API_BASE}/jobs/${encodeURIComponent(id)}/spec`;
}

// ---- Wallet offer flow (M3) -------------------------------------------------

export interface OfferTerms {
  jobId: string;
  providerId: string;
  price: string;
  deliverySecs: number;
  note?: string;
}

export interface OfferChallenge {
  challenge: string; // signed TEXT (server rebuilds and compares byte-exact)
  hexMessage: string; // what StarKey signMessage expects as `message`
  nonce: string;
  expiresTs: number;
}

export async function requestOfferChallenge(terms: OfferTerms): Promise<OfferChallenge> {
  return request('/offers/challenge', { method: 'POST', body: JSON.stringify(terms) });
}

export async function submitWalletOffer(
  terms: OfferTerms,
  proof: { message: string; signature: string; publicKey: string; address: string },
): Promise<{ id: string; status: string }> {
  return request('/offers', { method: 'POST', body: JSON.stringify({ ...terms, proof }) });
}

// ---- On-chain flow (M4) -------------------------------------------------------

export interface FlowEscrowParams {
  workloadUri: string;
  inputHash: string;
  paymentFa: string;
  assetSymbol: string;
  assetDecimals: number;
  maxPriceQuants: string;
  minBondQuants: string;
  jobDeadlineSecs: number;
  reviewWindowSecs: number;
}

export interface FlowState {
  jobId: string;
  status: JobStatus;
  selectedOfferId: string | null;
  buyerWallet: string | null;
  requestId: number | null;
  jobIdOnchain: number | null;
  txRefs: TxRefs;
  rail: {
    packageAddr: string;
    chainId: number;
    paused: boolean;
    v2Initialized: boolean;
    onboardingPaused: boolean;
    quoteTtlSecs: number;
  };
  deliver: {
    attestationUri: string;
    attestationHash: string | null;
  } | null;
  escrowParams: FlowEscrowParams | null;
  providerChecks: {
    wallet: string;
    eligible: boolean;
    hasCapacity: boolean;
    bondQuants: string;
    bondCoversMinimum: boolean;
  } | null;
}

export async function requestSelectChallenge(
  jobId: string,
  offerId: string,
): Promise<OfferChallenge> {
  return request(`/jobs/${encodeURIComponent(jobId)}/select/challenge`, {
    method: 'POST',
    body: JSON.stringify({ offerId }),
  });
}

export async function submitSelect(
  jobId: string,
  offerId: string,
  proof: { message: string; signature: string; publicKey: string; address: string },
): Promise<{ jobId: string; offerId: string; buyerWallet: string }> {
  return request(`/jobs/${encodeURIComponent(jobId)}/select`, {
    method: 'POST',
    body: JSON.stringify({ offerId, proof }),
  });
}

export async function fetchFlow(jobId: string): Promise<FlowState> {
  return request(`/jobs/${encodeURIComponent(jobId)}/flow`);
}

export async function confirmRequest(
  jobId: string,
  txHash?: string,
): Promise<{ jobId: string; requestId: number }> {
  return request(`/jobs/${encodeURIComponent(jobId)}/confirm-request`, {
    method: 'POST',
    body: JSON.stringify(txHash ? { txHash } : {}),
  });
}

export interface ArmResult {
  txHash: string;
  requestId: number;
  solver: string;
  priceQuants: string;
  signedAtSecs: number;
  expiresAtSecs: number;
  payloadSha3: string;
}

export async function armQuote(jobId: string): Promise<ArmResult> {
  return request(`/jobs/${encodeURIComponent(jobId)}/arm`, { method: 'POST', body: '{}' });
}

export async function confirmAccept(
  jobId: string,
  txHash?: string,
): Promise<{ jobId: string; jobIdOnchain: number }> {
  return request(`/jobs/${encodeURIComponent(jobId)}/confirm-accept`, {
    method: 'POST',
    body: JSON.stringify(txHash ? { txHash } : {}),
  });
}

// ---- M5 delivery ------------------------------------------------------------

// URL of the frozen delivery attestation — this exact URL goes on-chain as
// result_uri; the sha3-256 of its bytes is result_hash.
export function attestationUrl(id: string): string {
  return `${API_BASE}/jobs/${encodeURIComponent(id)}/attestation`;
}

export async function confirmDeliver(
  jobId: string,
  txHash?: string,
): Promise<{ jobId: string; status: JobStatus; resultHash: string }> {
  return request(`/jobs/${encodeURIComponent(jobId)}/confirm-deliver`, {
    method: 'POST',
    body: JSON.stringify(txHash ? { txHash } : {}),
  });
}

export async function confirmSettle(
  jobId: string,
  txHash?: string,
): Promise<{ jobId: string; status: JobStatus }> {
  return request(`/jobs/${encodeURIComponent(jobId)}/confirm-settle`, {
    method: 'POST',
    body: JSON.stringify(txHash ? { txHash } : {}),
  });
}

// ---- L2 next-steps ----------------------------------------------------------
// Server-computed "whose turn, what is the ONE next action per role" document.
// The website renders it; external solver agents consume the same endpoint.

export type NextRole = 'buyer' | 'provider' | 'observer';
export type NextTurn = 'buyer' | 'provider' | 'server' | 'nobody';

export interface NextBlocker {
  code: string;
  cause: string;
  remedy: string;
}

export interface NextTxTemplate {
  function: string;
  typeArgs: string[];
  args: { name: string; type: 'u64' | 'address' | 'hex_bytes' | 'utf8_bytes'; value: string }[];
  display: { hashToCommit: string | null; deadline: number | null };
}

export interface NextAction {
  id: string;
  kind: 'wallet_tx' | 'wallet_sign' | 'api_call';
  txTemplate?: NextTxTemplate;
  api?: { method: 'GET' | 'POST'; path: string };
  signerWallet: string | null;
}

export interface NextOfferReadiness {
  offerId: string;
  providerId: string;
  providerName: string;
  providerWallet: string;
  price: string;
  deliverySecs: number;
  eligible: boolean;
  hasCapacity: boolean;
  bondQuants: string;
  bondCoversMinimum: boolean;
  blockers: NextBlocker[];
}

export interface NextRoleBlock {
  role: NextRole;
  state: string;
  headline: string;
  action: NextAction | null;
  blockers: NextBlocker[];
  offerReadiness?: NextOfferReadiness[];
}

export interface NextStepsDoc {
  jobId: string;
  jobType: 'attestation' | 'artifact';
  status: JobStatus;
  requestId: number | null;
  jobIdOnchain: number | null;
  chain: {
    readAt: number;
    requestStatus: number | null;
    jobStatus: number | null;
    quote: { solver: string; priceQuants: string; signedAtSecs: number; expiresAtSecs: number } | null;
  };
  turn: NextTurn;
  roles: NextRoleBlock[];
}

export async function fetchNextSteps(jobId: string): Promise<NextStepsDoc> {
  return request(`/jobs/${encodeURIComponent(jobId)}/next-steps`);
}
