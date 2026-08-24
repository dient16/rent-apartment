import { reviewRepository } from './review.repository';

/** Users who booked a room of this apartment (confirmed/completed) get a "Verified stay" badge */
export const findVerifiedEmails = async (apartmentId: string, emails: string[]): Promise<Set<string>> => {
  if (emails.length === 0) return new Set();
  const apartment = await reviewRepository.findApartmentRooms(apartmentId);
  if (!apartment?.rooms?.length) return new Set();
  const bookings = await reviewRepository.findBookedEmails(emails, apartment.rooms);
  return new Set(bookings.map((b) => b.email));
};

/** Only guests with a confirmed/completed booking of this apartment may review it */
export const hasStayed = async (apartmentId: string, email?: string | null): Promise<boolean> => {
  if (!email) return false;
  return (await findVerifiedEmails(apartmentId, [email])).size > 0;
};
