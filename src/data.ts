import { JobApplication, InterviewPhase } from './types';

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

export const INITIAL_APPLICATIONS: JobApplication[] = [
  {
    id: 'apex-001',
    companyName: 'Apex Systems',
    targetRole: 'Senior Software Engineer',
    workModel: 'Hybrid',
    location: 'Austin, TX',
    salaryRange: '$140k - $180k',
    otherBenefits: '10% Bonus, Health Insurance, 401k Matching',
    hrContact: 'Jordan Blake (jblake@apexsystems.io)',
    appliedVia: 'LinkedIn',
    resumeLink: '',
    portfolioLink: '',
    keyJdRequirements: '4+ years experience with TypeScript and React. Familiarity with Node.js backends, REST APIs, and PostgreSQL. AWS or GCP deployment experience is a plus.',
    currentStatus: 'Technical Interview',
    createdAt: '2026-06-01T10:00:00Z',
    phases: [
      {
        name: 'Phase 1: Application Submitted',
        date: '2026-06-01',
        pros: 'Strong match for the role description. Resume highlighted relevant full-stack experience.',
        cons: 'Cold application without referral.',
        remarks: 'Applied with tailored resume emphasizing React and Node.js stack.',
        feedback: 'Recruiter responded within 48 hours.',
        status: 'completed'
      },
      {
        name: 'Phase 2: Initial HR Pre-screening',
        date: '2026-06-04',
        pros: 'Recruiter confirmed salary band aligns with expectations.',
        cons: 'Role requires some onsite days in Austin.',
        remarks: 'Discussed team structure and product roadmap.',
        feedback: 'Passed to technical loop.',
        status: 'completed'
      },
      {
        name: 'Phase 3: Technical Interview',
        date: '2026-06-18',
        pros: 'Well prepared on system design and TypeScript patterns.',
        cons: 'Need to review database indexing strategies in depth.',
        remarks: 'Scheduled with Senior Engineer from the platform team.',
        feedback: 'Pending interview completion.',
        status: 'active'
      },
      {
        name: 'Phase 4: Personality Interview',
        date: '',
        pros: '',
        cons: '',
        remarks: '',
        feedback: '',
        status: 'upcoming'
      },
      {
        name: 'Phase 5: Final Technical Interview',
        date: '',
        pros: '',
        cons: '',
        remarks: '',
        feedback: '',
        status: 'upcoming'
      },
      {
        name: 'Phase 6: HR Negotiation',
        date: '',
        pros: '',
        cons: '',
        remarks: '',
        feedback: '',
        status: 'upcoming'
      },
      {
        name: 'Phase 7: Offer Letter',
        date: '',
        pros: '',
        cons: '',
        remarks: '',
        feedback: '',
        status: 'upcoming'
      }
    ],
    postMortem: {
      skillsImprovements: 'Review advanced PostgreSQL query optimization and indexing patterns.',
      preparationNotes: 'Focus on clear communication of architectural decisions during system design rounds.',
      selfRating: 7
    }
  },
  {
    id: 'cloudnova-002',
    companyName: 'CloudNova Inc',
    targetRole: 'Staff Backend Engineer',
    workModel: 'Remote',
    location: 'New York, NY',
    salaryRange: '$160k - $200k',
    otherBenefits: 'RSU Equity, Home Office Stipend, Comprehensive Health Coverage',
    hrContact: 'Morgan Ellis (m.ellis@cloudnova.com)',
    appliedVia: 'Referral',
    resumeLink: '',
    portfolioLink: '',
    keyJdRequirements: 'Distributed systems background. Experience designing high-throughput microservices with Go or Python. Knowledge of Kafka, Redis, and Kubernetes is essential.',
    currentStatus: 'HR Negotiation',
    createdAt: '2026-06-10T09:30:00Z',
    phases: [
      {
        name: 'Phase 1: Application Submitted',
        date: '2026-06-10',
        pros: 'Referred by a current CloudNova engineer. Application flagged quickly.',
        cons: 'Role is highly competitive with many internal candidates.',
        remarks: 'Emphasized distributed systems experience in cover note.',
        feedback: 'Contacted within 24 hours via referral channel.',
        status: 'completed'
      },
      {
        name: 'Phase 2: Initial HR Pre-screening',
        date: '2026-06-13',
        pros: 'Recruiter confirmed fully remote policy and flexible hours.',
        cons: 'Equity vesting schedule is 4-year cliff.',
        remarks: 'Discussed engineering culture and on-call rotation expectations.',
        feedback: 'Fast-tracked to technical loop.',
        status: 'completed'
      },
      {
        name: 'Phase 3: Technical Interview',
        date: '2026-06-17',
        pros: 'Coding round focused on concurrency primitives. Solved all problems cleanly.',
        cons: 'Struggled briefly on a Kafka consumer group rebalancing edge case.',
        remarks: 'Interviewed by two Staff Engineers.',
        feedback: 'Strong hire signal from interviewers.',
        status: 'completed'
      },
      {
        name: 'Phase 4: Personality Interview',
        date: '2026-06-19',
        pros: 'Great alignment with engineering values around simplicity and reliability.',
        cons: 'None.',
        remarks: 'Met with the VP of Engineering.',
        feedback: 'Excellent culture fit noted.',
        status: 'completed'
      },
      {
        name: 'Phase 5: Final Technical Interview',
        date: '2026-06-23',
        pros: 'System design round went well. Designed a multi-tenant event streaming platform.',
        cons: 'Some pressure around failure mode handling and backpressure strategies.',
        remarks: 'Heavy focus on Kubernetes scaling and observability.',
        feedback: 'Exceeded expectations for Staff level.',
        status: 'completed'
      },
      {
        name: 'Phase 6: HR Negotiation',
        date: '2026-06-25',
        pros: 'Initial offer came in strong. Working to improve equity component.',
        cons: 'Sign-on bonus lower than expected.',
        remarks: 'Awaiting revised compensation package.',
        feedback: 'Revised offer expected within 2 days.',
        status: 'active'
      },
      {
        name: 'Phase 7: Offer Letter',
        date: '',
        pros: '',
        cons: '',
        remarks: '',
        feedback: '',
        status: 'upcoming'
      }
    ],
    postMortem: {
      skillsImprovements: 'Practice explaining Kafka consumer group rebalancing and backpressure strategies with concrete examples.',
      preparationNotes: 'Strong performance overall. Continue refining system design storytelling with emphasis on trade-offs.',
      selfRating: 8.5
    }
  },
  {
    id: 'databridge-003',
    companyName: 'DataBridge Corp',
    targetRole: 'Senior Frontend Architect',
    workModel: 'Remote',
    location: 'Seattle, WA',
    salaryRange: '$150k - $190k',
    otherBenefits: 'Annual Learning Budget, Equity Options, Dental & Vision, Wellness Stipend',
    hrContact: 'Riley Sanchez (rsanchez@databridgecorp.com)',
    appliedVia: 'Company Form',
    resumeLink: '',
    portfolioLink: '',
    keyJdRequirements: 'Expertise in React and Next.js architecture. Experience with design systems, accessibility (WCAG 2.1), CI/CD pipelines, and performance optimization. TypeScript is required.',
    currentStatus: 'Offer Letter',
    createdAt: '2026-06-18T14:15:00Z',
    phases: [
      {
        name: 'Phase 1: Application Submitted',
        date: '2026-06-18',
        pros: 'Direct application matching role requirements closely.',
        cons: 'None.',
        remarks: 'Submitted portfolio showcasing accessible component library.',
        feedback: 'Contacted within 3 days.',
        status: 'completed'
      },
      {
        name: 'Phase 2: Initial HR Pre-screening',
        date: '2026-06-20',
        pros: 'Recruiter explained the structured interview process clearly.',
        cons: 'Multiple interview rounds over two weeks.',
        remarks: 'Confirmed fully remote with quarterly offsites.',
        feedback: 'Passed to technical loop.',
        status: 'completed'
      },
      {
        name: 'Phase 3: Technical Interview',
        date: '2026-06-22',
        pros: 'Component architecture round went very well. Built an accessible data table with keyboard navigation.',
        cons: 'Minor stumble on some CSS containment edge cases.',
        remarks: 'Live coding with code review.',
        feedback: 'Strong feedback on code quality and test coverage.',
        status: 'completed'
      },
      {
        name: 'Phase 4: Personality Interview',
        date: '2026-06-24',
        pros: 'Great conversation about cross-functional collaboration and design-engineering workflows.',
        cons: 'None.',
        remarks: 'Met with the product and design leads.',
        feedback: 'Outstanding team fit.',
        status: 'completed'
      },
      {
        name: 'Phase 5: Final Technical Interview',
        date: '2026-06-25',
        pros: 'System design round: Architected a scalable dashboard platform with SSR and edge caching.',
        cons: 'In-depth discussion on hydration performance required careful explanation.',
        remarks: 'Focus on Core Web Vitals and CI/CD integration.',
        feedback: 'Strong hire recommendation.',
        status: 'completed'
      },
      {
        name: 'Phase 6: HR Negotiation',
        date: '2026-06-26',
        pros: 'Successfully negotiated base to $175k with improved equity.',
        cons: 'None.',
        remarks: 'Discussed start date and equipment preferences.',
        feedback: 'Compensation approval confirmed.',
        status: 'completed'
      },
      {
        name: 'Phase 7: Offer Letter',
        date: '2026-06-27',
        pros: 'Offer letter received and signed.',
        cons: 'None.',
        remarks: 'Start date confirmed.',
        feedback: 'Welcome package and onboarding details sent.',
        status: 'completed'
      }
    ],
    postMortem: {
      skillsImprovements: 'Deepen understanding of CSS containment and browser rendering pipeline edge cases.',
      preparationNotes: 'Excellent process. Continue refining accessible component patterns for future interviews.',
      selfRating: 9
    }
  }
];
