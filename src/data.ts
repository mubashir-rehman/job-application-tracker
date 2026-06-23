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
    id: 'nvidia-123',
    companyName: 'NVIDIA',
    targetRole: 'Senior CUDA Engineer',
    workModel: 'Hybrid',
    location: 'Santa Clara, CA',
    salaryRange: '$190k - $240k',
    otherBenefits: '15% Bonus, ESPP, Premium Health Insurance, Unlimited PTO',
    hrContact: 'Sarah Jenkins (sjenkins@nvidia.com)',
    appliedVia: 'Referral',
    resumeLink: 'https://drive.google.com/file/d/cuda-expert-resume/view',
    portfolioLink: 'https://github.com/cuda-expert-dev',
    keyJdRequirements: '5+ years C++/CUDA development. Deep experience with GPU memory hierarchy, kernel optimization, and high-performance computing. Knowledge of PyTorch internals is a huge plus.',
    currentStatus: 'Technical Interview',
    createdAt: '2026-06-10T10:00:00Z',
    phases: [
      {
        name: 'Phase 1: Application Submitted',
        date: '2026-06-10',
        pros: 'Internal referral from Principal Engineer in the AV group. CV was flagged immediately.',
        cons: 'Resume had slightly outdated C++ standard references (C++17 instead of C++20).',
        remarks: 'Applied with the GPU acceleration specialized resume.',
        feedback: 'Recruiter response within 24 hours.',
        status: 'completed'
      },
      {
        name: 'Phase 2: Initial HR Pre-screening',
        date: '2026-06-12',
        pros: 'Sarah was extremely positive. Confirmed the salary band is flexible for top-tier candidates.',
        cons: 'Must do a live C++/CUDA whiteboard round, no take-home option.',
        remarks: 'Confirmed working model is hybrid (3 days onsite in Santa Clara).',
        feedback: 'Invited to Technical Interview with Hiring Manager.',
        status: 'completed'
      },
      {
        name: 'Phase 3: Technical Interview',
        date: '2026-06-25',
        pros: 'Have prepared extensive notes on memory bank conflicts, shared memory optimization, and thread block scheduling.',
        cons: 'Need to make sure not to slip on standard system design questions.',
        remarks: 'Scheduled with Lead Architect of the TensorRT Core team.',
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
      skillsImprovements: 'Need to review GPU execution models, warp divergent branch penalties, and parallel reduction patterns.',
      preparationNotes: 'Read the NVIDIA OptiX and CUDA programming guides chapter 4 and 5 carefully.',
      selfRating: 8
    }
  },
  {
    id: 'stripe-456',
    companyName: 'Stripe',
    targetRole: 'Staff Backend Engineer',
    workModel: 'Remote',
    location: 'Dublin, IE',
    salaryRange: '$160k - $210k',
    otherBenefits: 'Stripe RSU Equity, Fully Funded Home Office, Comprehensive Pension Matching',
    hrContact: 'Liam O\'Connor (liam@stripe.com)',
    appliedVia: 'LinkedIn',
    resumeLink: 'https://drive.google.com/file/d/stripe-backend-resume/view',
    portfolioLink: 'https://github.com/distributed-stripe-dev',
    keyJdRequirements: 'Distributed systems architect. Experience designing high-throughput, low-latency API infrastructure. Robust understanding of distributed transactions, idempotency, and database consistency models.',
    currentStatus: 'HR Negotiation',
    createdAt: '2026-05-15T09:30:00Z',
    phases: [
      {
        name: 'Phase 1: Application Submitted',
        date: '2026-05-15',
        pros: 'Submitted through LinkedIn Easy Apply. Instant automated confirmation.',
        cons: 'Cold application without referral, might take time to get noticed.',
        remarks: 'Emphasized distributed ledger design in cover letter notes.',
        feedback: 'Auto-response received.',
        status: 'completed'
      },
      {
        name: 'Phase 2: Initial HR Pre-screening',
        date: '2026-05-19',
        pros: 'Liam loved the deep dive into idempotent financial message processing on my blog.',
        cons: 'Remote team is in Dublin time zone, requiring early morning syncs.',
        remarks: 'Discussed high availability architectures.',
        feedback: 'Fast-tracked directly to technical loop.',
        status: 'completed'
      },
      {
        name: 'Phase 3: Technical Interview',
        date: '2026-05-27',
        pros: 'Coding round went flawlessly. Implemented a robust token bucket rate limiter in Ruby/Go.',
        cons: 'Fumbled slightly on edge cases around cluster-wide Redis synchronization syncs.',
        remarks: 'Met with two Senior Staff Engineers.',
        feedback: 'Strong hire recommendation.',
        status: 'completed'
      },
      {
        name: 'Phase 4: Personality Interview',
        date: '2026-06-02',
        pros: 'Values alignment interview. Fits well with Stripe\'s focus on extreme clarity of thought and written culture.',
        cons: 'None.',
        remarks: 'Spoke with Director of Engineering.',
        feedback: 'Very positive culture check.',
        status: 'completed'
      },
      {
        name: 'Phase 5: Final Technical Interview',
        date: '2026-06-11',
        pros: 'System Design round went beautifully. Designed a multi-region highly concurrent payment ledger.',
        cons: 'A bit of pressure regarding active-active replication challenges.',
        remarks: 'Heavy focus on partition tolerance and database consensus (Raft/Paxos).',
        feedback: 'Exceeded bar for Staff title.',
        status: 'completed'
      },
      {
        name: 'Phase 6: HR Negotiation',
        date: '2026-06-20',
        pros: 'Offered initial base of $180k + $80k equity. Working to push equity grant higher.',
        cons: 'Sign-on bonus is lower than expected.',
        remarks: 'Awaiting revised package review from compensation committee.',
        feedback: 'Revised proposal expected tomorrow.',
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
      skillsImprovements: 'Practice explaining cross-region consensus protocols with simple analogies. Brushed up on active-active replication systems.',
      preparationNotes: 'Great job staying calm under pressure. Stripe technical staff appreciate precise terminology over buzzwords.',
      selfRating: 9
    }
  },
  {
    id: 'airbnb-789',
    companyName: 'Airbnb',
    targetRole: 'Senior Frontend Architect',
    workModel: 'Remote',
    location: 'San Francisco, CA',
    salaryRange: '$220k - $250k',
    otherBenefits: 'Annual travel stipend, generous equity, dental/vision, pet insurance, gym stipend',
    hrContact: 'Chloe Vance (chloe.v@airbnb.com)',
    appliedVia: 'Company Form',
    resumeLink: 'https://drive.google.com/file/d/frontend-architect-resume/view',
    portfolioLink: 'https://chloe-architect.io',
    keyJdRequirements: 'Expertise in modern React architecture, build tooling (Vite/Rspack), design systems at scale, core web vitals optimization, and headless browser component patterns.',
    currentStatus: 'Offer Letter',
    createdAt: '2026-05-01T14:15:00Z',
    phases: [
      {
        name: 'Phase 1: Application Submitted',
        date: '2026-05-01',
        pros: 'Direct application. Clean layout matches Airbnb design principles.',
        cons: 'None.',
        remarks: 'Linked some open-source design system contributions.',
        feedback: 'Contacted within 4 days.',
        status: 'completed'
      },
      {
        name: 'Phase 2: Initial HR Pre-screening',
        date: '2026-05-05',
        pros: 'Very structured process. Chloe explained the 5-round frontend loop clearly.',
        cons: 'A lot of interviews to schedule.',
        remarks: 'Confirmed remote within country (US).',
        feedback: 'Passed.',
        status: 'completed'
      },
      {
        name: 'Phase 3: Technical Interview',
        date: '2026-05-12',
        pros: 'Build-a-component round went very well. Built an accessible custom Combobox with keyboard navigation.',
        cons: 'Fumbled slightly on some WAI-ARIA role assignments but corrected quickly.',
        remarks: 'Live coding with visual inspection.',
        feedback: 'Strong praise for code cleanliness and test coverage.',
        status: 'completed'
      },
      {
        name: 'Phase 4: Personality Interview',
        date: '2026-05-18',
        pros: 'Cross-functional chat with product manager and designer. Talked about bridging the engineering-design gap.',
        cons: 'None.',
        remarks: 'Great chemistry with the team.',
        feedback: 'Outstanding feedback.',
        status: 'completed'
      },
      {
        name: 'Phase 5: Final Technical Interview',
        date: '2026-05-26',
        pros: 'System architecture round: Designed Airbnb-like homepage rendering system with hybrid SSR/ISR.',
        cons: 'Had to discuss hydration issues in depth, which got highly technical.',
        remarks: 'Detailed discussion on edge runtimes and CDNs.',
        feedback: 'Strong hire recommendation.',
        status: 'completed'
      },
      {
        name: 'Phase 6: HR Negotiation',
        date: '2026-06-05',
        pros: 'Successfully negotiated base up to $235k and increased initial equity grant.',
        cons: 'None.',
        remarks: 'Discussed start date and relocation of equipment.',
        feedback: 'Passed compensation approval.',
        status: 'completed'
      },
      {
        name: 'Phase 7: Offer Letter',
        date: '2026-06-15',
        pros: 'Offer letter signed! Start date set for August 1st.',
        cons: 'None.',
        remarks: 'Officially accepted and resigned from current job.',
        feedback: 'Welcome package sent!',
        status: 'completed'
      }
    ],
    postMortem: {
      skillsImprovements: 'Deepened understanding of WAI-ARIA design patterns. Learned some great patterns for hybrid client-server routing.',
      preparationNotes: 'The team was very impressive. Keep updating personal component libraries for accessibility.',
      selfRating: 9.5
    }
  }
];
