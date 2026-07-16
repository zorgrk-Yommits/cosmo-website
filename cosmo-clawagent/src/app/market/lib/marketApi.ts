// Typed client for the cosmo-market-api public surface (/api/market/, same
// origin via nginx). Shapes mirror the backend's PUBLIC projections exactly —
// contactEmail/moderationNote/sigProof never appear here by design.

export type JobStatus = 'submitted' | 'approved' | 'rejected' | 'selected' | 'onchain';

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
