import React from 'react';
import { JobApplication } from '../types';
import { Activity, BarChart2, TrendingUp } from 'lucide-react';
import { isOfferReceived } from '../lib/appUtils';

interface PerformanceTelemetryProps {
  applications: JobApplication[];
}

export function PerformanceTelemetry({ applications }: PerformanceTelemetryProps) {
  const totalApps = applications.length;

  // Offer detection via canonical utility
  const offersCount = applications.filter(app => isOfferReceived(app)).length;

  // Active interviews: apps that have at least one active phase
  const activeInterviewsCount = applications.filter(app =>
    app.phases.some(p => p.status === 'active')
  ).length;

  // Pipeline Health Score
  const baseScore = 50;
  const offerBonus = (offersCount / Math.max(totalApps, 1)) * 30;
  const activeBonus = (activeInterviewsCount / Math.max(totalApps, 1)) * 20;
  const pipelineScore = Math.min(100, Math.max(0, Math.round(baseScore + offerBonus + activeBonus)));

  const getPipelineTier = (score: number) => {
    if (score >= 71) return 'High Conversion';
    if (score >= 41) return 'Active Search';
    return 'Building Pipeline';
  };

  // Stage Distribution — for each phase index (0-6), count apps that have that phase active or completed
  const phaseLabels = [
    'Applied', 'Pre-screen', 'Tech Round', 'Personality', 'Final Tech', 'Negotiation', 'Offer'
  ];

  const phaseCounts = phaseLabels.map((_, phaseIdx) =>
    applications.filter(app =>
      app.phases[phaseIdx]?.status === 'active' || app.phases[phaseIdx]?.status === 'completed'
    ).length
  );

  const maxPhaseCount = Math.max(...phaseCounts, 1);

  // Key Metrics
  // Response Rate: apps that got past phase 1 (phase index 1 active or completed)
  const responseCount = applications.filter(app =>
    app.phases[1]?.status === 'active' || app.phases[1]?.status === 'completed'
  ).length;
  const responseRate = totalApps > 0 ? Math.round((responseCount / totalApps) * 100) : 0;

  // Interview Rate: apps that reached phase 3+ (phase index 2)
  const interviewCount = applications.filter(app =>
    app.phases[2]?.status === 'active' || app.phases[2]?.status === 'completed'
  ).length;
  const interviewRate = totalApps > 0 ? Math.round((interviewCount / totalApps) * 100) : 0;

  // Offer Rate
  const offerRate = totalApps > 0 ? Math.round((offersCount / totalApps) * 100) : 0;

  // Avg Self Rating
  const validRatings = applications.filter(a => a.postMortem?.selfRating > 0);
  const avgSelfRating = validRatings.length > 0
    ? (validRatings.reduce((acc, a) => acc + a.postMortem.selfRating, 0) / validRatings.length).toFixed(1)
    : null;

  const phaseBarColors = [
    'bg-slate-500',
    'bg-indigo-500',
    'bg-indigo-400',
    'bg-amber-500',
    'bg-amber-400',
    'bg-emerald-500',
    'bg-emerald-400',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" id="performance-telemetry-panel">
      {/* Card 1: Pipeline Health Score */}
      <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex flex-col justify-between hover:border-indigo-500/20 transition-all duration-300 shadow-xl lg:col-span-1">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Pipeline Analytics</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/40 px-2 py-0.5 rounded-full">
              <Activity className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Live Telemetry
            </span>
          </div>

          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Concentric Progress Ring */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-slate-800"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-indigo-500"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * pipelineScore) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
              </svg>
              <div className="text-center z-10">
                <span className="text-4xl font-black font-display text-slate-100 tracking-tight leading-none block">{pipelineScore}%</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono mt-1 block">Pipeline Efficiency</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Status</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-black mt-1 font-mono uppercase">
            {getPipelineTier(pipelineScore)}
          </p>
        </div>
      </div>

      {/* Card 2: Stage Distribution */}
      <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 hover:border-indigo-500/20 transition-all duration-300 shadow-xl lg:col-span-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-4">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Stage Breakdown</span>
            <BarChart2 className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="space-y-3">
            {phaseLabels.map((label, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-bold font-mono uppercase tracking-wider">{label}</span>
                  <span className="text-slate-300 font-black font-mono">{phaseCounts[idx]}</span>
                </div>
                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${phaseBarColors[idx]}`}
                    style={{ width: `${(phaseCounts[idx] / maxPhaseCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card 3: Conversion Metrics */}
      <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 hover:border-indigo-500/20 transition-all duration-300 shadow-xl lg:col-span-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-4">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Conversion Metrics</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2.5 border-b border-slate-900/60">
              <span className="text-xs text-slate-400 font-bold">Response Rate</span>
              <span className="text-sm font-black font-mono text-indigo-400">{responseRate}%</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-900/60">
              <span className="text-xs text-slate-400 font-bold">Interview Rate</span>
              <span className="text-sm font-black font-mono text-amber-400">{interviewRate}%</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-900/60">
              <span className="text-xs text-slate-400 font-bold">Offer Rate</span>
              <span className="text-sm font-black font-mono text-emerald-400">{offerRate}%</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-xs text-slate-400 font-bold">Avg Self-Rating</span>
              <span className="text-sm font-black font-mono text-slate-200">
                {avgSelfRating !== null ? `${avgSelfRating}/10` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-4 border-t border-slate-900">
          <span>PIPELINE_FEED: ACTIVE</span>
          <span>STABLE</span>
        </div>
      </div>
    </div>
  );
}
