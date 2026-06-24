import React, { useState, useMemo } from 'react';
import { JobApplication, WorkModelType } from '../types';
import { Search, MapPin, DollarSign, Filter, Trash2, ArrowRight, Layers, Briefcase, CalendarCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ApplicationTableProps {
  applications: JobApplication[];
  onSelectApplication: (app: JobApplication) => void;
  onDeleteApplication: (id: string, e: React.MouseEvent) => void;
}

export function ApplicationTable({ applications, onSelectApplication, onDeleteApplication }: ApplicationTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [workModelFilter, setWorkModelFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'company' | 'role' | 'salary' | 'recent'>('recent');

  // Collect all unique statuses for filtering
  const statuses = useMemo(() => {
    const list = new Set(applications.map(app => app.currentStatus));
    return ['All', ...Array.from(list)];
  }, [applications]);

  // Filter and sort applications
  const filteredAndSortedApplications = useMemo(() => {
    let result = [...applications];

    // Filter by Search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(app => 
        app.companyName.toLowerCase().includes(term) ||
        app.targetRole.toLowerCase().includes(term) ||
        app.location.toLowerCase().includes(term) ||
        app.keyJdRequirements.toLowerCase().includes(term)
      );
    }

    // Filter by Work Model
    if (workModelFilter !== 'All') {
      result = result.filter(app => app.workModel === workModelFilter);
    }

    // Filter by Pipeline Status
    if (statusFilter !== 'All') {
      result = result.filter(app => app.currentStatus === statusFilter);
    }

    // Sort
    if (sortBy === 'company') {
      result.sort((a, b) => a.companyName.localeCompare(b.companyName));
    } else if (sortBy === 'role') {
      result.sort((a, b) => a.targetRole.localeCompare(b.targetRole));
    } else if (sortBy === 'salary') {
      result.sort((a, b) => b.salaryRange.localeCompare(a.salaryRange));
    } else if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [applications, searchTerm, workModelFilter, statusFilter, sortBy]);

  // Generate color styles for company placeholder initials
  const getCompanyLogoStyles = (name: string) => {
    const clean = name.trim().toUpperCase();
    const hash = clean.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
      { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
      { bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
      { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
      { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
      { bg: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20' },
      { bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
    ];
    return colors[hash % colors.length];
  };

  // Get tech tags from applications
  const getTechTags = (app: JobApplication) => {
    if (app.companyName.toLowerCase().includes('nvidia')) {
      return ['CUDA', 'HPC', 'C++20'];
    }
    if (app.companyName.toLowerCase().includes('stripe')) {
      return ['Distributed Systems', 'APIs', 'Go'];
    }
    if (app.companyName.toLowerCase().includes('airbnb')) {
      return ['React', 'Vite', 'Core Web Vitals'];
    }
    
    // Dynamic fallback
    const words = ['python', 'rust', 'go', 'typescript', 'react', 'node', 'aws', 'docker', 'kubernetes', 'c++', 'java', 'sql', 'system design'];
    const jdLower = app.keyJdRequirements.toLowerCase();
    const matched = words.filter(word => jdLower.includes(word)).slice(0, 3);
    if (matched.length > 0) {
      return matched.map(w => w.toUpperCase());
    }
    return ['SOFTWARE', 'SYSTEMS'];
  };

  // Helper to color statuses - Observer UI Colors
  const getStatusStyles = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('offer')) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (s.includes('reject') || s.includes('fail') || s.includes('archive')) return { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    if (s.includes('tech') || s.includes('final')) return { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
    if (s.includes('negotiation') || s.includes('hr')) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    if (s.includes('screening') || s.includes('prescreen')) return { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' };
    if (s.includes('submitted')) return { text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
    return { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
  };

  return (
    <div className="space-y-6" id="applications-table-section">
      {/* Search and Filters panel */}
      <Card className="glass-panel border border-slate-800 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                id="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by company, role, stack requirements or location..."
                className="pl-10 pr-4 py-2.5 w-full text-sm bg-slate-950/60 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 focus:bg-slate-950 text-slate-100 placeholder-slate-500 transition"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Work Model Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800/80">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="workmodel-filter"
                  value={workModelFilter}
                  onChange={(e) => setWorkModelFilter(e.target.value)}
                  className="text-xs font-semibold bg-transparent border-none py-0 pl-1 pr-6 outline-none text-slate-300 focus:ring-0 cursor-pointer"
                >
                  <option value="All">All Models</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                </select>
              </div>

              {/* Pipeline Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800/80">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-semibold bg-transparent border-none py-0 pl-1 pr-6 outline-none text-slate-300 focus:ring-0 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  {statuses.filter(s => s !== 'All').map((stat) => (
                    <option key={stat} value={stat}>{stat}</option>
                  ))}
                </select>
              </div>

              {/* Sort Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800/80">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort:</span>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs font-semibold bg-transparent border-none py-0 pl-1 pr-6 outline-none text-slate-300 focus:ring-0 cursor-pointer"
                >
                  <option value="recent">Most Recent</option>
                  <option value="company">Company Name</option>
                  <option value="role">Target Role</option>
                  <option value="salary">Salary Range</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table grid wrapper */}
      <Card className="glass-panel rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          {filteredAndSortedApplications.length === 0 ? (
            <div className="py-20 text-center" id="empty-state">
              <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-slate-300">Start your first interview pipeline</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                Every dream offer begins with a single application. Click the <strong className="text-indigo-600 dark:text-indigo-400">"New Application"</strong> button to start tracking your performance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table view */}
              <table className="w-full text-left border-collapse hidden md:table" id="apps-table">
                <thead>
                  <tr className="bg-slate-900/30 border-b border-slate-800">
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[25%]">Company & Role</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[25%]">Pipeline Progress</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[16%]">Workflow Status</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[14%]">Logistics</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[12%]">Compensation</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right w-[8%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredAndSortedApplications.map((app) => {
                    const completedPhases = app.phases.filter(p => p.status === 'completed').length;
                    const totalPhases = app.phases.length;
                    const progressPercent = Math.round((completedPhases / totalPhases) * 100);
                    
                    const logoStyles = getCompanyLogoStyles(app.companyName);
                    const techTags = getTechTags(app);
                    const statusInfo = getStatusStyles(app.currentStatus);

                    return (
                      <tr
                        key={app.id}
                        id={`row-${app.id}`}
                        onClick={() => onSelectApplication(app)}
                        className="group hover:bg-slate-900/40 hover:translate-y-[-1px] border-l-2 border-transparent hover:border-indigo-500/60 hover:shadow-[0_0_30px_rgba(99,102,241,0.04)] transition-all duration-200 cursor-pointer"
                      >
                        {/* Company & Role with Logo Column */}
                        <td className="px-6 py-5.5">
                          <div className="flex items-center gap-3.5">
                            {/* Company Logo circle placeholder */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black font-display text-sm border shrink-0 ${logoStyles.bg}`}>
                              {app.companyName.trim().charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                {app.companyName}
                              </div>
                              <div className="text-xs font-bold text-slate-300 mt-0.5 truncate">{app.targetRole}</div>
                              {/* Stack tag list */}
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {techTags.map((tech) => (
                                  <span key={tech} className="text-[9px] font-mono font-bold bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800/80 uppercase">
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Pipeline Progress Indicator */}
                        <td className="px-6 py-5.5">
                          <div className="space-y-2 max-w-[200px]">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-bold uppercase tracking-wider font-mono">Stage {completedPhases} / {totalPhases}</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-black font-mono">{progressPercent}%</span>
                            </div>
                            
                            {/* Micro progress bar */}
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
                              <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>

                            {/* Tiny dot progression preview */}
                            <div className="flex gap-1">
                              {app.phases.map((p, idx) => (
                                <div 
                                  key={idx}
                                  className={`h-1 flex-1 rounded-full ${
                                    p.status === 'completed' 
                                      ? 'bg-emerald-500/80' 
                                      : p.status === 'active' 
                                        ? 'bg-indigo-500 animate-pulse' 
                                        : 'bg-slate-800'
                                  }`} 
                                  title={p.name}
                                />
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Workflow Status */}
                        <td className="px-6 py-5.5">
                          <div className="inline-flex flex-col gap-1.5">
                            <Badge variant="outline" className={`border text-[10px] tracking-wide py-1 px-3.5 rounded-full font-black h-auto ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                              ● {app.currentStatus}
                            </Badge>
                            <span className="text-[10px] text-slate-500 font-bold font-mono pl-1 uppercase">
                              Applied via {app.appliedVia}
                            </span>
                          </div>
                        </td>

                        {/* Logistics (Location + Work Model) */}
                        <td className="px-6 py-5.5 text-sm">
                          <div className="flex items-center gap-1 text-slate-200 font-bold">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[130px]" title={app.location}>{app.location.split(',')[0]}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              app.workModel === 'Remote' ? 'bg-emerald-400' : app.workModel === 'Hybrid' ? 'bg-indigo-400' : 'bg-slate-400'
                            }`} />
                            {app.workModel} model
                          </div>
                        </td>

                        {/* Compensation Column */}
                        <td className="px-6 py-5.5">
                          <div className="flex items-center gap-0.5 text-slate-200 font-black font-mono">
                            <DollarSign className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {app.salaryRange.replace('$', '').split('-')[0].trim()}
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[100px] block mt-0.5" title={app.otherBenefits || 'Base range'}>
                            {app.otherBenefits ? app.otherBenefits.split(',')[0] : 'Base band'}
                          </span>
                        </td>

                        {/* Actions buttons */}
                        <td className="px-6 py-5.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onSelectApplication(app)}
                              className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg transition-all"
                              title="Mission Control Room"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => onDeleteApplication(app.id, e)}
                              className="p-2 hover:bg-rose-55 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg transition-all"
                              title="Delete pipeline logs"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Card view */}
              <div className="grid grid-cols-1 gap-4 p-4 md:hidden" id="apps-mobile-grid">
                {filteredAndSortedApplications.map((app) => {
                  const completedPhases = app.phases.filter(p => p.status === 'completed').length;
                  const totalPhases = app.phases.length;
                  const progressPercent = Math.round((completedPhases / totalPhases) * 100);
                  const logoStyles = getCompanyLogoStyles(app.companyName);
                  const statusInfo = getStatusStyles(app.currentStatus);

                  return (
                    <div
                      key={app.id}
                      id={`card-${app.id}`}
                      onClick={() => onSelectApplication(app)}
                      className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 hover:border-indigo-900/50 hover:bg-slate-900 active:bg-slate-950 transition-all cursor-pointer space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-display text-xs border ${logoStyles.bg}`}>
                            {app.companyName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-100 text-sm leading-tight">{app.companyName}</h4>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">{app.targetRole}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`border text-[9px] py-0.5 px-2 rounded-full font-bold h-auto ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                          {app.currentStatus}
                        </Badge>
                      </div>

                      {/* Mini progress line */}
                      <div className="space-y-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                        <div className="flex justify-between text-[9px] font-mono text-slate-400 font-bold uppercase">
                          <span>Stage {completedPhases} / {totalPhases}</span>
                          <span>{progressPercent}% Complete</span>
                        </div>
                        <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPercent}%` }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px] border-t border-slate-800/40 pt-3">
                        <div>
                          <span className="text-slate-500 font-bold block mb-0.5 uppercase tracking-wider font-mono">Location</span>
                          <div className="flex items-center gap-1 font-semibold text-slate-300">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {app.location.split(',')[0]} ({app.workModel})
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block mb-0.5 uppercase tracking-wider font-mono">Salary Band</span>
                          <div className="font-semibold text-slate-300">{app.salaryRange}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-800/40">
                        <span className="text-[10px] text-slate-500 font-bold font-mono uppercase">
                          Applied via {app.appliedVia}
                        </span>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectApplication(app)}
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition"
                          >
                            Details
                          </button>
                          <button
                            onClick={(e) => onDeleteApplication(app.id, e)}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
