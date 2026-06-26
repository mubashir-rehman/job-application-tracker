// Best-effort server-side fetch of a job-posting URL → readable text.
// Runs server-side because browsers can't fetch arbitrary cross-origin pages.
// Many JD hosts (LinkedIn, Workday) bot-protect or require JS; when a fetch
// yields little usable text the caller should fall back to pasted text.

export class FetchTextError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

// Strip HTML to plain text, preserving block-level line breaks.
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function fetchUrlText(url: string, maxChars = 14000): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FetchTextError('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new FetchTextError('Only http(s) URLs are supported');
  }

  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
  } catch (e) {
    throw new FetchTextError(`Network error fetching the URL: ${(e as Error).message}`, 502);
  }

  if (!res.ok) {
    throw new FetchTextError(`The URL returned HTTP ${res.status}`, res.status === 404 ? 404 : 502);
  }

  const ctype = res.headers.get('content-type') || '';
  const body = await res.text();
  const text = ctype.includes('html') ? htmlToText(body) : body.trim();
  return text.slice(0, maxChars);
}
