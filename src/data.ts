import { InterviewPhase } from './types';

export const DEFAULT_PHASES = [
  "Phase 1: Application Submitted",
  "Phase 2: Initial HR Pre-screening",
  "Phase 3: Technical Interview",
  "Phase 4: Personality Interview",
  "Phase 5: Final Technical Interview",
  "Phase 6: HR Negotiation",
  "Phase 7: Offer Letter"
];

export function createDefaultPhases(): InterviewPhase[] {
  return DEFAULT_PHASES.map((name, i) => ({
    name,
    date: '',
    pros: '',
    cons: '',
    remarks: '',
    feedback: '',
    status: i === 0 ? 'active' : 'upcoming'
  }));
}
