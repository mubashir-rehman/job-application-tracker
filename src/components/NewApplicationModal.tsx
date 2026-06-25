import React, { useState } from 'react';
import { JobApplication, WorkModelType, AppliedViaType } from '../types';
import { createDefaultPhases } from '../data';
import { deriveCurrentStatus } from '../lib/appUtils';
import { X, Layers, Briefcase, FileText, Check } from 'lucide-react';
import GDriveResumeUploader from './GDriveResumeUploader';

interface NewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddApplication: (app: JobApplication) => void;
}

export function NewApplicationModal({ isOpen, onClose, onAddApplication }: NewApplicationModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [workModel, setWorkModel] = useState<WorkModelType>('Remote');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [otherBenefits, setOtherBenefits] = useState('');
  const [hrContact, setHrContact] = useState('');
  const [appliedVia, setAppliedVia] = useState<AppliedViaType>('LinkedIn');
  const [resumeLink, setResumeLink] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [keyJdRequirements, setKeyJdRequirements] = useState('');

  const [errors, setErrors] = useState<{ companyName?: string; targetRole?: string }>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Reset validation errors
    const newErrors: { companyName?: string; targetRole?: string } = {};
    if (!companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!targetRole.trim()) newErrors.targetRole = 'Target role is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build the new job application object
    const newApp: JobApplication = {
      id: `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyName: companyName.trim(),
      targetRole: targetRole.trim(),
      workModel,
      location: location.trim() || 'Remote',
      salaryRange: salaryRange.trim() || 'Salary Negotiable',
      otherBenefits: otherBenefits.trim(),
      hrContact: hrContact.trim(),
      appliedVia,
      resumeLink: resumeLink.trim(),
      portfolioLink: portfolioLink.trim(),
      keyJdRequirements: keyJdRequirements.trim(),
      phases: createDefaultPhases(),
      currentStatus: deriveCurrentStatus(createDefaultPhases()),
      postMortem: {
        skillsImprovements: '',
        preparationNotes: '',
        selfRating: 5
      },
      createdAt: new Date().toISOString()
    };

    onAddApplication(newApp);

    // Reset local inputs
    setCompanyName('');
    setTargetRole('');
    setWorkModel('Remote');
    setLocation('');
    setSalaryRange('');
    setOtherBenefits('');
    setHrContact('');
    setAppliedVia('LinkedIn');
    setResumeLink('');
    setPortfolioLink('');
    setKeyJdRequirements('');
    setErrors({});
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      id="new-app-modal"
    >
      <div 
        className="bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal sticky top header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
          <div>
            <h2 className="text-2xl font-black font-display text-white">Add New Opportunity</h2>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">Log key requirements and establish tracking metrics</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-full transition text-2xl font-bold leading-none"
          >
            &times;
          </button>
        </div>

        {/* Modal form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Section 1: Core Details */}
            <div className="space-y-4" id="form-core-details">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
                <Briefcase className="w-4.5 h-4.5 text-indigo-400" />
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                  1. Core Employment Details
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="new-company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp, CloudNova Inc"
                    className={`text-xs bg-slate-950 border p-2.5 rounded-xl w-full outline-none focus:bg-slate-950 text-white focus:ring-2 transition ${
                      errors.companyName ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-800 focus:ring-indigo-500/15 focus:border-indigo-500'
                    }`}
                  />
                  {errors.companyName && (
                    <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.companyName}</span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Target Role *
                  </label>
                  <input
                    type="text"
                    id="new-target-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Senior CUDA Dev"
                    className={`text-xs bg-slate-950 border p-2.5 rounded-xl w-full outline-none focus:bg-slate-950 text-white focus:ring-2 transition ${
                      errors.targetRole ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-800 focus:ring-indigo-500/15 focus:border-indigo-500'
                    }`}
                  />
                  {errors.targetRole && (
                    <span className="text-[10px] text-rose-500 font-bold mt-1 block">{errors.targetRole}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Work Model
                  </label>
                  <select
                    id="new-work-model"
                    value={workModel}
                    onChange={(e) => setWorkModel(e.target.value as WorkModelType)}
                    className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full outline-none focus:bg-slate-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-semibold text-slate-300 cursor-pointer"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Onsite">Onsite</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    id="new-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Dublin, IE or Hybrid"
                    className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full outline-none focus:bg-slate-950 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Salary Range
                  </label>
                  <input
                    type="text"
                    id="new-salary-range"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="e.g. $190k - $240k"
                    className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full outline-none focus:bg-slate-950 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Other Benefits
                  </label>
                  <input
                    type="text"
                    id="new-benefits"
                    value={otherBenefits}
                    onChange={(e) => setOtherBenefits(e.target.value)}
                    placeholder="e.g. 15% Bonus, ESPP, Dental"
                    className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full outline-none focus:bg-slate-950 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Logistics & Links */}
            <div className="space-y-4" id="form-logistics">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
                <FileText className="w-4.5 h-4.5 text-indigo-400" />
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                  2. Tracking & Logistics
                </h3>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  HR / Recruiter Contact Name & Info
                </label>
                <input
                  type="text"
                  id="new-hr-contact"
                  value={hrContact}
                  onChange={(e) => setHrContact(e.target.value)}
                  placeholder="e.g. Sarah Jenkins (Recruiter)"
                  className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full outline-none focus:bg-slate-950 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  Applied Via
                </label>
                <select
                  id="new-applied-via"
                  value={appliedVia}
                  onChange={(e) => setAppliedVia(e.target.value as AppliedViaType)}
                  className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full outline-none focus:bg-slate-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-semibold text-slate-300 cursor-pointer"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Email">Email</option>
                  <option value="Company Form">Company Form</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Resume Sent Link
                  </label>
                  <input
                    type="url"
                    id="new-resume-link"
                    value={resumeLink}
                    onChange={(e) => setResumeLink(e.target.value)}
                    placeholder="e.g. GDrive URL"
                    className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full outline-none focus:bg-slate-950 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-mono mb-2"
                  />
                  <GDriveResumeUploader 
                    onUploadSuccess={(url) => setResumeLink(url)}
                    currentLink={resumeLink}
                    id="new-modal"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                    Portfolio / Website Link
                  </label>
                  <input
                    type="url"
                    id="new-portfolio-link"
                    value={portfolioLink}
                    onChange={(e) => setPortfolioLink(e.target.value)}
                    placeholder="e.g. Portfolio/GitHub URL"
                    className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full outline-none focus:bg-slate-950 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Full Width Job Spec Details */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                Key JD Requirements (Tech Stack, Framework requirements, Core metrics)
              </label>
              <textarea
                id="new-jd-spec"
                rows={4}
                value={keyJdRequirements}
                onChange={(e) => setKeyJdRequirements(e.target.value)}
                placeholder="Paste key spec constraints here... (e.g. 5+ years C++, GPU programming, warp optimization, Docker execution loops)"
                className="text-xs bg-slate-950 border border-slate-800 p-3.5 rounded-2xl w-full outline-none focus:bg-slate-950 text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 leading-relaxed font-medium"
              />
            </div>
          </div>

          {/* Buttons footer */}
          <div className="pt-6 border-t border-slate-800/80 flex justify-end gap-3.5">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-new-app-btn"
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-lg hover:shadow hover:shadow-indigo-500/15 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save Opportunity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
