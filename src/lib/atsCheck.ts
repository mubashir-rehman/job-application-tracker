// Stage 6 — deterministic, client-side ATS check. No LLM and no network call:
// the resume never leaves the browser. Scores how well a tailored resume will
// survive an applicant-tracking system AND surface for *this* job description.
//
// The .docx we generate is single-column by construction, so the real risks are
// (1) the JD's hard keywords missing from the resume, (2) missing standard
// sections an ATS keys on, (3) contact info it can't parse, and (4) formatting
// the user may have pasted in (tables / images) that linearizes badly.

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface AtsCheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  weight: number;   // contribution to the overall score (0..1, items sum to 1)
  fraction: number; // how fully this check passed (0..1)
}

export interface AtsReport {
  score: number;                  // 0–100
  rating: 'Strong' | 'Workable' | 'At risk';
  items: AtsCheckItem[];
  matchedKeywords: string[];      // JD keywords found in the resume
  missingKeywords: string[];      // JD keywords absent from the resume
}

// Hard-skill keyword universe (curated; mirrors the server JD extractor's intent
// but kept self-contained so the check stays client-only and never pulls server
// code into the browser bundle). Order is irrelevant; matching is word-bounded.
const TECH = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Kotlin', 'Swift', 'Ruby on Rails', 'Ruby', 'PHP', 'Laravel',
  'C++', 'C#', '.NET', 'Rust', 'Scala', 'Elixir', 'Golang',
  'React Native', 'React', 'Next.js', 'Vue', 'Nuxt', 'Angular', 'Svelte', 'Node.js', 'Express', 'NestJS', 'Deno', 'Bun',
  'Django REST', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Spring',
  'PostgreSQL', 'MySQL', 'MariaDB', 'MongoDB', 'Redis', 'Memcached', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'SQLite', 'Snowflake', 'BigQuery',
  'GraphQL', 'RESTful APIs', 'REST', 'gRPC', 'WebSockets', 'WebRTC',
  'AWS', 'GCP', 'Azure', 'Heroku', 'Vercel', 'Netlify', 'DigitalOcean', 'Cloudflare',
  'Docker', 'Kubernetes', 'Terraform', 'Ansible',
  'Kafka', 'RabbitMQ', 'Celery', 'Airflow', 'Spark', 'dbt',
  'CI/CD', 'GitHub Actions', 'GitLab CI', 'Jenkins',
  'CUDA', 'PyTorch', 'TensorFlow', 'scikit-learn', 'Pandas', 'NumPy',
  'LangGraph', 'LangChain', 'OpenAI', 'Anthropic', 'Gemini', 'Hugging Face', 'pgvector', 'Pinecone', 'Weaviate',
  'vector databases', 'prompt engineering', 'RAG', 'LLMs', 'LLM',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Distributed Systems', 'Microservices', 'System Design', 'Serverless',
  'Tailwind', 'HL7', 'FHIR', 'Mirth Connect', 'Nginx', 'Linux', 'Bash', 'Agile', 'Scrum', 'Go',
  'Stripe', 'Twilio',
];

const NORMALIZE: Record<string, string> = {
  Golang: 'Go', LLMs: 'LLM', 'RESTful APIs': 'REST', 'Django REST': 'Django',
};

// Word-bounded, case-insensitive (except "Go", which would match "going") match
// of the TECH list against a body of text → the normalized terms present.
function findTerms(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const term of TECH) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = term === 'Go' ? '' : 'i';
    const re = new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9+#])`, flags);
    if (re.test(text)) {
      const norm = NORMALIZE[term] || term;
      if (!seen.has(norm.toLowerCase())) { seen.add(norm.toLowerCase()); out.push(norm); }
    }
  }
  return out;
}

function statusFor(fraction: number, warnAt = 0.6): CheckStatus {
  if (fraction >= 0.95) return 'pass';
  if (fraction >= warnAt) return 'warn';
  return 'fail';
}

