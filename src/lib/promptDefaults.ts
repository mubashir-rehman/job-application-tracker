// Track 4 — Prompt Manager registry: every configurable prompt in one place,
// each with a shipped default versioned in this repo. Tailoring instructions
// keep their own dedicated table/hook (resume_instructions / useInstructions)
// since that feature predates this track and already works — this registry
// lists it alongside the newer prompts so the Prompt Manager page can present
// all four uniformly, but only the newer three persist through
// prompt_overrides/usePromptOverrides.
import { DEFAULT_INSTRUCTIONS } from './defaultInstructions';
import { DEFAULT_VISUAL_QA_RUBRIC } from './visualQa';

export const DEFAULT_RESEARCH_BRIEF_PROMPT = `Research the company using web search. Return ONLY a JSON object with exactly these keys:
{"companyWebsite": string|null, "summary": string|null, "marketSalaryHint": string|null,
 "productOverview": string|null, "engCulture": string|null, "stackSignals": string[], "recentNews": string[], "experienceMatch": string|null}
- companyWebsite: the official website URL.
- summary: one factual sentence on what the company does.
- marketSalaryHint: a typical market pay range for this role/level with the source, if not already posted; else null.
- productOverview: 1-2 sentences on what the product/company concretely builds or does. null if unclear.
- engCulture: one sentence on engineering culture/practices ONLY if genuinely discoverable; else null. Do not guess.
- stackSignals: concrete technologies/tools this company is known to use, from real signals, beyond what's already in the JD. Empty array if none found.
- recentNews: up to 3 short factual recent-news bullets (funding, launches, notable events). Empty array if none found.
- experienceMatch: using the candidate's master CV ONLY, 1-2 sentences on what specific real experience matches what this company actually does that the JD text itself doesn't explicitly ask for. This is a suggestion to consider, NOT a resume claim — never invent experience. null if no genuine match.
Use only information you can find via search; never fabricate. Output the JSON only, no prose, no code fences.`;

export const DEFAULT_COVER_EMAIL_PROMPT = `You are a candidate writing a short, direct cover email to accompany a tailored resume.

Truth only — use solely facts from the master CV and the tailored resume. Never invent
experience, metrics, or enthusiasm the candidate wouldn't genuinely have. 120-180 words.

STRUCTURE
1. One line: the role and why you're a fit (your strongest, most defensible overlap).
2. 2-3 sentences: concrete evidence from the master CV that maps to the JD's top priority.
3. One line: availability / next step, no generic "I look forward to hearing from you" filler.

Plain, confident, specific — not a form letter. No em-dashes, no "I am excited to apply".
Return ONLY the email body (no subject line, no signature block).`;

export interface PromptDescriptor {
  key: 'tailoring' | 'visualQaRules' | 'researchBrief' | 'coverEmail';
  label: string;
  description: string;
  default: string;
  // false = this prompt has no wired consumer yet (reserved for a future feature);
  // shown in the UI so the user isn't misled into thinking it does something today.
  wired: boolean;
  // 'dedicated' = tailoring's own resume_instructions table/hook; 'overrides' =
  // the shared prompt_overrides table via usePromptOverrides.
  storage: 'dedicated' | 'overrides';
}

export const PROMPT_REGISTRY: PromptDescriptor[] = [
  {
    key: 'tailoring',
    label: 'Tailoring instructions',
    description: 'System prompt layered on top of the built-in resume-tailoring output contract. Controls strategy, positioning, voice, and honesty framing.',
    default: DEFAULT_INSTRUCTIONS,
    wired: true,
    storage: 'dedicated',
  },
  {
    key: 'visualQaRules',
    label: 'Visual QA rules',
    description: 'Rubric the visual-QA vision pass checks rendered resume pages against (layout, spacing, house-style conformance).',
    default: DEFAULT_VISUAL_QA_RUBRIC,
    wired: true,
    storage: 'overrides',
  },
  {
    key: 'researchBrief',
    label: 'Research brief prompt',
    description: 'What the grounded web-search pass is asked to produce about a company (product, culture, stack signals, news, experience overlap). Layers on top of the built-in JSON contract — that contract stays authoritative so parsing keeps working.',
    default: DEFAULT_RESEARCH_BRIEF_PROMPT,
    wired: true,
    storage: 'overrides',
  },
  {
    key: 'coverEmail',
    label: 'Cover email prompt',
    description: 'Draft for a future cover-email generator — not wired to any endpoint yet.',
    default: DEFAULT_COVER_EMAIL_PROMPT,
    wired: false,
    storage: 'overrides',
  },
];

// Resolution order: an explicit user override always wins; falls back to the
// shipped default. Centralized so every consumer resolves a prompt identically.
export function resolvePrompt(defaultText: string, override: string | null | undefined): string {
  const trimmed = override?.trim();
  return trimmed ? trimmed : defaultText;
}
