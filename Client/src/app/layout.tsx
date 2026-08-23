import type { Metadata } from 'next';
import Providers from './providers';
import TopProgress from '@/components/TopProgress/TopProgress';
import AntdRegistry from '@/lib/AntdRegistry';
import './globals.css';

export const metadata: Metadata = {
   title: 'Find House — Booking your stay',
   description:
      'Hand-picked apartments and homestays across Vietnam — transparent pricing, instant booking and hosts who care.',
   icons: { icon: '/logo.png' },
};

export default function RootLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   // Browser extensions (Grammarly, MDL-based ones, dark-mode toggles) inject
   // attributes/classes into <html> and <body> before React hydrates — those
   // mismatches are not ours to fix, so silence them at both levels.
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
