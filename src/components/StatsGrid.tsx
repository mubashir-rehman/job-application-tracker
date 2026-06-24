import { JobApplication } from '../types';
import { Briefcase, Calendar, Award, Banknote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsGridProps {
  applications: JobApplication[];
}

export function StatsGrid({ applications }: StatsGridProps) {
  const total = applications.length;
  
  // Calculate active interviews
  const interviewsCount = applications.filter(app => {
    const status = app.currentStatus.toLowerCase();
    return status.includes('interview') || status.includes('screening') || status.includes('technical');
  }).length;

  // Calculate offers
  const offersCount = applications.filter(app => {
    const status = app.currentStatus.toLowerCase();
    return status.includes('offer') || app.phases[6].status === 'completed';
  }).length;

  // Calculate average mid-point salary
  const calculateAverageSalary = () => {
    if (total === 0) return '$0k';
    let sum = 0;
    let validCount = 0;
    
    applications.forEach(app => {
      // Parse salary range like "$190k - $240k"
      const matches = app.salaryRange.match(/\d+/g);
      if (matches && matches.length > 0) {
        const numbers = matches.map(Number);
        const mid = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        sum += mid;
        validCount++;
      }
    });

    if (validCount === 0) return 'N/A';
    return `$${Math.round(sum / validCount)}k`;
  };

  const avgSalary = calculateAverageSalary();

  // Active pipelines (neither rejected nor successfully completed offer)
  const activeCount = applications.filter(app => {
    const s = app.currentStatus.toLowerCase();
    return !s.includes('reject') && !s.includes('fail') && !s.includes('archive');
  }).length;

  const conversionRate = total > 0 ? Math.round((offersCount / total) * 100) : 0;

  const stats = [
    {
      label: 'Total Applications',
      value: total,
      subtext: `↑ ${activeCount} active pipelines`,
      subtextColorClass: 'text-indigo-400',
      icon: Briefcase,
      colorClass: 'text-slate-300 bg-slate-800/80 border-slate-700',
      glowClass: 'hover:shadow-indigo-500/10 hover:border-indigo-500/20',
    },
    {
      label: 'Interviews Scheduled',
      value: interviewsCount,
      subtext: 'Pending technical checks',
      subtextColorClass: 'text-amber-400/80',
      icon: Calendar,
      colorClass: 'text-indigo-400 bg-indigo-950/40 border-indigo-900/40',
      glowClass: 'hover:shadow-amber-500/10 hover:border-amber-500/20',
    },
    {
      label: 'Offers Secured',
      value: offersCount,
      subtext: `Win rate: ${conversionRate}%`,
      subtextColorClass: 'text-emerald-400',
      icon: Award,
      colorClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40',
      glowClass: 'hover:shadow-emerald-500/10 hover:border-emerald-500/20',
    },
    {
      label: 'Avg Target Salary',
      value: avgSalary,
      subtext: 'Market index value',
      subtextColorClass: 'text-slate-400',
      icon: Banknote,
      colorClass: 'text-blue-400 bg-blue-950/40 border-blue-900/40',
      glowClass: 'hover:shadow-blue-500/10 hover:border-blue-500/20',
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="stats-grid">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card
            key={i}
            id={`stat-card-${i}`}
            className={`glass-panel rounded-2xl border border-slate-800/60 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 ${stat.glowClass}`}
          >
            <CardContent className="flex items-center justify-between w-full p-6">
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider font-extrabold">{stat.label}</p>
                <h3 className="text-3xl font-black font-display text-white mt-1.5">{stat.value}</h3>
                <p className={`text-[11px] font-bold font-mono mt-2 flex items-center gap-1 ${stat.subtextColorClass}`}>
                  {stat.subtext}
                </p>
              </div>
              <div className={`p-3 rounded-xl border ${stat.colorClass} flex items-center justify-center shrink-0 shadow-sm`}>
                <Icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
