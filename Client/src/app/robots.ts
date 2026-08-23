import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';

export default function robots(): MetadataRoute.Robots {
   return {
      rules: {
         userAgent: '*',
         allow: '/',
         // Private, user-specific areas carry no SEO value
         disallow: ['/host/', '/account-settings/', '/messages', '/my-booking', '/notifications', '/favorites', '/booking-confirm'],
      },
      sitemap: `${SITE_URL}/sitemap.xml`,
   };
}
