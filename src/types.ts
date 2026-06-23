export type WorkModelType = 'Remote' | 'Hybrid' | 'Onsite';
export type AppliedViaType = 'LinkedIn' | 'Email' | 'Company Form' | 'Referral' | 'Other';

export interface InterviewPhase {
  name: string;
  date: string;
  pros: string;
  cons: string;
  remarks: string;
  feedback: string;
  status: 'upcoming' | 'active' | 'completed' | 'skipped';
}

export interface PostMortem {
  skillsImprovements: string;
  preparationNotes: string;
  selfRating: number; // 0 to 10
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
  currentStatus: string; // E.g., 'Application Submitted', 'Technical Interview', 'Offer', etc.
  phases: InterviewPhase[]; // Exactly 7 items corresponding to the 7 phases
  postMortem: PostMortem;
  createdAt: string;
}
