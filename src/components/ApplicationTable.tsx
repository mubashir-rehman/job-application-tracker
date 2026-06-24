import React, { useState, useMemo } from 'react';
import { JobApplication, WorkModelType } from '../types';
import { Search, MapPin, DollarSign, Filter, Trash2, ArrowRight, Layers } from 'lucide-react';
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
      result.sort((a, b) => b.salaryRange.localeCompare(a.salaryRange)); // simplified alphabetical salary sort
    } else if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [applications, searchTerm, workModelFilter, statusFilter, sortBy]);

  // Helper to color statuses - Elegant Dark
  const getStatusChipStyles = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('offer')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
    if (s.includes('tech') || s.includes('final')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25';
    if (s.includes('negotiation') || s.includes('hr')) return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
    if (s.includes('screening') || s.includes('prescreen')) return 'bg-sky-500/10 text-sky-400 border-sky-500/25';
    if (s.includes('submitted')) return 'bg-slate-500/10 text-slate-400 border-slate-500/25';
    return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
  };

  return (
    <div className="space-y-6" id="applications-table-section">
      {/* Search and Filters panel */}
      <Card className="glass-panel border border-slate-800 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            
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
            <div className="py-16 text-center" id="empty-state">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-300">No applications matched your search</h3>
              <p className="text-slate-500 text-sm mt-1">Try resetting filters or adding a new application to track!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table view */}
              <table className="w-full text-left border-collapse hidden md:table" id="apps-table">
                <thead>
                  <tr className="bg-slate-850/50 border-b border-slate-800">
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Company & Role</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Work Model</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Compensation</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">HR Recruiter</th>
                    <th className="px-6 py-4.5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredAndSortedApplications.map((app) => (
                    <tr
                      key={app.id}
                      id={`row-${app.id}`}
                      onClick={() => onSelectApplication(app)}
                      className="group hover:bg-slate-800/40 transition-all duration-150 cursor-pointer"
                    >
                      <td className="px-6 py-5.5">
                        <div className="font-extrabold text-slate-100 group-hover:text-indigo-400 transition-colors">
                          {app.companyName}
                        </div>
                        <div className="text-xs font-medium text-indigo-400 italic mt-0.5">{app.targetRole}</div>
                      </td>
                      <td className="px-6 py-5.5">
                        <div className="flex items-center gap-1.5 text-slate-300 text-sm font-semibold">
                          <span className={`w-2 h-2 rounded-full ${
                            app.workModel === 'Remote' ? 'bg-emerald-400' : app.workModel === 'Hybrid' ? 'bg-indigo-400' : 'bg-slate-400'
                          }`} />
                          {app.workModel}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                          <MapPin className="w-3 h-3" />
                          {app.location}
                        </div>
                      </td>
                      <td className="px-6 py-5.5">
                        <Badge variant="outline" className={`border text-[10px] tracking-wide py-1 px-3 rounded-full font-bold h-auto ${getStatusChipStyles(app.currentStatus)}`}>
                          {app.currentStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-5.5">
                        <div className="flex items-center gap-0.5 text-slate-300 text-sm font-bold">
                          <DollarSign className="w-4.5 h-4.5 text-slate-500" />
                          {app.salaryRange}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 truncate max-w-[150px]" title={app.otherBenefits}>
                          {app.otherBenefits || 'No additional benefits'}
                        </div>
                      </td>
                      <td className="px-6 py-5.5 text-sm text-slate-400 font-medium">
                        {app.hrContact || <span className="text-slate-600 italic">None logged</span>}
                      </td>
                      <td className="px-6 py-5.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onSelectApplication(app)}
                            className="p-1.5 hover:bg-indigo-950/60 text-indigo-400 rounded-lg transition-all"
                            title="View details & pipeline timeline"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => onDeleteApplication(app.id, e)}
                            className="p-1.5 hover:bg-rose-950/60 text-rose-400 rounded-lg transition-all"
                            title="Delete application"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card view (Visible on screens < 768px) */}
              <div className="grid grid-cols-1 gap-4 p-4 md:hidden" id="apps-mobile-grid">
                {filteredAndSortedApplications.map((app) => (
                  <div
                    key={app.id}
                    id={`card-${app.id}`}
                    onClick={() => onSelectApplication(app)}
                    className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 hover:border-indigo-900/50 hover:bg-slate-900 active:bg-slate-950 transition cursor-pointer space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-100 text-base">{app.companyName}</h4>
                        <p className="text-sm text-indigo-400 font-medium">{app.targetRole}</p>
                      </div>
                      <Badge variant="outline" className={`border text-[10px] py-0.5 px-2 rounded-full font-bold h-auto ${getStatusChipStyles(app.currentStatus)}`}>
                        {app.currentStatus}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-y border-slate-800/60 py-3">
                      <div>
                        <span className="text-slate-500 font-bold block mb-0.5">LOCATION</span>
                        <div className="flex items-center gap-1 font-semibold text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {app.location} ({app.workModel})
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block mb-0.5">COMPENSATION</span>
                        <div className="font-semibold text-slate-300 truncate">{app.salaryRange}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs text-slate-500 font-medium">
                        Applied via {app.appliedVia}
                      </span>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectApplication(app)}
                          className="px-3 py-1.5 bg-indigo-950/40 hover:bg-indigo-950 text-indigo-400 rounded-lg text-xs font-bold transition"
                        >
                          Timeline
                        </button>
                        <button
                          onClick={(e) => onDeleteApplication(app.id, e)}
                          className="p-1.5 bg-rose-950/40 hover:bg-rose-950/70 text-rose-400 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
