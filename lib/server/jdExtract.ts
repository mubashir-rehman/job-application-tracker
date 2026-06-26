// Deterministic JD field extraction — regex + heuristics, ZERO LLM cost.
// Handles the common structured shapes (emoji/`Label:` LinkedIn posts, ATS
// pages, prose "X is hiring a <role>") so the pipeline only pays for an LLM
// call when these can't resolve the core fields. Truth-only: it never invents
// a value (esp. salary or a recruiter email — see resume-analysis #7, #9).

export type WorkModel = 'Remote' | 'Hybrid' | 'Onsite';
export type AppliedVia = 'LinkedIn' | 'Email' | 'Company Form' | 'Referral' | 'Other';

export interface JdFields {
  companyName?: string;
  targetRole?: string;
  workModel?: WorkModel;
  location?: string;
  salaryRange?: string;
  otherBenefits?: string;
  hrContact?: string;
  appliedVia?: AppliedVia;
  keyRequirements?: string;
  techTags?: string[];
}

export interface DeterministicResult {
  fields: JdFields;
  found: string[];
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function clean(s: string): string {
  return s
    .replace(/[*_`>#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;,:\s]+$/, '')
    .trim();
}

// Find `Label: value` — value on the same line, or the next non-empty line.
// Tolerates a leading emoji/symbol (e.g. "🏢 Company: …").
function labeled(lines: string[], labels: string[]): string | null {
  const labelRe = new RegExp(`^[^\\nA-Za-z0-9]{0,4}\\s*(?:${labels.join('|')})\\s*[:\\-–]\\s*(.*)$`, 'i');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(labelRe);
    if (!m) continue;
    let v = clean(m[1]);
    if (!v) {
      for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
        const nv = clean(lines[j]);
        if (nv) { v = nv; break; }
      }
    }
    if (v) return v;
  }
  return null;
}

function detectWorkModel(hay: string): WorkModel | undefined {
  if (/\bhybrid\b/i.test(hay)) return 'Hybrid';
  if (/\b(remote|work from home|wfh|fully[- ]?remote|distributed team)\b/i.test(hay)) return 'Remote';
  if (/\b(on[- ]?site|in[- ]?office|in[- ]?person)\b/i.test(hay)) return 'Onsite';
  return undefined;
}

// Only returns a value when there's a real money signal — never matches
// "1–2 years of experience" as salary, and never estimates a market rate.
function detectSalary(text: string, labeledVal: string | null): string | undefined {
  if (labeledVal && /\d/.test(labeledVal) && /[$€£₹]|USD|EUR|GBP|PKR|INR|CAD|AUD|\bk\b|per\s|\/\s?(year|month|hour|yr|mo|hr)|annum|salary|comp/i.test(labeledVal)) {
    return clean(labeledVal);
  }
  const cur = /(?:USD|EUR|GBP|PKR|INR|CAD|AUD|Rs\.?|₹|\$|€|£)\s?\d[\d,]*(?:\.\d+)?\s*[kK]?(?:\s*(?:[-–—]|to)\s*(?:USD|EUR|GBP|PKR|Rs\.?|₹|\$|€|£)?\s?\d[\d,]*\s*[kK]?)?(?:\s*(?:per|\/)\s*(?:year|annum|yr|month|mo|hour|hr))?/i;
  const m = text.match(cur);
  if (m) return clean(m[0]);
  // "<n>k–<n>k" only when a pay word is present somewhere (avoids year ranges).
  const kRange = /\b\d{2,3}\s*[kK]\s*(?:[-–—]|to)\s*\d{2,3}\s*[kK]\b(?:\s*(?:per|\/)\s*(?:year|annum|yr|month))?/;
  const m2 = text.match(kRange);
  if (m2 && /(salary|compensation|\bpay\b|\bctc\b|annual|per\s+year)/i.test(text)) return clean(m2[0]);
  return undefined;
}

function hostOf(url?: string): string {
  if (!url) return '';
  try { return new URL(url).host.toLowerCase(); } catch { return ''; }
}

function detectAppliedVia(text: string, url?: string): AppliedVia | undefined {
  const host = hostOf(url);
  if (/linkedin\./.test(host)) return 'LinkedIn';
  if (/(greenhouse|lever\.co|myworkdayjobs|workday|ashbyhq|breezy|workable|bamboohr|smartrecruiters|jobvite|icims|recruitee|teamtailor|join\.com|wellfound|ycombinator|indeed\.)/.test(host)) return 'Company Form';
  if (/\b(referral|refer a friend|employee referral)\b/i.test(text)) return 'Referral';
  if (EMAIL_RE.test(text) && /\b(send|email|e-mail|reach out|apply|submit|share)\b/i.test(text)) return 'Email';
  if (host) return 'Company Form';
  if (EMAIL_RE.test(text)) return 'Email';
  return undefined;
}

// Prose company/role: "<Company> is hiring/looking for a <role>", "Join <Company> as <role>".
function detectProseCompanyRole(text: string, lines: string[]): { company?: string; role?: string } {
  let company: string | undefined;
  let role: string | undefined;

  const hiring = text.match(/\b([A-Z][\w.&'’\- ]{1,40}?)\s+is\s+(?:currently\s+)?(?:on the lookout for|looking for|seeking|hiring|searching for|recruiting)\s+(?:a |an |the )?(.+?)(?:\s+to join| for our team| for its| at | who | with |\.|\n|$)/i);
  if (hiring) { company = clean(hiring[1]); role = clean(hiring[2]); }

  if (!company) {
    const join = text.match(/\bjoin\s+([A-Z][\w.&'’\- ]{1,40}?)\s+as\s+(?:a |an )?(.+?)(?:\.|,|\n|$)/i);
    if (join) { company = clean(join[1]); role = clean(join[2]); }
  }

  // Role inside a "hiring a <Title>" phrase (catches one-liners w/o a company).
  if (!role) {
    const r = text.match(
      /\b(?:hiring|looking for|seeking|recruiting|we need|we want|wanted|join us as|apply for)\s+(?:a |an |our (?:next )?)?([A-Z][A-Za-z0-9&'’/+. ]*?(?:Engineer|Developer|Manager|Designer|Scientist|Analyst|Lead|Architect|Specialist|Consultant|DevOps|SRE|Programmer|Administrator|Intern|Technician|Director|Founder|Recruiter|Marketer|Writer))\b/,
    );
    if (r) role = clean(r[1]);
  }

  // Role from the first line if it reads like a job title.
  if (!role) {
    const first = lines.find(Boolean)?.trim() || '';
    if (
      first.length <= 80 &&
      !/[.!?]$/.test(first) &&
      /\b(engineer|developer|manager|designer|scientist|analyst|lead|architect|intern|specialist|consultant|administrator|devops|sre|qa|tester|product|director|head of|founder|cto|programmer|technician)\b/i.test(first)
    ) {
      role = clean(first.replace(/\bapply now!?$/i, ''));
    }
  }
  return { company, role };
}

function titleCase(s: string): string {
  return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// Company from a known ATS URL slug (Lever/Greenhouse/Ashby/Workable/…), found
// in the text or the source URL — a high-confidence signal with no LLM cost.
function companyFromAtsUrl(text: string, url?: string): string | undefined {
  const hay = `${url || ''} ${text}`;
  const path = hay.match(/(?:jobs\.lever\.co|boards\.greenhouse\.io|jobs\.ashbyhq\.com|apply\.workable\.com|jobs\.jobvite\.com|[\w-]+\.recruitee\.com)\/([A-Za-z0-9][A-Za-z0-9-]+)/i);
  if (path) return titleCase(path[1]);
  const sub = hay.match(/https?:\/\/([a-z0-9][a-z0-9-]+)\.(?:greenhouse\.io|ashbyhq\.com|breezy\.hr|bamboohr\.com|teamtailor\.com)/i);
  if (sub && !/^(www|jobs|boards|apply|careers)$/i.test(sub[1])) return titleCase(sub[1]);
  return undefined;
}

const TECH = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Kotlin', 'Swift', 'Ruby on Rails', 'Ruby', 'PHP', 'Laravel',
  'C++', 'C#', '.NET', 'Rust', 'Scala', 'Elixir', 'Golang',
  'React Native', 'React', 'Next.js', 'Vue', 'Nuxt', 'Angular', 'Svelte', 'Node.js', 'Express', 'NestJS', 'Deno', 'Bun',
  'Django REST', 'Django', 'DRF', 'Flask', 'FastAPI', 'Spring Boot', 'Spring',
  'PostgreSQL', 'MySQL', 'MariaDB', 'MongoDB', 'Redis', 'Memcached', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'SQLite', 'Snowflake', 'BigQuery',
  'GraphQL', 'RESTful APIs', 'REST', 'gRPC', 'WebSockets', 'WebRTC',
  'AWS', 'GCP', 'Azure', 'Heroku', 'Vercel', 'Netlify', 'DigitalOcean', 'Cloudflare',
  'Docker', 'Kubernetes', 'Terraform', 'Ansible',
  'Kafka', 'RabbitMQ', 'Celery', 'Airflow', 'Spark', 'dbt',
  'CI/CD', 'GitHub Actions', 'GitLab CI', 'Jenkins',
  'CUDA', 'PyTorch', 'TensorFlow', 'scikit-learn', 'Pandas', 'NumPy',
  'LangGraph', 'LangChain', 'n8n', 'OpenAI', 'Anthropic', 'Gemini', 'Hugging Face', 'pgvector', 'Pinecone', 'Weaviate',
  'vector databases', 'vector database', 'prompt engineering', 'RAG', 'LLMs', 'LLM',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Distributed Systems', 'Microservices', 'System Design', 'Serverless',
  'Tailwind', 'HL7', 'FHIR', 'Mirth Connect', 'Nginx', 'Linux', 'Bash', 'Agile', 'Scrum', 'Go',
];

const TECH_NORMALIZE: Record<string, string> = {
  Golang: 'Go', LLMs: 'LLM', 'RESTful APIs': 'REST', 'Django REST': 'Django', 'vector database': 'vector databases',
};

function detectTech(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const term of TECH) {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Go is case-sensitive (avoid matching "go"/"going"); the rest are not.
    const flags = term === 'Go' ? '' : 'i';
    const re = new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9+#])`, flags);
    if (re.test(text)) {
      const norm = TECH_NORMALIZE[term] || term;
      if (!seen.has(norm.toLowerCase())) { seen.add(norm.toLowerCase()); out.push(norm); }
    }
  }
  return out.slice(0, 12);
}

function detectExperience(text: string, lines: string[]): string | null {
  const lab = labeled(lines, ['experience', 'years of experience', 'exp']);
  if (lab) return lab;
  const m = text.match(/\b\d+\+?\s*(?:[-–]\s*\d+\+?)?\s*years?(?:\s+of\s+experience)?\b/i);
  return m ? clean(m[0]) : null;
}

export function deterministicExtract(text: string, url?: string): DeterministicResult {
  const lines = text.split('\n');
  const fields: JdFields = {};

  const companyLabeled = labeled(lines, ['company', 'employer', 'organization', 'organisation']);
  const roleLabeled = labeled(lines, ['role', 'position', 'job title', 'title', 'job role', 'designation']);
  if (companyLabeled) fields.companyName = companyLabeled;
  if (roleLabeled) fields.targetRole = roleLabeled;

  if (!fields.companyName || !fields.targetRole) {
    const prose = detectProseCompanyRole(text, lines);
    if (!fields.companyName && prose.company) fields.companyName = prose.company;
    if (!fields.targetRole && prose.role) fields.targetRole = prose.role;
  }
  if (!fields.companyName) {
    const ats = companyFromAtsUrl(text, url);
    if (ats) fields.companyName = ats;
  }

  const locLabeled = labeled(lines, ['location', 'based in', 'work location', 'job location']);
  const wm = detectWorkModel(`${labeled(lines, ['work model', 'work type', 'employment type', 'job type', 'workplace type', 'arrangement', 'type']) || ''} ${text}`);
  if (wm) fields.workModel = wm;
  if (locLabeled) fields.location = locLabeled;
  else if (wm === 'Remote') fields.location = 'Remote';

  const salary = detectSalary(text, labeled(lines, ['salary', 'compensation', 'pay', 'pay range', 'salary range', 'ctc', 'budget', 'rate']));
  if (salary) fields.salaryRange = salary;

  const benefits = labeled(lines, ['perks', 'benefits', 'attractive perks', 'what we offer', 'we offer', 'compensation & benefits', 'why join us']);
  if (benefits) fields.otherBenefits = benefits;

  const contactLabeled = labeled(lines, ['contact', 'recruiter', 'hiring manager', 'reach out to']);
  const email = text.match(EMAIL_RE)?.[0];
  if (contactLabeled && email && !EMAIL_RE.test(contactLabeled)) fields.hrContact = `${contactLabeled} · ${email}`;
  else if (contactLabeled) fields.hrContact = contactLabeled;
  else if (email) fields.hrContact = email;

  const via = detectAppliedVia(text, url);
  if (via) fields.appliedVia = via;

  const tech = detectTech(text);
  if (tech.length) fields.techTags = tech;

  // Deterministic keyRequirements digest (experience + tech). The LLM only
  // fills this when we couldn't (sparse posts) — see the pipeline router.
  const exp = detectExperience(text, lines);
  const digest = [exp, tech.slice(0, 8).join(', ')].filter(Boolean).join(' · ');
  if (digest) fields.keyRequirements = digest;

  return { fields, found: Object.keys(fields) };
}
