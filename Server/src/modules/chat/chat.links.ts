/**
 * Link previews for URLs pasted into the chat.
 *
 * Messages are encrypted in the browser, so the client is the one that spots a URL and asks for
 * its preview. That makes this endpoint a fetcher of user-supplied URLs, so it is locked down:
 * http(s) only, DNS resolved up front and private / loopback / link-local addresses refused
 * (SSRF), redirects re-checked the same way, hard timeout, and only the first chunk of an HTML
 * response is parsed.
 */
import dns from 'node:dns/promises';
import net from 'node:net';

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
}

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 300;

const cache = new Map<string, { at: number; preview: LinkPreview | null }>();

/** 10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, ::1, fc00::/7, fe80::/10 … */
const isPrivateAddress = (ip: string): boolean => {
  const type = net.isIP(ip);
  if (type === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (type === 6) {
    const v = ip.toLowerCase();
    return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:');
  }
  return true;
};

const assertPublicHost = async (hostname: string) => {
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error('private address');
    return;
  }
  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) throw new Error('private address');
};

const decodeEntities = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();

/** `<meta property="og:title" content="…">` in either attribute order */
const metaTag = (html: string, name: string): string => {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i'),
  ];
  for (const re of patterns) {
    const match = re.exec(html);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return '';
};

/** Read at most MAX_BYTES of the body - previews live in the <head>. */
const readHead = async (res: Response): Promise<string> => {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
      if (size >= MAX_BYTES) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8');
};

/** null when the URL is not fetchable, not public, or not an HTML page. */
export const fetchLinkPreview = async (raw: string): Promise<LinkPreview | null> => {
  const hit = cache.get(raw);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.preview;

  const remember = (preview: LinkPreview | null) => {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(raw, { at: Date.now(), preview });
    return preview;
  };

  try {
    let target = new URL(raw);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return remember(null);

    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicHost(target.hostname);
      res = await fetch(target.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': 'NestStay-chat-link-preview/1.0', Accept: 'text/html,application/xhtml+xml' },
      });
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        target = new URL(location, target);
        await res.body?.cancel().catch(() => {});
        continue;
      }
      break;
    }
    if (!res || !res.ok) return remember(null);
    if (!(res.headers.get('content-type') ?? '').includes('text/html')) return remember(null);

    const html = await readHead(res);
    const title = metaTag(html, 'og:title') || metaTag(html, 'twitter:title') || decodeEntities(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? '');
    const image = metaTag(html, 'og:image') || metaTag(html, 'twitter:image');
    if (!title && !image) return remember(null);

    return remember({
      url: target.toString(),
      title: title.slice(0, 200),
      description: (metaTag(html, 'og:description') || metaTag(html, 'description') || metaTag(html, 'twitter:description')).slice(0, 300),
      image: image ? new URL(image, target).toString() : null,
      siteName: (metaTag(html, 'og:site_name') || target.hostname.replace(/^www\./, '')).slice(0, 80),
    });
  } catch {
    return remember(null);
  }
};
