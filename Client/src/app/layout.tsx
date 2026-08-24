import type { Metadata } from 'next';
import Providers from './providers';
import TopProgress from '@/components/TopProgress/TopProgress';
import AntdRegistry from '@/lib/AntdRegistry';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';

export const metadata: Metadata = {
   metadataBase: new URL(SITE_URL),
   title: {
      default: 'Find House — Booking your stay',
      template: '%s | Find House',
   },
   description:
      'Hand-picked apartments and homestays across Vietnam — transparent pricing, instant booking and hosts who care.',
   icons: { icon: '/logo.png' },
   openGraph: {
      siteName: 'Find House',
      type: 'website',
      locale: 'vi_VN',
      images: ['/logo.png'],
   },
   twitter: { card: 'summary_large_image' },
   robots: { index: true, follow: true },
};

export default function RootLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   // Browser extensions mutate <html>/<body> before React hydrates.
   return (
      <html lang="en" suppressHydrationWarning>
         <body suppressHydrationWarning>
            <AntdRegistry>
               <TopProgress />
               <Providers>{children}</Providers>
            </AntdRegistry>
         </body>
      </html>
   );
}
