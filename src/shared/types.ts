export type MemberRole = 'admin' | 'member' | 'agent';

export interface Household {
  id: string;
  name: string;
  pinnedRecipeTitle: string | null;
  pinnedRecipeDetail: string | null;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  /** Better Auth user id once a real sign-in is linked, otherwise null. */
  userId: string | null;
  name: string;
  role: MemberRole;
  /** Seeded status line, e.g. "Home" or "Commuting". */
  status: string;
}

export interface Attachment {
  key: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  text: string;
  isAi: boolean;
  attachments: Attachment[];
  /** Unix epoch milliseconds. */
  createdAt: number;
}

export interface HouseholdTask {
  id: string;
  householdId: string;
  title: string;
  assigneeMemberId: string | null;
  assigneeName: string | null;
  done: boolean;
}

export interface OnlinePresence {
  memberId: string;
  name: string;
}

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';
