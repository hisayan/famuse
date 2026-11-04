import { Hash, Loader2, Newspaper, Users, X } from 'lucide-react';
import { getChannel } from '../../shared/channels';
import type { Attachment, ChatMessage, ConnectionStatus } from '../../shared/types';
import type { RoomQuickAction } from '../../shared/room-events';
import type { TypingPeer } from '../hooks/use-room';
import { Badge, Button } from './ui';
import { Markdown } from './markdown';
import { MessageList } from './message-list';
import { Composer } from './composer';

export function ChannelView({
  channelId,
  status,
  messages,
  pendingIds,
  onlineCount,
  typing,
  quickActions,
  catchUp,
  catchUpPending,
  error,
  onSend,
  onTyping,
  onQuickAction,
  onRequestCatchUp,
  onDismissCatchUp,
  onDismissError,
}: {
  channelId: string;
  status: ConnectionStatus;
  messages: ChatMessage[];
  pendingIds: string[];
  onlineCount: number;
  typing: TypingPeer[];
  quickActions: RoomQuickAction[];
  catchUp: string | null;
  catchUpPending: boolean;
  error: string | null;
  onSend: (text: string, attachments: Attachment[]) => void;
  onTyping: (typing: boolean) => void;
  onQuickAction: (action: RoomQuickAction) => void;
  onRequestCatchUp: () => void;
  onDismissCatchUp: () => void;
  onDismissError: () => void;
}) {
  const channel = getChannel(channelId);
  const connected = status === 'live';

  return (
    <section aria-label="Conversation" className="flex h-full min-w-0 flex-1 flex-col bg-stone-50 dark:bg-stone-950">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-3 dark:border-stone-800 dark:bg-stone-900">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
            <Hash className="size-4 text-stone-400" />
            {channel?.name ?? channelId}
          </h2>
          <p className="truncate text-[13px] text-stone-500 dark:text-stone-400">
            {channel?.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" title="Members currently online">
            <Users /> {onlineCount} online
          </Badge>
          <Button
            variant="ai"
            size="sm"
            onClick={onRequestCatchUp}
            disabled={!connected || catchUpPending}
            title="Ask famuse to summarize recent messages"
          >
            {catchUpPending ? <Loader2 className="animate-spin" /> : <Newspaper />}
            Catch Me Up
          </Button>
        </div>
      </header>

      {error && (
        <div className="shrink-0 px-5 pt-3">
          <div
            role="alert"
            className="mx-auto flex max-w-3xl items-start justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Dismiss error"
              className="rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {(catchUpPending || catchUp) && (
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto max-w-3xl rounded-xl border border-emerald-600/25 bg-white px-4 py-3 shadow-sm dark:border-emerald-500/20 dark:bg-stone-900">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">
                <Newspaper className="size-4" /> Catch-up
              </p>
              <button
                type="button"
                onClick={onDismissCatchUp}
                aria-label="Dismiss catch-up"
                className="rounded p-0.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="size-4" />
              </button>
            </div>
            {catchUpPending ? (
              <p className="flex items-center gap-2 py-2 text-sm text-stone-500">
                <Loader2 className="size-4 animate-spin" /> famuse is reading the room…
              </p>
            ) : (
              catchUp && (
                <div className="max-h-56 overflow-y-auto pt-1">
                  <Markdown text={catchUp} className="text-[13px] leading-6" />
                </div>
              )
            )}
          </div>
        </div>
      )}

      <MessageList messages={messages} pendingIds={pendingIds} typing={typing} />

      {quickActions.length > 0 && (
        <div className="shrink-0 px-5 pb-1">
          <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto py-2" role="toolbar" aria-label="Quick actions">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onQuickAction(action)}
                disabled={!connected}
                title={action.actionText}
                className="shrink-0 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-[13px] font-medium text-stone-700 shadow-sm transition-colors hover:border-emerald-600 hover:text-emerald-800 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <Composer
        channelName={channel?.name ?? channelId}
        disabled={!connected}
        onSend={onSend}
        onTyping={onTyping}
      />
    </section>
  );
}
