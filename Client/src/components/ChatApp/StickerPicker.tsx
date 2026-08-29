'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Input } from 'antd';
import clsx from 'clsx';
import { FiSearch } from 'react-icons/fi';

type PackItem = string | { id: string; name: string };

interface StickerPack {
   id: string;
   name: string;
   /** local packs: file extension shared by every item */
   ext?: string;
   /** CDN packs: url template with `{cp}` */
   cdn?: string;
   items: PackItem[];
}

const NOTO_CDN = 'https://fonts.gstatic.com/s/e/notoemoji/latest/{cp}/512.webp';
const itemId = (item: PackItem) => (typeof item === 'string' ? item : item.id);
const itemName = (item: PackItem) => (typeof item === 'string' ? item : item.name);

/** animated first, then the rest of the downloaded packs */
const PACK_ORDER = ['animated', 'fun', 'hands', 'noto', '3d'];

let cachedPacks: StickerPack[] = [];

/**
 * Sticker id -> image URL. Local packs live in `/stickers/<pack>/<name>.<ext>`; CDN packs
 * expand their template.
 */
export const stickerUrl = (id: string, packs: StickerPack[] = cachedPacks) => {
   if (id.startsWith('https://')) return id;
   const [packId, name] = id.split('/');
   const pack = packs.find((p) => p.id === packId);
   const cdn = pack?.cdn ?? (packId === 'noto' ? NOTO_CDN : undefined);
   if (cdn) return cdn.replace('{cp}', name);
   if (/\.(webp|gif|png)$/.test(name)) return `/stickers/${packId}/${name}`;
   return `/stickers/${packId}/${name}.${pack?.ext ?? (packId === 'animated' ? 'webp' : 'png')}`;
};

/** Fetch packs.json once (called on chat mount so message stickers resolve before the tray opens). */
export const loadPacks = async (): Promise<StickerPack[]> => {
   if (cachedPacks.length) return cachedPacks;
   const res = await fetch('/stickers/packs.json');
   const data = (await res.json()) as { packs: StickerPack[] };
   cachedPacks = [...data.packs].sort((a, b) => {
      const rank = (p: StickerPack) => PACK_ORDER.indexOf(p.id) + 1 || 99;
      return rank(a) - rank(b);
   });
   return cachedPacks;
};

/**
 * A sticker in the message list: shimmer + spinner while the (often 300-500 KB animated)
 * file loads, and never a broken-image icon.
 */
export const Sticker: React.FC<{ id: string; size?: number; className?: string }> = ({ id, size = 160, className }) => {
   const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
   const src = stickerUrl(id);
   return (
      <span className={clsx('inline-block relative', className)} style={{ width: size, height: size }}>
         {state === 'loading' && (
            <span className="flex absolute inset-0 justify-center items-center bg-gray-200/60 rounded-2xl animate-pulse">
               <span className="w-8 h-8 rounded-full border-[3px] border-blue-500 border-t-transparent animate-spin" aria-label="Loading sticker" />
            </span>
         )}
         {state === 'error' ? (
            <span className="flex absolute inset-0 justify-center items-center text-3xl bg-gray-100 rounded-2xl">🙂</span>
         ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
               src={src}
               alt=""
               width={size}
               height={size}
               onLoad={() => setState('ready')}
               onError={() => setState('error')}
               className={clsx('w-full h-full object-contain drop-shadow-lg transition-opacity duration-200', state === 'ready' ? 'opacity-100' : 'opacity-0')}
            />
         )}
      </span>
   );
};

