// Track 4 — extract User Profile hard rules from the master CV, once, via the
// user's BYOK key. Best-effort: a CV states seniority/years reliably but rarely
// states a comp floor or dealbreakers — those come back null/empty and the user
// fills them in by hand afterward (the UI is always the final source of truth,
// this is just a starting point so the form isn't blank).
import { Provider, callLLMStructured, JsonSchema } from '../llm.js';

const SYSTEM = `You extract a candidate's job-search screening profile from their master CV.
Return ONLY a JSON object with exactly these keys — truth only, be conservative:
{ "seniorityLevel", "yearsExperience", "workModels", "locations", "targetTracks" }

- seniorityLevel: the candidate's current level, ONE of "Intern","Junior","Mid","Senior","Staff",
  "Lead","Principal","Director", inferred from titles/years — or null if genuinely unclear.
- yearsExperience: total professional years as a number, or null if not computable.
- workModels: array, any of "Remote","Hybrid","Onsite" ONLY if the CV states a preference
  (e.g. "seeking remote roles"); empty array if the CV states no preference — do NOT guess.
- locations: array of city/region names the CV states as the candidate's base or stated
  preference; empty array if unclear.
- targetTracks: array of 1-3 short career-track labels the CV's experience clearly supports
  (e.g. "Backend", "AI/ML", "Platform/Infra") — only tracks with real, substantial evidence.

This profile screens JOB POSTINGS before any AI spend — it does not appear on the resume and
is never shown to an employer. Do not invent a comp floor, dealbreakers, or a "never claim"
list; those are not derivable from a CV and are left for the user to set by hand.`;

export const PROFILE_EXTRACT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    seniorityLevel: { type: ['string', 'null'], enum: ['Intern', 'Junior', 'Mid', 'Senior', 'Staff', 'Lead', 'Principal', 'Director', null] },
    yearsExperience: { type: ['number', 'null'] },
    workModels: { type: 'array', items: { type: 'string', enum: ['Remote', 'Hybrid', 'Onsite'] } },
    locations: { type: 'array', items: { type: 'string' } },
    targetTracks: { type: 'array', items: { type: 'string' } },
  },
  required: ['seniorityLevel', 'yearsExperience', 'workModels', 'locations', 'targetTracks'],
  additionalProperties: false,
};

export interface ExtractedProfile {
  seniorityLevel: string | null;
  yearsExperience: number | null;
  workModels: string[];
  locations: string[];
  targetTracks: string[];
}

export interface ProfileExtractInput {
  masterMd: string;
  apiKey: string;
  provider: Provider;
  model?: string;
  baseUrl?: string;
}

const VALID_LEVELS = new Set(['Intern', 'Junior', 'Mid', 'Senior', 'Staff', 'Lead', 'Principal', 'Director']);
const VALID_MODELS = new Set(['Remote', 'Hybrid', 'Onsite']);

export async function runProfileExtract(input: ProfileExtractInput): Promise<ExtractedProfile> {
  const { data } = await callLLMStructured({
    provider: input.provider,
    apiKey: input.apiKey,
    system: SYSTEM,
    prompt: `MASTER CV:\n${input.masterMd.slice(0, 8000)}`,
    model: input.model,
    baseUrl: input.baseUrl,
    maxTokens: 500,
    schema: PROFILE_EXTRACT_SCHEMA,
    schemaName: 'candidate_profile',
  });
  return {
    seniorityLevel: typeof data?.seniorityLevel === 'string' && VALID_LEVELS.has(data.seniorityLevel) ? data.seniorityLevel : null,
    yearsExperience: typeof data?.yearsExperience === 'number' ? data.yearsExperience : null,
    workModels: Array.isArray(data?.workModels) ? data.workModels.filter((m: unknown) => typeof m === 'string' && VALID_MODELS.has(m)) : [],
    locations: Array.isArray(data?.locations) ? data.locations.filter((l: unknown) => typeof l === 'string' && l.trim()).slice(0, 5) : [],
    targetTracks: Array.isArray(data?.targetTracks) ? data.targetTracks.filter((t: unknown) => typeof t === 'string' && t.trim()).slice(0, 3) : [],
  };
}
