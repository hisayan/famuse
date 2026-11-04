import { defineRoom } from 'void/ws';
import { isChannelId } from '../../src/shared/channels';
import {
  ClientRoomEventSchema,
  ServerRoomEventSchema,
  type ServerRoomEvent,
} from '../../src/shared/room-events';
import {
  buildContextPayload,
  buildPresence,
  findMembership,
  handleCatchUpRequest,
  handleIncomingUserMessage,
  type RoomConnectionState,
  type RoomIO,
} from '../../src/server/room-pipeline';

/**
 * FamilyRoom: one hibernating Durable Object instance per channel, managed by
 * Void's typed room runtime. It persists recent messages, runs the plugin
 * pipeline, and answers @famuse mentions via the Meta Model API.
 */
export default defineRoom({
  name: 'family-room',
  messages: {
    client: ClientRoomEventSchema,
    server: ServerRoomEventSchema,
  },

  async onBeforeConnect(ctx) {
    const channelId = ctx.params.channel ?? '';
    if (!isChannelId(channelId)) {
      return new Response('Unknown channel.', { status: 404 });
    }
    if (!ctx.user) {
      return new Response('Sign in to join the family room.', { status: 401 });
    }
    const membership = await findMembership(ctx.env.DB, ctx.user.id);
    if (!membership) {
      return new Response('Join the household before connecting.', { status: 403 });
    }
  },

  async onConnect(ctx) {
    if (!ctx.user) {
      ctx.connection.close(4401, 'Sign in to join the family room.');
      return;
    }
    const membership = await findMembership(ctx.env.DB, ctx.user.id);
    if (!membership) {
      ctx.connection.close(4403, 'Join the household before connecting.');
      return;
    }
    const state: RoomConnectionState = { ...membership };
    ctx.connection.setState(state);
    await ctx.room.broadcast({
      type: 'room.presence',
      online: buildPresence(ctx.room.getConnections()),
    });
  },

  async onMessage(ctx, event) {
    const channelId = ctx.params.channel ?? '';
    const state = ctx.connection.state as RoomConnectionState | null | undefined;
    if (!ctx.user || !state || !isChannelId(channelId)) {
      ctx.connection.close(4403, 'Household membership required.');
      return;
    }
    const io: RoomIO = {
      broadcast: (roomEvent: ServerRoomEvent, excludeIds?: string[]) =>
        ctx.room.broadcast(roomEvent, excludeIds),
      send: (roomEvent: ServerRoomEvent) => ctx.connection.send(roomEvent),
    };
    const env = ctx.env as unknown as Record<string, unknown>;

    switch (event.type) {
      case 'room.message.send': {
        try {
          await handleIncomingUserMessage({
            db: ctx.env.DB,
            storage: ctx.storage,
            io,
            env,
            channelId,
            membership: state,
            input: {
              id: event.id,
              text: event.text,
              attachments: event.attachments ?? [],
            },
          });
        } catch (error) {
          console.error('[famuse] Failed to handle inbound message.', error);
          await ctx.connection.send({
            type: 'room.error',
            message: 'Could not deliver your message. Please try again.',
          });
        }
        break;
      }
      case 'room.typing': {
        await ctx.room.broadcast(
          {
            type: 'room.typing',
            memberId: state.memberId,
            name: state.memberName,
            typing: event.typing,
          },
          [ctx.connection.id],
        );
        break;
      }
      case 'room.context.request': {
        const payload = await buildContextPayload(channelId, ctx.storage);
        await ctx.connection.send({
          type: 'room.context',
          summaries: payload.summaries,
          quickActions: payload.quickActions,
        });
        break;
      }
      case 'room.catchup.request': {
        try {
          await handleCatchUpRequest({
            db: ctx.env.DB,
            io,
            env,
            channelId,
            membership: state,
          });
        } catch (error) {
          console.error('[famuse] Failed to build catch-up.', error);
          await ctx.connection.send({
            type: 'room.error',
            message: 'Could not build your catch-up. Please try again.',
          });
        }
        break;
      }
    }
  },

  async onClose(ctx) {
    const remaining = [...ctx.room.getConnections()].filter(
      (connection) => connection.id !== ctx.connection.id,
    );
    await ctx.room.broadcast({
      type: 'room.presence',
      online: buildPresence(remaining),
    });
  },
});
