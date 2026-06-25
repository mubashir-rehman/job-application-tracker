import React from 'react';
import { JobApplication } from '../types';
import { Activity, BarChart2, TrendingUp } from 'lucide-react';
import { isOfferReceived } from '../lib/appUtils';

interface PerformanceTelemetryProps {
  applications: JobApplication[];
}

export function PerformanceTelemetry({ applications }: PerformanceTelemetryProps) {
  const totalApps = applications.length;

  const offersCount = applications.filter(app => isOfferReceived(app)).length;
  const activeInterviewsCount = applications.filter(app =>
    app.phases.some(p => p.status === 'active')
  ).length;

  const baseScore = 50;
  const offerBonus = (offersCount / Math.max(totalApps, 1)) * 30;
  const activeBonus = (activeInterviewsCount / Math.max(totalApps, 1)) * 20;
  const pipelineScore = Math.min(100, Math.max(0, Math.round(baseScore + offerBonus + activeBonus)));

  const getPipelineTier = (score: number) => {
    if (score >= 71) return 'High Conversion';
    if (score >= 41) return 'Active Search';
    return 'Building Pipeline';
  };

  const phaseLabels = ['Applied', 'Pre-screen', 'Tech', 'Personality', 'Final', 'Negotiate', 'Offer'];
  const phaseCounts = phaseLabels.map((_, i) =>
    applications.filter(app =>
      app.phases[i]?.status === 'active' || app.phases[i]?.status === 'completed'
    ).length
  );
  const maxPhaseCount = Math.max(...phaseCounts, 1);

  const responseCount = applications.filter(app =>
    app.phases[1]?.status === 'active' || app.phases[1]?.status === 'completed'
  ).length;
  const interviewCount = applications.filter(app =>
    app.phases[2]?.status === 'active' || app.phases[2]?.status === 'completed'
  ).length;

  const responseRate = totalApps > 0 ? Math.round((responseCount / totalApps) * 100) : 0;
  const interviewRate = totalApps > 0 ? Math.round((interviewCount / totalApps) * 100) : 0;
  const offerRate = totalApps > 0 ? Math.round((offersCount / totalApps) * 100) : 0;

  const validRatings = applications.filter(a => a.postMortem?.selfRating > 0);
  const avgSelfRating = validRatings.length > 0
    ? (validRatings.reduce((acc, a) => acc + a.postMortem.selfRating, 0) / validRatings.length).toFixed(1)
    : null;

  const phaseBarColors = [
    'bg-slate-500', 'bg-indigo-500', 'bg-indigo-400',
    'bg-amber-500', 'bg-amber-400', 'bg-emerald-500', 'bg-emerald-400',
  ];

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/60 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/60" id="performance-telemetry-panel">

      {/* Col 1: Health Score */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
            <circle
              cx="50" cy="50" r="42"
              className="stroke-indigo-500"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="264"
              strokeDashoffset={264 - (264 * pipelineScore) / 100}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black font-display text-slate-100 leading-none">{pipelineScore}%</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Pipeline Health</span>
          </div>
          <p className="text-xs font-black text-indigo-400 font-mono uppercase">{getPipelineTier(pipelineScore)}</p>
          <p className="text-[10px] text-slate-600 font-mono mt-0.5">{totalApps} apps tracked</p>
        </div>
      </div>

      {/* Col 2: Stage Breakdown */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart2 className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Stage Breakdown</span>
        </div>
        <div className="space-y-1.5">
          {phaseLabels.map((label, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[9px] text-slate-600 font-mono uppercase w-16 shrink-0">{label}</span>
              <div className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${phaseBarColors[idx]}`}
                  style={{ width: `${(phaseCounts[idx] / maxPhaseCount) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500 font-mono w-3 text-right shrink-0">{phaseCounts[idx]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Col 3: Conversion Metrics */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Conversion</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {[
            { label: 'Response',  value: `${responseRate}%`,  color: 'text-indigo-400' },
            { label: 'Interview', value: `${interviewRate}%`, color: 'text-amber-400' },
            { label: 'Offer',     value: `${offerRate}%`,     color: 'text-emerald-400' },
            { label: 'Self-Rtg',  value: avgSelfRating ? `${avgSelfRating}/10` : 'N/A', color: 'text-slate-300' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[9px] text-slate-600 font-mono uppercase">{label}</p>
              <p className={`text-sm font-black font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