// Run every check and roll the weighted fractions into a 0–100 score.
export function runAtsCheck(resumeMd: string, jdText: string): AtsReport {
  const resume = resumeMd || '';
  const resumeLower = resume.toLowerCase();
  const items: AtsCheckItem[] = [];

  // 1) Keyword coverage — the single biggest ATS signal.
  const jdKeywords = findTerms(jdText || '');
  const resumeSet = new Set(findTerms(resume).map(t => t.toLowerCase()));
  const matchedKeywords = jdKeywords.filter(k => resumeSet.has(k.toLowerCase()));
  const missingKeywords = jdKeywords.filter(k => !resumeSet.has(k.toLowerCase()));
  const measurable = jdKeywords.length > 0;
  const kwFraction = measurable ? matchedKeywords.length / jdKeywords.length : 0.7;
  items.push({
    id: 'keywords',
    label: 'JD keyword coverage',
    status: measurable ? statusFor(kwFraction, 0.5) : 'warn',
    detail: measurable
      ? `${matchedKeywords.length}/${jdKeywords.length} JD hard-skill keywords present` +
        (missingKeywords.length ? ` · missing: ${missingKeywords.join(', ')}` : '')
      : 'No recognizable hard-skill keywords found in the JD — coverage could not be scored.',
    weight: 0.45,
    fraction: kwFraction,
  });

  // 2) Standard sections an ATS parses into structured fields.
  const hasExperience = /(^|\n)\s*#{1,3}.*\b(experience|work history|employment|professional)\b/i.test(resume);
  const hasSkills = /(^|\n)\s*#{1,3}.*\b(skills|technologies|technical|stack|tooling)\b/i.test(resume);
  const hasEducation = /(^|\n)\s*#{1,3}.*\b(education|qualification)\b/i.test(resume);
  const sectionScore = (hasExperience ? 0.45 : 0) + (hasSkills ? 0.35 : 0) + (hasEducation ? 0.20 : 0);
  const missingSections = [
    !hasExperience && 'Experience',
    !hasSkills && 'Skills',
    !hasEducation && 'Education',
  ].filter(Boolean);
  items.push({
    id: 'sections',
    label: 'Standard sections',
    status: !hasExperience || !hasSkills ? statusFor(sectionScore) : statusFor(sectionScore, 0.75),
    detail: missingSections.length
      ? `Missing a clear heading for: ${missingSections.join(', ')}`
      : 'Experience, Skills and Education headings all present',
    weight: 0.20,
    fraction: sectionScore,
  });

  // 3) Contact info an ATS can route on.
  const hasEmail = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(resume);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(resume);
  const hasLink = /(linkedin\.com|github\.com|https?:\/\/)/i.test(resumeLower);
  const contactFraction = !hasEmail ? 0 : (hasPhone || hasLink ? 1 : 0.7);
  items.push({
    id: 'contact',
    label: 'Parseable contact info',
    status: statusFor(contactFraction, 0.7),
    detail: !hasEmail
      ? 'No email address found — ATS cannot route the application'
      : `Email${hasPhone ? ' · phone' : ''}${hasLink ? ' · link' : ''} found`,
    weight: 0.15,
    fraction: contactFraction,
  });

  // 4) Formatting that linearizes cleanly (tables/images break many parsers).
  const hasTable = /\n\s*\|.*\|.*\n\s*\|?[\s:-]*\|/.test(resume) || /(^|\n)\s*\|.*\|.*\|/.test(resume);
  const hasImage = /!\[[^\]]*\]\(/.test(resume);
  const safetyIssues = [hasTable && 'tables', hasImage && 'images'].filter(Boolean);
  const safetyFraction = 1 - (hasTable ? 0.6 : 0) - (hasImage ? 0.4 : 0);
  items.push({
    id: 'formatting',
    label: 'ATS-safe formatting',
    status: statusFor(safetyFraction, 0.6),
    detail: safetyIssues.length
      ? `Contains ${safetyIssues.join(' & ')} — these often scramble in ATS parsing; the .docx export drops them, but verify`
      : 'Single-column, no tables or images — parses cleanly',
    weight: 0.12,
    fraction: Math.max(0, safetyFraction),
  });

  // 5) Length sanity — too thin reads as unqualified; a wall hurts skimmability.
  const words = (resume.trim().match(/\S+/g) || []).length;
  const lengthFraction = words < 200 ? 0.4 : words > 1100 ? 0.6 : 1;
  items.push({
    id: 'length',
    label: 'Length',
    status: statusFor(lengthFraction, 0.6),
    detail: words < 200
      ? `Only ~${words} words — likely too thin for a full resume`
      : words > 1100
        ? `~${words} words — trending long; tighten toward one page where possible`
        : `~${words} words — in a healthy range`,
    weight: 0.08,
    fraction: lengthFraction,
  });

  const score = Math.round(items.reduce((s, it) => s + it.weight * it.fraction, 0) * 100);
  const rating: AtsReport['rating'] = score >= 80 ? 'Strong' : score >= 60 ? 'Workable' : 'At risk';

  return { score, rating, items, matchedKeywords, missingKeywords };
}