/** Search words -> the slugs the sticker files use, so "happy" also finds "grin" */
const SYNONYMS: Record<string, string[]> = {
   happy: ['grin', 'joy', 'laugh', 'smile', 'giggle', 'partying'],
   funny: ['rofl', 'joy', 'laugh', 'zany', 'clown'],
   sad: ['cry', 'tear', 'pleading', 'loudly_crying'],
   love: ['heart', 'hearts', 'kiss', 'cupid', 'two_hearts', 'sparkling_heart'],
   angry: ['angry', 'steam', 'cursing', 'devil'],
   sleep: ['sleep', 'tired', 'yawn'],
   like: ['thumbs_up', 'ok_hand', 'clap'],
   dislike: ['thumbs_down'],
   thanks: ['pray', 'hug', 'clap'],
   party: ['party', 'partying', 'balloon', 'gift', 'cake', 'sparkles'],
   food: ['pizza', 'burger', 'noodles', 'fries', 'donut', 'cookie', 'taco', 'hotdog', 'cake', 'ice_cream', 'sushi', 'pancakes'],
   drink: ['coffee', 'cheers', 'wine', 'honey'],
   money: ['money_wings', 'money_face', 'gem'],
   animal: ['cat', 'panda', 'fox', 'bear', 'lion', 'penguin', 'frog', 'turtle', 'whale', 'dolphin', 'octopus', 'shark', 'bee', 'butterfly'],
   cool: ['cool', 'cowboy', 'smirk', 'star_struck', 'fire'],
   sick: ['sick', 'mask', 'nauseated', 'bandage', 'dizzy'],
   weather: ['sun_face', 'cloud', 'rainbow', 'snowflake', 'snowman', 'tornado', 'wave'],
   sport: ['soccer', 'basketball', 'trophy', 'target'],
   work: ['laptop', 'phone', 'camera', 'key', 'lock', 'alarm', 'hourglass', 'bulb'],
   hi: ['wave', 'handshake'],
   shock: ['mind_blown', 'scream', 'fearful', 'eyes'],
   ghost: ['ghost', 'skull', 'alien', 'robot', 'clown'],
};

/** lowercase, letters and digits only, so "Star-struck!" matches "starstruck" */
const fold = (value: string) =>
   value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');

interface StickerPickerProps {
   onPick: (stickerId: string) => void;
}

/** Sticker tray: animated pack first, then 3D, with search across every pack. */
const StickerPicker: React.FC<StickerPickerProps> = ({ onPick }) => {
   const [packs, setPacks] = useState<StickerPack[]>(cachedPacks);
   const [active, setActive] = useState<string>(cachedPacks[0]?.id ?? '');
   const [query, setQuery] = useState('');

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

   /** searching looks through every pack, so a keyword finds stickers wherever they live */
   const results = useMemo(() => {
      const q = fold(query);
      if (!q) return null;
      const extra = Object.entries(SYNONYMS)
         .filter(([key]) => key.startsWith(q) || q.startsWith(key))
         .flatMap(([, slugs]) => slugs);
      const hit = (name: string) => {
         const folded = fold(name);
         return folded.includes(q) || extra.some((slug) => folded.includes(fold(slug)));
      };
      return packs.flatMap((p) => p.items.filter((item) => hit(itemName(item)) || hit(itemId(item))).map((item) => `${p.id}/${itemId(item)}`));
   }, [query, packs]);

   const pack = packs.find((p) => p.id === active);
   const shown = results ?? (pack ? pack.items.map((item) => `${pack.id}/${itemId(item)}`) : []);

   return (
      <div className="w-[320px] max-w-[calc(100vw-32px)] font-main">
         <Input
            allowClear
            size="small"
            prefix={<FiSearch className="text-gray-400" />}
            placeholder="Search stickers: happy, love, fire, food…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2 h-8 rounded-lg"
         />

         {!results && (
            <div className="flex gap-1 mb-2">
               {packs.map((p) => (
                  <button
                     key={p.id}
                     type="button"
                     onClick={() => setActive(p.id)}
                     className={clsx(
                        'px-3 py-1 text-xs font-semibold rounded-full border-none cursor-pointer',
                        p.id === active ? 'text-white bg-blue-600' : 'text-gray-600 bg-gray-100 hover:bg-gray-200',
                     )}
                  >
                     {p.name}
                  </button>
               ))}
            </div>
         )}

         <div className="grid overflow-y-auto grid-cols-4 gap-1 max-h-[280px]">
            {shown.map((id) => (
               <button
                  key={id}
                  type="button"
                  onClick={() => onPick(id)}
                  className="flex justify-center items-center p-1 bg-transparent rounded-xl border-none transition-transform cursor-pointer hover:bg-gray-100 hover:scale-110"
                  aria-label={id.split('/')[1]}
               >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={stickerUrl(id, packs)} alt="" width={64} height={64} loading="lazy" className="w-16 h-16 object-contain" />
               </button>
            ))}
            {results && !results.length && <p className="col-span-4 py-6 text-xs text-center text-gray-400">No stickers match that search</p>}
         </div>
      </div>
   );
};

export default StickerPicker;
