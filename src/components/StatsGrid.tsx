import { JobApplication } from '../types';
import { Briefcase, Calendar, Award, Banknote } from 'lucide-react';
import { isOfferReceived, parseSalaryMidpoint } from '../lib/appUtils';

interface StatsGridProps {
  applications: JobApplication[];
}

export function StatsGrid({ applications }: StatsGridProps) {
  const total = applications.length;

  const interviewsCount = applications.filter(app => {
    const status = app.currentStatus.toLowerCase();
    return status.includes('interview') || status.includes('screening') || status.includes('technical');
  }).length;

  const offersCount = applications.filter(app => isOfferReceived(app)).length;

  const calculateAverageSalary = () => {
    if (total === 0) return '$0k';
    const midpoints = applications
      .map(app => parseSalaryMidpoint(app.salaryRange))
      .filter((v): v is number => v !== null);
    if (midpoints.length === 0) return 'N/A';
    const avg = midpoints.reduce((a, b) => a + b, 0) / midpoints.length;
    const avgK = avg >= 1000 ? Math.round(avg / 1000) : Math.round(avg);
    return avg >= 1000 ? `$${avgK}k` : `$${avgK}`;
  };

  const activeCount = applications.filter(app => {
    const s = app.currentStatus.toLowerCase();
    return !s.includes('reject') && !s.includes('fail') && !s.includes('archive');
  }).length;

  const conversionRate = total > 0 ? Math.round((offersCount / total) * 100) : 0;

  const stats = [
    {
      label: 'Applications',
      value: total,
      sub: `${activeCount} active`,
      icon: Briefcase,
      valueColor: 'text-slate-100',
      subColor: 'text-indigo-400',
    },
    {
      label: 'Interviews',
      value: interviewsCount,
      sub: 'in progress',
      icon: Calendar,
      valueColor: 'text-amber-300',
      subColor: 'text-amber-500',
    },
    {
      label: 'Offers',
      value: offersCount,
      sub: `${conversionRate}% win rate`,
      icon: Award,
      valueColor: 'text-emerald-400',
      subColor: 'text-emerald-600',
    },
    {
      label: 'Avg Salary',
      value: calculateAverageSalary(),
      sub: 'target range',
      icon: Banknote,
      valueColor: 'text-blue-300',
      subColor: 'text-blue-500',
    },
  ];

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/60 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-800/60" id="stats-grid">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            <Icon className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-black font-display leading-none ${stat.valueColor}`}>{stat.value}</span>
                <span className={`text-[10px] font-bold font-mono ${stat.subColor}`}>{stat.sub}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
