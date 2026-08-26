import type { Metadata } from 'next';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
   title: 'About us',
   description: 'NestStay connects travelers with hand-picked apartments and homestays across Vietnam - our story, mission and the team behind the platform.',
   alternates: { canonical: '/about' },
};

export default function Page() {
   return <AboutClient />;
}
