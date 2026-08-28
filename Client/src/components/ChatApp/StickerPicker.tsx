'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from 'antd';
import clsx from 'clsx';
import { FiSearch } from 'react-icons/fi';
import { apiChatSearchStickers } from '@/apis/chat.api';
import { useDebounce } from '@/hooks';

type PackItem = string | { id: string; name: string };
interface StickerPack {
   id: string;
   name: string;
   /** local packs: file extension; CDN packs use `cdn` instead */
   ext?: string;
   /** URL template with `{cp}` (e.g. Google Noto animated emoji), items are codepoints */
   cdn?: string;
   items: PackItem[];
}

const NOTO_CDN = 'https://fonts.gstatic.com/s/e/notoemoji/latest/{cp}/512.webp';
const itemId = (item: PackItem) => (typeof item === 'string' ? item : item.id);
const itemName = (item: PackItem) => (typeof item === 'string' ? item : item.name);

/**
 * Sticker id -> image URL. Local packs: `/stickers/<pack>/<name>.<ext>`; CDN packs (Noto
 * animated emoji) expand their template; Tenor picks are stored as their media URL.
 */
export const stickerUrl = (id: string, packs: StickerPack[] = cachedPacks) => {
   if (id.startsWith('https://')) return id;
   const [packId, name] = id.split('/');
   const pack = packs.find((p) => p.id === packId);
   const cdn = pack?.cdn ?? (packId === 'noto' ? NOTO_CDN : undefined);
   if (cdn) return cdn.replace('{cp}', name);
   // mixed packs list items as "name.ext" (see scripts/chat/build-sticker-packs.js)
   if (/\.(webp|gif|png)$/.test(name)) return `/stickers/${packId}/${name}`;
   return `/stickers/${packId}/${name}.${pack?.ext ?? 'png'}`;
};

let cachedPacks: StickerPack[] = [];
const loadPacks = async (): Promise<StickerPack[]> => {
   if (cachedPacks.length) return cachedPacks;
   const res = await fetch('/stickers/packs.json');
   const data = (await res.json()) as { packs: StickerPack[] };
   cachedPacks = data.packs;
   return cachedPacks;
};

interface StickerPickerProps {
   onPick: (stickerId: string) => void;
}

const TENOR_TAB = '__tenor__';

/** Sticker tray: local packs (Noto animated, Fluent 3D) + a Tenor search tab when the server has a key. */
const StickerPicker: React.FC<StickerPickerProps> = ({ onPick }) => {
   const [packs, setPacks] = useState<StickerPack[]>(cachedPacks);
   const [active, setActive] = useState<string>(cachedPacks[0]?.id ?? '');
   const [query, setQuery] = useState('');
   const debounced = useDebounce(query, 350);

   useEffect(() => {
      let cancelled = false;
      loadPacks().then((p) => {
         if (cancelled) return;
         setPacks(p);
         setActive((current) => current || p[0]?.id || '');
      });
      return () => {
         cancelled = true;
      };
   }, []);

   // One cheap probe tells us whether the GIF tab exists; results are cached per query.
   const tenor = useQuery({
      queryKey: ['chat-tenor', active === TENOR_TAB ? debounced : ''],
      queryFn: () => apiChatSearchStickers(active === TENOR_TAB ? debounced : ''),
      staleTime: 5 * 60_000,
   });
   const tenorEnabled = tenor.data?.data?.enabled ?? false;
   const tenorStickers = tenor.data?.data?.stickers ?? [];

   const tabs = [...packs.map((p) => ({ id: p.id, name: p.name })), ...(tenorEnabled ? [{ id: TENOR_TAB, name: 'GIF' }] : [])];
   const pack = packs.find((p) => p.id === active);

   return (
      <div className="w-[320px] max-w-[calc(100vw-32px)] font-main">
         <div className="flex gap-1 mb-2">
            {tabs.map((t) => (
               <button
                  key={t.id}
                  type="button"
                  onClick={() => setActive(t.id)}
                  className={clsx(
                     'px-3 py-1 text-xs font-semibold rounded-full border-none cursor-pointer',
                     t.id === active ? 'text-white bg-blue-600' : 'text-gray-600 bg-gray-100 hover:bg-gray-200',
                  )}
               >
                  {t.name}
               </button>
            ))}
         </div>

         {active === TENOR_TAB ? (
            <>
               <Input
                  allowClear
                  size="small"
                  prefix={<FiSearch className="text-gray-400" />}
                  placeholder="Search stickers (cute, cat, love…)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="mb-2 h-8 rounded-lg"
               />
               <div className="grid overflow-y-auto grid-cols-3 gap-1 max-h-[280px]">
                  {tenor.isFetching && !tenorStickers.length && <p className="col-span-3 py-6 text-xs text-center text-gray-400">Loading…</p>}
                  {!tenor.isFetching && !tenorStickers.length && <p className="col-span-3 py-6 text-xs text-center text-gray-400">No stickers found</p>}
                  {tenorStickers.map((s) => (
                     <button
                        key={s.id}
                        type="button"
                        onClick={() => onPick(s.url)}
                        className="flex justify-center items-center p-1 bg-transparent rounded-xl border-none transition-transform cursor-pointer hover:bg-gray-100 hover:scale-105"
                        aria-label="sticker"
                     >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.preview} alt="" width={90} height={90} loading="lazy" className="w-[90px] h-[90px] object-contain" />
                     </button>
                  ))}
               </div>
               <p className="mt-1.5 text-[10px] text-right text-gray-400">Powered by Tenor</p>
            </>
         ) : (
            <div className="grid overflow-y-auto grid-cols-4 gap-1 max-h-[280px]">
               {pack?.items.map((item) => {
                  const id = `${pack.id}/${itemId(item)}`;
                  return (
                     <button
                        key={id}
                        type="button"
                        onClick={() => onPick(id)}
                        className="flex justify-center items-center p-1 bg-transparent rounded-xl border-none transition-transform cursor-pointer hover:bg-gray-100 hover:scale-110"
                        aria-label={itemName(item)}
                     >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={stickerUrl(id, packs)} alt={itemName(item)} width={64} height={64} loading="lazy" className="w-16 h-16 object-contain" />
                     </button>
                  );
               })}
            </div>
         )}
      </div>
   );
};

export default StickerPicker;
