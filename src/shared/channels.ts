export interface ChannelInfo {
  id: string;
  /** Short label shown after the "#" prefix. */
  name: string;
  /** Human-readable title used in headers. */
  title: string;
  description: string;
}

export const CHANNELS: ChannelInfo[] = [
  {
    id: 'living-room',
    name: 'living-room',
    title: 'Living Room',
    description: 'Everyday family chatter and plans.',
  },
  {
    id: 'groceries',
    name: 'groceries',
    title: 'Groceries',
    description: 'Shopping lists and pantry tracking.',
  },
  {
    id: 'pet-care',
    name: 'pet-care',
    title: 'Pet Care',
    description: 'Buddy the Golden Retriever: walks, meals, and potty breaks.',
  },
  {
    id: 'announcements',
    name: 'announcements',
    title: 'Announcements',
    description: 'Important household updates.',
  },
];

export type ChannelId = (typeof CHANNELS)[number]['id'];

export function isChannelId(value: string): value is ChannelId {
  return CHANNELS.some((channel) => channel.id === value);
}

export function getChannel(id: string): ChannelInfo | undefined {
  return CHANNELS.find((channel) => channel.id === id);
}
