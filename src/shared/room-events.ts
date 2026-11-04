import { z } from 'zod';

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const AttachmentSchema = z.object({
  key: z.string().min(1).max(500),
  url: z.string().min(1).max(2000),
  name: z.string().min(1).max(200),
  contentType: z.string().max(120),
  size: z.number().int().nonnegative().max(MAX_ATTACHMENT_BYTES),
});

export const ChatMessageSchema = z.object({
  id: z.string().min(1).max(100),
  channelId: z.string().min(1).max(100),
  senderId: z.string().min(1).max(100),
  senderName: z.string().min(1).max(100),
  text: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  isAi: z.boolean(),
  attachments: z.array(AttachmentSchema).max(MAX_ATTACHMENTS_PER_MESSAGE),
  createdAt: z.number().int().nonnegative(),
});

export const QuickActionSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  iconName: z.string().min(1).max(100),
  actionText: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

const ContextSummariesSchema = z.record(z.string(), z.unknown());

/** Events a browser client may send to a family room. */
export const ClientRoomEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('room.message.send'),
    id: z.string().min(1).max(100),
    text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
    attachments: z.array(AttachmentSchema).max(MAX_ATTACHMENTS_PER_MESSAGE).default([]),
  }),
  z.object({
    type: z.literal('room.typing'),
    typing: z.boolean(),
  }),
  z.object({
    type: z.literal('room.context.request'),
  }),
  z.object({
    type: z.literal('room.catchup.request'),
  }),
]);

/** Events a family room may send to browser clients. */
export const ServerRoomEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('room.message.new'),
    message: ChatMessageSchema,
  }),
  z.object({
    type: z.literal('room.presence'),
    online: z.array(z.object({ memberId: z.string(), name: z.string() })),
  }),
  z.object({
    type: z.literal('room.typing'),
    memberId: z.string(),
    name: z.string(),
    typing: z.boolean(),
  }),
  z.object({
    type: z.literal('room.context'),
    summaries: ContextSummariesSchema,
    quickActions: z.array(QuickActionSchema),
  }),
  z.object({
    type: z.literal('room.context.updated'),
    summaries: ContextSummariesSchema,
  }),
  z.object({
    type: z.literal('room.catchup.result'),
    text: z.string().min(1).max(8000),
  }),
  z.object({
    type: z.literal('room.error'),
    message: z.string().min(1).max(1000),
  }),
]);

export type ClientRoomEvent = z.infer<typeof ClientRoomEventSchema>;
export type ServerRoomEvent = z.infer<typeof ServerRoomEventSchema>;
export type RoomChatMessage = z.infer<typeof ChatMessageSchema>;
export type RoomQuickAction = z.infer<typeof QuickActionSchema>;
