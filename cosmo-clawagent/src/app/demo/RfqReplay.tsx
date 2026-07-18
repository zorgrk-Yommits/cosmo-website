'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProtocolNotice from '@/components/ProtocolNotice';
import {
  ALL_STEPS,
  CORE_STEPS,
  SETUP_STEPS,
  META,
  type LifecycleStep,
} from './lib/lifecycle';
import NarrativeHeader from './components/NarrativeHeader';
import LifecycleRail from './components/LifecycleRail';
import DeployDrawer from './components/DeployDrawer';
import SettlementStage from './components/SettlementStage';
import DataPanel from './components/DataPanel';
import CaveatBox from './components/CaveatBox';
import Roles from './components/Roles';
import CommunityMakerProof from './components/CommunityMakerProof';

const AUTOPLAY_MS = 2200;

export default function RfqReplay() {
  // coreIndex = replay position within the core RFQ loop.
  const [coreIndex, setCoreIndex] = useState(0);
  // selectedId = the step shown in the data panel; may be a setup step from the drawer.
  const [selectedId, setSelectedId] = useState<string>(CORE_STEPS[0].id);
  const [playing, setPlaying] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const lastCore = CORE_STEPS.length - 1;
  const selected: LifecycleStep =
    ALL_STEPS.find((s) => s.id === selectedId) ?? CORE_STEPS[0];
  const settlementArmed = selected.isSettlement;

  // ── core navigation ────────────────────────────────────────────────────────
  const goCore = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(lastCore, idx));
    setCoreIndex(clamped);
    setSelectedId(CORE_STEPS[clamped].id);
  }, [lastCore]);

  const next = useCallback(() => goCore(coreIndex + 1), [coreIndex, goCore]);
  const prev = useCallback(() => goCore(coreIndex - 1), [coreIndex, goCore]);
  const restart = useCallback(() => {
    setPlaying(false);
    goCore(0);
  }, [goCore]);

  // Selecting a core node from the rail moves the replay position too.
  const selectCore = useCallback((id: string) => {
    const idx = CORE_STEPS.findIndex((s) => s.id === id);
    if (idx >= 0) goCore(idx);
  }, [goCore]);

  // Selecting a setup node only changes the data panel, not the replay position.
  const selectAny = useCallback((id: string) => {
    setPlaying(false);
    setSelectedId(id);
  }, []);

  // ── autoplay ─────────────────────────────────────────────────────────────
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!playing) return;
    if (coreIndex >= lastCore) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => goCore(coreIndex + 1), AUTOPLAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, coreIndex, lastCore, goCore]);

  // Manual navigation cancels autoplay.
  const manualPrev = () => { setPlaying(false); prev(); };
  const manualNext = () => { setPlaying(false); next(); };

  // ── keyboard control ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { setPlaying(false); next(); }
      else if (e.key === 'ArrowLeft') { setPlaying(false); prev(); }
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const atStart = coreIndex === 0;
  const atEnd = coreIndex === lastCore;
  const onCorePosition = CORE_STEPS.some((s) => s.id === selectedId);

  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 md:py-20">
          <ProtocolNotice />
          <NarrativeHeader />

          {/* ── honest status banner (controlled proof, not permissionless) ── */}
          <CaveatBox />

          {/* ── Phase 6: first community-maker settlement (static proof) ── */}
          <CommunityMakerProof />

          {/* ── controls ───────────────────────────────────────────────── */}
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <ControlButton onClick={manualPrev} disabled={atStart} label="Previous step">
                <ChevronLeft className="h-4 w-4" />
              </ControlButton>
              <ControlButton
                onClick={() => setPlaying((p) => !p)}
                disabled={atEnd && !playing}
                label={playing ? 'Pause' : 'Play'}
                primary
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </ControlButton>
              <ControlButton onClick={manualNext} disabled={atEnd} label="Next step">
                <ChevronRight className="h-4 w-4" />
              </ControlButton>
              <ControlButton onClick={restart} label="Restart">
                <RotateCcw className="h-4 w-4" />
              </ControlButton>
            </div>

            <div className="ml-auto flex items-center gap-4 font-mono text-xs text-slate-500">
              <span>
                core step{' '}
                <span className="text-slate-200">{coreIndex + 1}</span> / {CORE_STEPS.length}
              </span>
              <span className="hidden sm:inline">
                req <span className="text-slate-300">#{META.requestId}</span> · quote{' '}
                <span className="text-slate-300">#{META.quoteId}</span>
              </span>
            </div>
          </div>

          {/* hint when viewing a setup step off the core path */}
          {!onCorePosition && (
            <p className="mt-3 font-mono text-[11px] text-slate-500">
              Viewing a deploy-phase step. Use the controls or click a rail node to return to the
              core loop.
            </p>
          )}

          {/* ── core rail ──────────────────────────────────────────────── */}
          <div className="mt-8">
            <LifecycleRail
              steps={CORE_STEPS}
              activeId={onCorePosition ? selectedId : ''}
              onSelect={selectCore}
            />
          </div>

          {/* ── deploy drawer (collapsed by default) ───────────────────── */}
          <div className="mt-6">
            <DeployDrawer
              steps={SETUP_STEPS}
              open={drawerOpen}
              activeId={selected.kind === 'setup' ? selectedId : null}
              onToggle={() => setDrawerOpen((o) => !o)}
              onSelect={selectAny}
            />
          </div>

          {/* ── settlement climax (only when settlement is active) ─────── */}
          {settlementArmed && (
            <div className="mt-8">
              <SettlementStage armed={settlementArmed} />
            </div>
          )}

          {/* ── data panel ─────────────────────────────────────────────── */}
          <div className="mt-8">
            <DataPanel step={selected} />
          </div>

          {/* ── the roles (story of the separated-role proof) ──────────── */}
          <Roles />

          {/* footer honesty line */}
          <p className="mt-10 font-mono text-[11px] leading-relaxed text-slate-600">
            Pure data visualisation from a static snapshot ({META.runDate}, {META.network},
            chain {META.chainId}). No wallet, no live RPC. Package{' '}
            <span className="text-slate-500">{META.packageAddr.slice(0, 10)}…{META.packageAddr.slice(-6)}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled,
  label,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg border font-mono transition-all',
        'disabled:cursor-not-allowed disabled:opacity-30',
        primary
          ? 'border-purple-500/50 bg-purple-600/20 text-purple-100 hover:border-purple-400 hover:bg-purple-600/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]'
          : 'border-white/10 text-slate-300 hover:border-white/30 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}
