import { describe, expect, it } from 'vitest';
import { buildBuyerSteps } from '@/app/market/lib/marketStatus';
import { PHASES, findPhaseCoverageGaps } from './phases';

// The landing tells visitors that its six phases ARE the real job lifecycle.
// That claim is only true as long as the two lists agree, and nothing in the
// type system enforces it — so it is enforced here.

const lifecycleStepIds = () =>
  buildBuyerSteps({ status: 'settled' }, 0).map((s) => s.id);

describe('landing phases vs. the real buyer lifecycle', () => {
  it('covers every lifecycle step exactly once', () => {
    expect(findPhaseCoverageGaps(lifecycleStepIds(), PHASES)).toEqual({
      uncovered: [],
      unknown: [],
      duplicated: [],
    });
  });

  // Counter-proof: the assertion above must be capable of failing. If the
  // protocol grows a step and nobody updates phases.ts, this is the shape of
  // the failure the suite will report.
  it('reports a gap when the lifecycle grows a step the phases do not claim', () => {
    const withNewStep = [...lifecycleStepIds(), 'arbitrate'];
    expect(findPhaseCoverageGaps(withNewStep, PHASES).uncovered).toEqual(['arbitrate']);
  });

  it('reports a gap when a phase claims a step that no longer exists', () => {
    const shrunk = lifecycleStepIds().filter((id) => id !== 'approve');
    expect(findPhaseCoverageGaps(shrunk, PHASES).unknown).toEqual(['approve']);
  });

  it('reports duplication when two phases claim the same step', () => {
    const doubled = [
      ...PHASES,
      { ...PHASES[0], id: 'copy', steps: ['escrow'] },
    ];
    expect(findPhaseCoverageGaps(lifecycleStepIds(), doubled).duplicated).toEqual(['escrow']);
  });

  it('names an actor for every phase — a waiting state must say whose turn it is', () => {
    for (const phase of PHASES) {
      expect(phase.actor, `${phase.id} has no actor`).toBeTruthy();
    }
  });

  it('marks the on-chain boundary as one contiguous tail', () => {
    // Once a job is funded it never goes back off-chain. The rail draws a
    // single "on-chain" bracket, which is only honest if that holds.
    const firstOnchain = PHASES.findIndex((p) => p.onchain);
    expect(firstOnchain).toBeGreaterThan(0);
    expect(PHASES.slice(firstOnchain).every((p) => p.onchain)).toBe(true);
    expect(PHASES.slice(0, firstOnchain).every((p) => !p.onchain)).toBe(true);
  });
});
