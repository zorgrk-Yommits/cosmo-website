import { Banknote, Hammer, Lock, PiggyBank, Search, Send, ShieldCheck, Tags, Wallet } from 'lucide-react';
import type { FlowStep } from './FlowStrip';

// The two processes every market page refers to, defined once so the picture
// is the same wherever it appears. Step names match phases.ts and the rails in
// app/market/lib/marketStatus.ts.

export const BUYER_FLOW: FlowStep[] = [
  { id: 'post', icon: Send, label: 'Post job', note: 'Say what you need and what counts as done.' },
  { id: 'offer', icon: Tags, label: 'Get offer', note: 'A provider names a price and a delivery time.' },
  { id: 'lock', icon: Lock, label: 'Lock payment', note: 'Your tokens are held, not paid to anyone yet.' },
  { id: 'work', icon: Hammer, label: 'Work happens', note: 'The provider does the job and hands in the result.' },
  { id: 'check', icon: Search, label: 'Check result', note: 'You compare it with what you asked for.' },
  { id: 'pay', icon: Banknote, label: 'Pay provider', note: 'The locked payment goes to the provider.' },
];

// Providers do not "accept" a job: they make an offer and the buyer chooses.
export const PROVIDER_FLOW: FlowStep[] = [
  { id: 'wallet', icon: Wallet, label: 'Wallet', note: 'Connect the wallet you work with.' },
  { id: 'deposit', icon: ShieldCheck, label: 'Safety deposit', note: 'Put down a deposit that stands behind your work.' },
  { id: 'offer', icon: Tags, label: 'Make an offer', note: 'Name your price and delivery time for a job.' },
  { id: 'work', icon: Hammer, label: 'Do work', note: 'Do the job and hand in the result.' },
  { id: 'paid', icon: Banknote, label: 'Get paid', note: 'The locked payment is released to you.' },
  { id: 'withdraw', icon: PiggyBank, label: 'Withdraw deposit', note: 'Take the deposit back when no job is active.' },
];
