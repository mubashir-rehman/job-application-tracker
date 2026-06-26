// serper.dev — Google Search API (a dedicated search tool, not an LLM). Returns
// structured results: a knowledgeGraph (company website + description) plus
// organic results we surface as sources. BYOK: key per-request, never stored.

export class SearchError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

export interface SerperResult {
  knowledgeGraph?: {
    title?: string;
    type?: string;
    website?: string;
    description?: string;
    descriptionLink?: string;
  };
  answerBox?: { answer?: string; snippet?: string };
  organic?: { title?: string; link?: string; snippet?: string }[];
}

export async function serperSearch(apiKey: string, query: string, num = 6): Promise<SerperResult> {
  let res: Response;
  try {
    res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ q: query, num }),
    });
  } catch (e) {
    throw new SearchError(`Network error reaching serper.dev: ${(e as Error).message}`, 502);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new SearchError((data as any)?.message || `serper.dev error ${res.status}`, res.status === 403 ? 402 : res.status);
  }
  return data as SerperResult;
}
