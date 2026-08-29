'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { FiExternalLink } from 'react-icons/fi';
import { apiChatLinkPreview } from '@/apis/chat.api';

/** first http(s) link in a message body */
export const firstUrl = (text: string): string | null => {
   const match = /https?:\/\/[^\s<>"']+/i.exec(text);
   if (!match) return null;
   // drop trailing punctuation people type after a link
   return match[0].replace(/[),.;!?]+$/, '');
};

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Inside a plain-text run: turn `@Name` into a chip (only for real member names) and mark the
 * in-room search term.
 */
const decorate = (text: string, mine?: boolean, mentions?: string[], highlight?: string): React.ReactNode => {
   const names = (mentions ?? []).filter(Boolean).sort((a, b) => b.length - a.length);
   const term = highlight?.trim() ?? '';
   const patterns = [...(names.length ? [`@(?:${names.map(escapeRe).join('|')})`] : []), ...(term ? [escapeRe(term)] : [])];
   if (!patterns.length) return text;
   return text.split(new RegExp(`(${patterns.join('|')})`, 'gi')).map((part, i) => {
      if (!part) return null;
      if (part.startsWith('@') && names.some((n) => `@${n}`.toLowerCase() === part.toLowerCase())) {
         return (
            <span key={i} className={clsx('font-semibold rounded px-0.5', mine ? 'text-white bg-white/25' : 'text-blue-700 bg-blue-50')}>
               {part}
            </span>
         );
      }
      if (term && part.toLowerCase() === term.toLowerCase()) {
         return (
            <mark key={i} className="px-0.5 text-gray-900 bg-amber-200 rounded">
               {part}
            </mark>
         );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
   });
};

/** Message text with its links turned into anchors, @mentions chipped and search hits marked. */
export const Linkified: React.FC<{ text: string; mine?: boolean; mentions?: string[]; highlight?: string }> = ({ text, mine, mentions, highlight }) => {
   const parts = text.split(/(https?:\/\/[^\s<>"']+)/gi);
   return (
      <>
         {parts.map((part, i) =>
            /^https?:\/\//i.test(part) ? (
               <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={(e) => e.stopPropagation()}
                  className={clsx('underline break-all', mine ? 'text-white hover:text-blue-100' : 'text-blue-600 hover:text-blue-700')}
               >
                  {part}
               </a>
            ) : (
               <React.Fragment key={i}>{decorate(part, mine, mentions, highlight)}</React.Fragment>
            ),
         )}
      </>
   );
};

/** Card with the page title / description / image, fetched through the server. */
const LinkPreview: React.FC<{ url: string; mine?: boolean }> = ({ url, mine }) => {
   const { data } = useQuery({
      queryKey: ['chat-link-preview', url],
      queryFn: () => apiChatLinkPreview(url),
      staleTime: 30 * 60_000,
      retry: false,
   });
   const preview = data?.data;
   if (!preview) return null;

   return (
      <a
         href={preview.url}
         target="_blank"
         rel="noopener noreferrer nofollow"
         onClick={(e) => e.stopPropagation()}
         className={clsx(
            'block overflow-hidden mt-1.5 max-w-[320px] rounded-xl border no-underline transition-colors',
            mine ? 'bg-white/10 border-white/25 hover:bg-white/20' : 'bg-gray-50 border-gray-200 hover:bg-gray-100',
         )}
      >
         {preview.image && (
            // remote thumbnail: next/image would need every host allow-listed
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.image} alt="" className="object-cover w-full h-[150px]" loading="lazy" />
         )}
         <div className="px-3 py-2">
            <p className={clsx('flex gap-1 items-center text-[11px] font-semibold uppercase tracking-wide', mine ? 'text-blue-100' : 'text-gray-400')}>
               <FiExternalLink size={10} /> {preview.siteName}
            </p>
            <p className={clsx('mt-0.5 text-sm font-semibold leading-snug line-clamp-2', mine ? 'text-white' : 'text-gray-900')}>{preview.title}</p>
            {preview.description && (
               <p className={clsx('mt-0.5 text-xs leading-snug line-clamp-2', mine ? 'text-blue-50/90' : 'text-gray-500')}>{preview.description}</p>
            )}
         </div>
      </a>
   );
};

export default LinkPreview;
