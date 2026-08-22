import type { Metadata } from 'next';
import Providers from './providers';
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
   return (
      <html lang="en">
         <body>
            <Providers>{children}</Providers>
         </body>
      </html>
   );
}
