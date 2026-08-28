import { env } from '@/config/env.config';

export interface TenorSticker {
  id: string;
  /** animated (gif) - what gets stored in the message */
  url: string;
  /** small preview for the picker grid */
  preview: string;
  width: number;
  height: number;
}

const TENOR_URL = 'https://tenor.googleapis.com/v2';

export const tenorEnabled = () => !!env.TENOR_API_KEY;

/**
 * Transparent animated stickers from Tenor (Google). Empty query = trending "cute" set.
 * The API key stays on the server; the client only sees media URLs.
 */
export const searchTenorStickers = async (q: string, limit: number): Promise<TenorSticker[]> => {
  if (!tenorEnabled()) return [];
  const params = new URLSearchParams({
    key: env.TENOR_API_KEY,
    client_key: 'neststay-chat',
    q: q || 'cute',
    searchfilter: 'sticker',
    media_filter: 'gif,tinygif',
    contentfilter: 'high',
    locale: 'vi_VN',
    limit: String(limit),
  });
  const res = await fetch(`${TENOR_URL}/search?${params}`, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Tenor ${res.status}`);
  const data = (await res.json()) as { results?: any[] };
  return (data.results ?? [])
    .map((r) => {
      const gif = r.media_formats?.gif;
      const tiny = r.media_formats?.tinygif ?? gif;
      return gif?.url
        ? { id: String(r.id), url: String(gif.url), preview: String(tiny.url), width: Number(gif.dims?.[0] ?? 0), height: Number(gif.dims?.[1] ?? 0) }
        : null;
    })
    .filter((s): s is TenorSticker => !!s);
};
