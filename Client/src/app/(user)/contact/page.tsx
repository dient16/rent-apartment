import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
   title: 'Contact us',
   description: 'Questions about a booking or hosting on NestStay? Reach our support team by email, phone or the contact form.',
   alternates: { canonical: '/contact' },
};

export default function Page() {
   return <ContactClient />;
}
