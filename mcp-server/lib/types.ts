/**
 * Minimal mirror of the HireTrack data contract that this server touches.
 * Kept in sync with ../../src/types.ts — only the fields the MCP tools read
 * or write are represented here.
 */
export type WorkModelType = 'Remote' | 'Hybrid' | 'Onsite';
export type AppliedViaType =
  | 'LinkedIn'
  | 'Email'
  | 'Company Form'
  | 'Referral'
  | 'Other';

export interface InterviewPhase {
  name: string;
  date: string;
  pros: string;
  cons: string;
  remarks: string;
  feedback: string;
  status: 'upcoming' | 'active' | 'completed' | 'skipped';
}

export interface JobApplication {
  id: string;
  companyName: string;
  targetRole: string;
  workModel: WorkModelType;
  location: string;
  salaryRange: string;
  otherBenefits: string;
  hrContact: string;
  appliedVia: AppliedViaType;
  resumeLink: string;
  portfolioLink: string;
  keyJdRequirements: string;
  jdUrl?: string;
  jdText?: string;
  priority?: 'stretch' | 'strong' | 'backup';
  currentStatus: string;
  phases: InterviewPhase[];
  postMortem: { skillsImprovements: string; preparationNotes: string; selfRating: number };
  createdAt: string;
  userId?: string | null;
}

/** Compact projection returned to the model for list/dup results. */
export interface ApplicationSummary {
  id: string;
  company: string;
  role: string;
  status: string;
  job_url: string | null;
  work_model: string;
  applied_via: string;
  created_at: string;
}
