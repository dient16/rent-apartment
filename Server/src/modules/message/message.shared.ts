import { env } from '@/config/env.config';

const { SERVER_URL } = env;

export const toAvatarUrl = (avatar?: string) =>
  avatar && !avatar.startsWith('http') ? `${SERVER_URL}/api/image/${avatar}` : avatar;

/** Group raw reactions into [{emoji, count, mine}] */
export const groupReactions = (reactions: any[] = [], userId: string) => {
  const grouped: Record<string, { emoji: string; count: number; mine: boolean }> = {};
  for (const reaction of reactions) {
    if (!grouped[reaction.emoji]) {
      grouped[reaction.emoji] = { emoji: reaction.emoji, count: 0, mine: false };
    }
    grouped[reaction.emoji].count += 1;
    if (String(reaction.user) === String(userId)) grouped[reaction.emoji].mine = true;
  }
  return Object.values(grouped);
};

/** The other participant of a 2-person conversation */
export const pickPartner = (conversation: any, userId: string) => {
  const partner = (conversation.participants as any[]).find(
    (participant) => String(participant._id ?? participant) !== String(userId)
  );
  if (!partner || !partner._id) return null;
  return {
    _id: partner._id,
    firstname: partner.firstname,
    lastname: partner.lastname,
    avatar: toAvatarUrl(partner.avatar),
  };
};
