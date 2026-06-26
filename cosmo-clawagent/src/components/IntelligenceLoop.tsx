'use client';

import React from 'react';

type NodeType = 'WHEN' | 'GET' | 'THINK' | 'ACT' | 'FLOW' | 'TRANSACT' | 'THINK+ACT';

const TYPE_COLORS: Record<string, string> = {
  WHEN: '#4ade80',
  GET: '#60a5fa',
  THINK: '#facc15',
  ACT: '#fb923c',
  FLOW: '#a78bfa',
  TRANSACT: '#22d3ee',
  'THINK+ACT': '#facc15',
};

const TYPE_TEXT_CLASS: Record<NodeType, string> = {
  WHEN: 'text-green-400',
  GET: 'text-blue-400',
  THINK: 'text-yellow-400',
  ACT: 'text-orange-400',
  FLOW: 'text-purple-400',
  TRANSACT: 'text-cyan-400',
  'THINK+ACT': 'text-yellow-400',
};

interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  featured?: boolean;
}

const nodes: GraphNode[] = [
  { id: 'when',       type: 'WHEN',      title: 'Price Trigger',      subtitle: 'RFQ inbound or opportunity', x: 12, y: 12 },
  { id: 'oracle',     type: 'GET',       title: 'Oracle Node',        subtitle: 'DORA price validation',       x: 37, y: 12 },
  { id: 'arbiter',    type: 'GET',       title: 'Arbiter',            subtitle: 'Spread scan across pools',    x: 63, y: 12 },
  { id: 'strategist', type: 'THINK',     title: 'Strategist',         subtitle: 'Evaluate + route signal',     x: 88, y: 12 },
  { id: 'decision',   type: 'FLOW',      title: 'Strategy Decision',  subtitle: 'Profitable?',                  x: 50, y: 42 },
  { id: 'discard',    type: 'FLOW',      title: 'Discard Signal',     subtitle: 'Back to Arbiter',              x: 22, y: 70 },
  { id: 'cosmo',      type: 'TRANSACT',  title: 'COSMO',              subtitle: 'Accountable execution',        x: 78, y: 70, featured: true },
  { id: 'liquidity',  type: 'ACT',       title: 'Liquidity General',  subtitle: 'Vault rebalance',              x: 36, y: 90 },
  { id: 'keeper',     type: 'THINK+ACT', title: 'Keeper',             subtitle: 'Archive + Learning Layer',     x: 64, y: 90 },
];

const NODE_W = 180;
const NODE_H = 78;

function NodeCard({ node }: { node: GraphNode }) {
  const colorClass = TYPE_TEXT_CLASS[node.type];
  const borderColor = node.featured ? '#7B2FBE' : `${TYPE_COLORS[node.type]}55`;
  const featuredShadow = node.featured
    ? { boxShadow: '0 0 12px rgba(123,47,190,0.4)' }
    : {};
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-sm rounded-md p-3 text-center"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        width: `${NODE_W}px`,
        height: `${NODE_H}px`,
        borderStyle: 'solid',
        borderWidth: node.featured ? '1.5px' : '1px',
        borderColor,
        ...featuredShadow,
      }}
    >
      <div className={`font-mono text-[10px] tracking-widest font-bold uppercase ${colorClass} mb-1`}>
        {node.type}
      </div>
      <div className="font-mono text-[14px] font-bold text-white leading-tight">
        {node.title}
      </div>
      <div className="font-mono text-[11px] text-slate-400 mt-0.5 leading-tight">
        {node.subtitle}
      </div>
    </div>
  );
}

