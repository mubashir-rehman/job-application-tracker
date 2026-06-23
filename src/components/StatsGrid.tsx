import { JobApplication } from '../types';
import { Briefcase, Calendar, Award, Banknote } from 'lucide-react';

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

  const stats = [
    {
      label: 'Total Applications',
      value: total,
      icon: Briefcase,
      colorClass: 'text-slate-800 bg-slate-50 border-slate-200',
      glowClass: 'shadow-slate-100',
    },
    {
      label: 'Interviews Scheduled',
      value: interviewsCount,
      icon: Calendar,
      colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      glowClass: 'shadow-indigo-100',
    },
    {
      label: 'Offers Secured',
      value: offersCount,
      icon: Award,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      glowClass: 'shadow-emerald-100',
    },
    {
      label: 'Avg Target Salary',
      value: avgSalary,
      icon: Banknote,
      colorClass: 'text-blue-600 bg-blue-50 border-blue-100',
      glowClass: 'shadow-blue-100',
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="stats-grid">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={i}
            id={`stat-card-${i}`}
            className={`glass-panel p-6 rounded-2xl shadow-sm border border-white/40 flex items-center justify-between transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] ${stat.glowClass}`}
          >
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider font-bold">{stat.label}</p>
              <h3 className="text-3xl font-extrabold font-display text-slate-800 mt-2">{stat.value}</h3>
            </div>
            <div className={`p-3.5 rounded-xl border ${stat.colorClass} flex items-center justify-center`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
