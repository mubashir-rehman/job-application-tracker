import { JobApplication, InterviewPhase } from '../types';

// Canonical offer detection — used by StatsGrid and PerformanceTelemetry
export function isOfferReceived(app: JobApplication): boolean {
  return app.currentStatus.toLowerCase().includes('offer') ||
    (app.phases.length > 0 && app.phases[app.phases.length - 1]?.status === 'completed');
}

// Derives currentStatus from the phases array — single source of truth
export function deriveCurrentStatus(phases: InterviewPhase[]): string {
  // Find the last active phase
  for (let i = phases.length - 1; i >= 0; i--) {
    if (phases[i].status === 'active') {
      return phases[i].name.replace(/^Phase \d+:\s*/, '');
    }
  }
  // No active phase — find the last completed phase
  for (let i = phases.length - 1; i >= 0; i--) {
    if (phases[i].status === 'completed') {
      if (i === phases.length - 1) return 'Offer Received';
      return phases[i].name.replace(/^Phase \d+:\s*/, '') + ' Complete';
    }
  }
  return 'Application Submitted';
}

// Advance an application to its next pipeline stage — completes the active
// phase and activates the next (or activates phase 0 if nothing is active yet).
// Returns a new object with a freshly derived currentStatus; never mutates.
export function advanceApplicationStage(app: JobApplication): JobApplication {
  const phases = app.phases.map(p => ({ ...p }));
  const activeIndex = phases.findIndex(p => p.status === 'active');

  if (activeIndex === -1) {
    // Nothing active yet (e.g. a saved role) — start the pipeline.
    if (phases[0]) phases[0].status = 'active';
  } else {
    phases[activeIndex].status = 'completed';
    if (!phases[activeIndex].date) phases[activeIndex].date = new Date().toISOString().slice(0, 10);
    if (activeIndex + 1 < phases.length) phases[activeIndex + 1].status = 'active';
  }

  return { ...app, phases, currentStatus: deriveCurrentStatus(phases) };
}

// Parse salary range string into a numeric midpoint for sorting/averaging
// Handles: "$190k-$240k", "$190,000-$240,000", "190000-240000"
export function parseSalaryMidpoint(range: string): number | null {
  if (!range?.trim()) return null;
  const hasK = /\d+\s*k/i.test(range);
  const nums = range.replace(/[$,]/g, '').match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  const normalized = nums.map(n => (hasK && n < 10000) ? n * 1000 : n);
  return normalized.reduce((a, b) => a + b, 0) / normalized.length;
}

// Extract tech keywords from JD requirements text
export function extractTechTags(keyJdRequirements: string): string[] {
  if (!keyJdRequirements?.trim()) return [];
  const KNOWN_TECH = [
    'React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript', 'Python',
    'Go', 'Rust', 'Java', 'C++', 'C#', 'Node.js', 'Express', 'FastAPI', 'Django',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform',
    'GraphQL', 'REST', 'gRPC', 'WebSockets',
    'CUDA', 'HPC', 'ML', 'AI', 'LangChain', 'PyTorch', 'TensorFlow',
    'Distributed Systems', 'Microservices', 'System Design',
    'CI/CD', 'GitHub Actions', 'Jenkins',
  ];
  const text = keyJdRequirements.toLowerCase();
  return KNOWN_TECH.filter(tech => text.includes(tech.toLowerCase())).slice(0, 5);
}