export default function IntelligenceLoop() {
  // SVG viewBox 1000 x 600 maps to container percentages: 1% width = 10 svg units, 1% height = 6 svg units
  const sx = (pct: number) => pct * 10;
  const sy = (pct: number) => pct * 6;

  const p = nodes.reduce<Record<string, { x: number; y: number }>>((acc, n) => {
    acc[n.id] = { x: sx(n.x), y: sy(n.y) };
    return acc;
  }, {});

  // half-extents in SVG units (NODE_W=180px, NODE_H=78px). Viewbox is unitless so use approximate edges.
  const HX = 90;
  const HY = 39;

  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 py-16">
      <div className="mb-10 text-center">
        <h2 className="font-mono text-3xl font-bold text-white mb-2">
          {'>'} The EOM Intelligence Loop
        </h2>
        <p className="text-slate-400 font-mono text-sm">
          Eight agents. One execution layer. Built natively in SupraOS Bot Builder syntax.
          <span className="blinking-cursor" />
        </p>
      </div>

      <div
        className="relative rounded-lg p-8 backdrop-blur-sm"
        style={{
          background: 'rgba(0,0,0,0.4)',
          borderStyle: 'solid',
          borderWidth: '0.5px',
          borderColor: '#1f1f1f',
        }}
      >
        {/* Header: Status (left) + Legend (right) */}
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs text-emerald-400 tracking-widest uppercase font-bold">
              Active
            </span>
            <span className="font-mono text-xs text-slate-600 mx-1">|</span>
            <span className="font-mono text-xs text-slate-300 tracking-wide">
              EOM Intelligence Loop
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {(['WHEN', 'GET', 'THINK', 'FLOW', 'ACT', 'TRANSACT'] as const).map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: TYPE_COLORS[t] }}
                />
                <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase">
                  {t}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop graph */}
        <div
          className="hidden md:block relative"
          style={{ aspectRatio: '10 / 6', minHeight: '560px' }}
        >
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
          >
            <defs>
              <marker id="arrow-default" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#3a3a3a" />
              </marker>
              <marker id="arrow-active" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#7B2FBE" />
              </marker>
              <marker id="arrow-pass" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#4ade80" />
              </marker>
              <marker id="arrow-fail" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#ef4444" />
              </marker>
            </defs>

            {/* Row 1: WHEN -> Oracle -> Arbiter -> Strategist */}
            <line x1={p.when.x + HX}    y1={p.when.y}    x2={p.oracle.x - HX}     y2={p.oracle.y}     stroke="#2a2a2a" strokeWidth="1" markerEnd="url(#arrow-default)" />
            <line x1={p.oracle.x + HX}  y1={p.oracle.y}  x2={p.arbiter.x - HX}    y2={p.arbiter.y}    stroke="#2a2a2a" strokeWidth="1" markerEnd="url(#arrow-default)" />
            <line x1={p.arbiter.x + HX} y1={p.arbiter.y} x2={p.strategist.x - HX} y2={p.strategist.y} stroke="#2a2a2a" strokeWidth="1" markerEnd="url(#arrow-default)" />

            {/* Strategist -> Decision (curve down-left, active path) */}
            <path
              d={`M ${p.strategist.x},${p.strategist.y + HY} C ${p.strategist.x},${p.decision.y - 30} ${p.decision.x + HX + 60},${p.decision.y} ${p.decision.x + HX},${p.decision.y}`}
              stroke="#7B2FBE" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-active)"
            />

            {/* Decision -> Discard (FAIL branch) */}
            <path
              d={`M ${p.decision.x - HX},${p.decision.y} C ${(p.decision.x + p.discard.x) / 2},${p.decision.y + 40} ${p.discard.x},${p.decision.y + 40} ${p.discard.x},${p.discard.y - HY}`}
              stroke="#ef4444" strokeWidth="1.2" fill="none" markerEnd="url(#arrow-fail)"
            />
            <text
              x={(p.decision.x - HX + p.discard.x) / 2 - 10}
              y={p.decision.y + 30}
              fill="#ef4444" fontSize="10" fontFamily="monospace" fontWeight="bold" letterSpacing="1"
            >FAIL</text>

            {/* Decision -> COSMO (PASS branch) */}
            <path
              d={`M ${p.decision.x + HX},${p.decision.y} C ${(p.decision.x + p.cosmo.x) / 2},${p.decision.y + 40} ${p.cosmo.x},${p.decision.y + 40} ${p.cosmo.x},${p.cosmo.y - HY}`}
              stroke="#4ade80" strokeWidth="1.5" fill="none" markerEnd="url(#arrow-pass)"
            />
            <text
              x={(p.decision.x + HX + p.cosmo.x) / 2 + 10}
              y={p.decision.y + 30}
              fill="#4ade80" fontSize="10" fontFamily="monospace" fontWeight="bold" letterSpacing="1"
            >PASS</text>

            {/* COSMO -> Keeper (archive outcome) */}
            <path
              d={`M ${p.cosmo.x},${p.cosmo.y + HY} C ${p.cosmo.x},${(p.cosmo.y + p.keeper.y) / 2} ${p.keeper.x + 40},${(p.cosmo.y + p.keeper.y) / 2} ${p.keeper.x + 40},${p.keeper.y - HY}`}
              stroke="#7B2FBE" strokeWidth="1.2" fill="none" markerEnd="url(#arrow-active)"
            />

            {/* Keeper -> Liquidity (rebalance feed) */}
            <line
              x1={p.keeper.x - HX} y1={p.keeper.y}
              x2={p.liquidity.x + HX} y2={p.liquidity.y}
              stroke="#3a3a3a" strokeWidth="1" markerEnd="url(#arrow-default)"
            />

            {/* Discard -> Arbiter (loopback, dashed muted) */}
            <path
              d={`M ${p.discard.x},${p.discard.y - HY} C ${p.discard.x - 60},${(p.discard.y + p.arbiter.y) / 2} ${p.arbiter.x - HX - 60},${p.arbiter.y + 30} ${p.arbiter.x - HX},${p.arbiter.y + 20}`}
              stroke="#ef4444" strokeWidth="1" fill="none"
              strokeDasharray="3 3" opacity="0.55"
              markerEnd="url(#arrow-fail)"
            />

            {/* Karpathy Loop: Keeper -> Strategist (dashed feedback, long curve) */}
            <path
              d={`M ${p.keeper.x + HX},${p.keeper.y} C ${p.keeper.x + 220},${p.keeper.y} ${p.strategist.x + 80},${p.keeper.y} ${p.strategist.x + 80},${(p.strategist.y + p.keeper.y) / 2} S ${p.strategist.x + 30},${p.strategist.y} ${p.strategist.x},${p.strategist.y + HY}`}
              stroke="#a78bfa" strokeWidth="1" fill="none"
              strokeDasharray="4 4" opacity="0.7"
              markerEnd="url(#arrow-active)"
            />
            <text
              x={p.strategist.x + 20}
              y={(p.strategist.y + p.keeper.y) / 2 - 10}
              fill="#a78bfa" fontSize="10" fontFamily="monospace" fontWeight="bold" letterSpacing="1.5"
            >LEARNING FEEDBACK</text>
          </svg>

          {nodes.map((n) => (
            <NodeCard key={n.id} node={n} />
          ))}
        </div>

        {/* Mobile: vertical stacked */}
        <div className="md:hidden flex flex-col gap-3 items-stretch">
          {nodes.map((n, i) => (
            <React.Fragment key={n.id}>
              <div
                className="bg-black/60 rounded-md p-3"
                style={{
                  borderStyle: 'solid',
                  borderWidth: n.featured ? '1.5px' : '1px',
                  borderColor: n.featured ? '#7B2FBE' : `${TYPE_COLORS[n.type]}55`,
                  ...(n.featured ? { boxShadow: '0 0 12px rgba(123,47,190,0.4)' } : {}),
                }}
              >
                <div className={`font-mono text-[10px] tracking-widest font-bold uppercase ${TYPE_TEXT_CLASS[n.type]} mb-1`}>
                  {n.type}
                </div>
                <div className="font-mono text-sm font-bold text-white leading-tight">{n.title}</div>
                <div className="font-mono text-[11px] text-slate-400 mt-0.5 leading-tight">{n.subtitle}</div>
              </div>
              {i < nodes.length - 1 && (
                <div className="text-center text-purple-400/60 font-mono text-xs">↓</div>
              )}
            </React.Fragment>
          ))}
          <div className="text-center text-purple-400/60 font-mono text-[10px] tracking-widest uppercase mt-2 pt-3 border-t border-white/5">
            Karpathy Loop · Keeper → Strategist · Learning Feedback
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {[
          { value: '8',     label: 'Agents | EOM Swarm' },
          { value: '1',     label: 'Execution Layer | COSMO' },
          { value: '5',     label: 'Chains — multi-chain roadmap' },
          { value: '21/30', label: 'Council | $COSMO-staked' },
          { value: '60s',   label: 'Window | Settlement Deadline' },
          { value: '∞',     label: 'Loop | Karpathy Feedback' },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-md p-4"
            style={{
              background: 'rgba(0,0,0,0.4)',
              borderStyle: 'solid',
              borderWidth: '0.5px',
              borderColor: '#1f1f1f',
            }}
          >
            <div className="font-mono text-2xl font-bold text-white leading-tight">{m.value}</div>
            <div className="font-mono text-[10px] text-slate-500 mt-1 uppercase tracking-wider leading-snug">
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
