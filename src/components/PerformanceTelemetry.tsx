import React from 'react';
import { JobApplication } from '../types';
import { Activity, ShieldCheck, Zap, MessageSquare, Cpu, TrendingUp } from 'lucide-react';

interface PerformanceTelemetryProps {
  applications: JobApplication[];
}

export function PerformanceTelemetry({ applications }: PerformanceTelemetryProps) {
  // Compute some telemetry values dynamically
  const totalApps = applications.length;
  const offersCount = applications.filter(app => {
    const s = app.currentStatus.toLowerCase();
    return s.includes('offer') || app.phases[6].status === 'completed';
  }).length;
  
  const activeInterviews = applications.filter(app => {
    const s = app.currentStatus.toLowerCase();
    return s.includes('interview') || s.includes('screening') || s.includes('technical') || s.includes('negotiation');
  }).length;

  // Base rating averages from post-mortems if available, or default values
  let avgSelfRating = 8.0;
  const validRatings = applications.filter(a => a.postMortem?.selfRating > 0);
  if (validRatings.length > 0) {
    avgSelfRating = validRatings.reduce((acc, a) => acc + a.postMortem.selfRating, 0) / validRatings.length;
  }

  // Calculate dynamic overall Career Readiness Score (Index)
  // Base 75 + offers * 6 + activeInterviews * 3 + selfRating adjustment
  const rawScore = Math.round(72 + (offersCount * 8) + (activeInterviews * 2.5) + ((avgSelfRating - 8) * 4));
  const finalScore = Math.min(Math.max(rawScore, 65), 98); // calibrated limits for professional senior developers

  // Dynamic dimension calibration based on loaded applications
  const getDimensionScores = () => {
    const hasNvidia = applications.some(a => a.companyName.toLowerCase().includes('nvidia'));
    const hasStripe = applications.some(a => a.companyName.toLowerCase().includes('stripe'));
    const hasAirbnb = applications.some(a => a.companyName.toLowerCase().includes('airbnb'));

    return {
      coding: hasNvidia ? 9.0 : 8.2,
      systemDesign: hasStripe ? 8.8 : 7.6,
      leadership: hasAirbnb ? 8.5 : 8.0,
      communication: avgSelfRating > 8.5 ? 9.0 : 8.4,
    };
  };

  const scores = getDimensionScores();

  // Generate dynamic engineering telemetry commentary
  const getObservabilityVerdict = () => {
    if (totalApps === 0) {
      return "Telemetry offline. Start your first job pipeline to boot up performance indicators.";
    }
    if (offersCount > 0) {
      return `Telemetry stable. Score is highly calibrated at ${finalScore}. System design and product leadership have high offer conversion. Domain calibration is complete.`;
    }
    if (activeInterviews > 2) {
      return "High concurrency detected in technical channels. High-divergence performance recorded in system designs. Focus on deep memory layouts and consistent state management.";
    }
    return "Initial calibration cycle completed. Core engineering scores indicate strong mid-market competitiveness. Review preparation resources to trigger target score gains.";
  };

  const verdict = getObservabilityVerdict();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" id="performance-telemetry-panel">
      {/* 1. Concentric Score Card */}
      <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex flex-col justify-between hover:border-indigo-500/20 transition-all duration-300 shadow-xl lg:col-span-1">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Performance Index</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/40 px-2 py-0.5 rounded-full">
              <Activity className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Live Telemetry
            </span>
          </div>

          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Concentric Progress Ring */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-slate-800"
                  strokeWidth="6"
                  fill="transparent"
                />
                {/* Colored foreground circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-indigo-500"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * finalScore) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
              </svg>
              {/* Centered Score */}
              <div className="text-center z-10">
                <span className="text-4xl font-black font-display text-slate-100 tracking-tight leading-none block">{finalScore}</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono mt-1 block">Readiness</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">calibration state</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-black mt-1 font-mono uppercase">
            {finalScore >= 90 ? '⭐⭐⭐⭐⭐ High Conversion' : finalScore >= 80 ? '⭐⭐⭐⭐ Competitive Standard' : '⭐⭐⭐ Base Calibration'}
          </p>
        </div>
      </div>

      {/* 2. Dimensions Progress Bars */}
      <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 hover:border-indigo-500/20 transition-all duration-300 shadow-xl lg:col-span-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-4">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Core Calibration Profiles</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="space-y-4">
            {/* Dimension 1: Coding */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Coding & Algorithms
                </span>
                <span className="text-slate-100 font-black font-mono">{(scores.coding).toFixed(1)}/10</span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${scores.coding * 10}%` }} />
              </div>
            </div>

            {/* Dimension 2: System Design */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  System Architecture
                </span>
                <span className="text-slate-100 font-black font-mono">{(scores.systemDesign).toFixed(1)}/10</span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${scores.systemDesign * 10}%` }} />
              </div>
            </div>

            {/* Dimension 3: Technical Comm */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Technical Communication
                </span>
                <span className="text-slate-100 font-black font-mono">{(scores.communication).toFixed(1)}/10</span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${scores.communication * 10}%` }} />
              </div>
            </div>

            {/* Dimension 4: Leadership */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Product Leadership
                </span>
                <span className="text-slate-100 font-black font-mono">{(scores.leadership).toFixed(1)}/10</span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${scores.leadership * 10}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Observer Verdict / Diagnostics */}
      <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 hover:border-indigo-500/20 transition-all duration-300 shadow-xl lg:col-span-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-4">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Observer diagnostics</span>
            <span className="text-[9px] bg-indigo-100/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-900/40 font-bold font-mono">SYS_OK</span>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold font-mono uppercase tracking-wide">Analysis Engine</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic font-medium">
              "{verdict}"
            </p>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-4 border-t border-slate-900">
          <span>COCKPIT_FEED_CHANNEL: ACTIVE</span>
          <span>STABLE</span>
        </div>
      </div>
    </div>
  );
}
