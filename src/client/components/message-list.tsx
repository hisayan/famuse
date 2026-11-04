import { useEffect, useRef, useState } from 'react';
import { Bot } from 'lucide-react';
import type { Attachment, ChatMessage } from '../../shared/types';
import { formatClockTime } from '../../shared/format';
import { cn } from '../lib/cn';
import type { TypingPeer } from '../hooks/use-room';
import { Avatar, Badge } from './ui';
import { Markdown } from './markdown';
import { Lightbox } from './lightbox';

function Attachments({ items }: { items: Attachment[] }) {
  const [lightbox, setLightbox] = useState<Attachment | null>(null);
  if (items.length === 0) return null;
  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) =>
          item.contentType.startsWith('image/') ? (
            <button
              key={item.key}
              type="button"
              onClick={() => setLightbox(item)}
              title={`Enlarge ${item.name}`}
              aria-label={`Enlarge image ${item.name}`}
              className="cursor-zoom-in overflow-hidden rounded-lg border border-stone-200 transition-shadow hover:shadow-md dark:border-stone-700"
            >
              <img src={item.url} alt={item.name} className="max-h-48 max-w-full object-cover" loading="lazy" />
            </button>
          ) : (
            <a
              key={item.key}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              title={item.name}
              className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700"
            >
              <span className="block px-3 py-2 text-[13px] underline">{item.name}</span>
            </a>
          ),
        )}
      </div>
      {lightbox && <Lightbox attachment={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

function MessageBubble({
  message,
  showHeader,
  pending,
}: {
  message: ChatMessage;
  showHeader: boolean;
  pending: boolean;
}) {
  if (message.isAi) {
    return (
      <div className={cn(pending && 'opacity-70')}>
        <div className="flex items-center gap-2">
          <Avatar name="famuse" ai className="size-7 text-xs" />
          <span className="text-sm font-semibold">famuse</span>
          <Badge variant="ai">
            <Bot /> AI Butler
          </Badge>
          <time className="text-xs tabular-nums text-stone-500 dark:text-stone-400">
            {formatClockTime(message.createdAt)}
          </time>
        </div>
        <div className="ml-9 mt-1.5 rounded-xl rounded-tl-md border border-violet-500/25 bg-emerald-50/60 px-3.5 py-2.5 dark:border-violet-400/20 dark:bg-emerald-950/40">
          <Markdown text={message.text} className="text-[14px] leading-6" />
          <Attachments items={message.attachments} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2.5', pending && 'opacity-70')}>
      <div className="w-7 shrink-0 pt-0.5">
        {showHeader && <Avatar name={message.senderName} className="size-7 text-xs" />}
      </div>
      <div className="min-w-0 flex-1">
        {showHeader && (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold">{message.senderName}</span>
            <time className="text-xs tabular-nums text-stone-500 dark:text-stone-400">
              {formatClockTime(message.createdAt)}
            </time>
            {pending && (
              <span className="text-xs italic text-stone-400 dark:text-stone-500">Sending…</span>
            )}
          </div>
        )}
        <div
          className={cn(
            'mt-0.5 inline-block max-w-full rounded-xl px-3 py-1.5',
            showHeader ? 'rounded-tl-md' : 'rounded-tl-md',
            'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-stone-200/80 dark:bg-stone-900 dark:ring-stone-800',
          )}
        >
          <Markdown text={message.text} className="text-[14px] leading-6" />
        </div>
        <Attachments items={message.attachments} />
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  pendingIds,
  typing,
}: {
  messages: ChatMessage[];
  pendingIds: string[];
  typing: TypingPeer[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const node = scrollRef.current;
    if (node && stickToBottom.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages.length, typing.length]);

  function handleScroll() {
    const node = scrollRef.current;
    if (!node) return;
    stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      role="log"
      aria-label="Messages"
      className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
    >
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium">Nothing here yet.</p>
          <p className="max-w-xs text-[13px] text-stone-500 dark:text-stone-400">
            Start the conversation — mention <span className="font-medium text-emerald-700 dark:text-emerald-400">@famuse</span> any
            time you need a hand.
          </p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-3xl gap-4">
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const showHeader =
              !previous ||
              previous.senderId !== message.senderId ||
              message.createdAt - previous.createdAt > 5 * 60_000 ||
              message.isAi;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                showHeader={showHeader}
                pending={pendingIds.includes(message.id)}
              />
            );
          })}
          {typing.length > 0 && (
            <p className="text-[13px] italic text-stone-500 dark:text-stone-400" aria-live="polite">
              {typing.map((peer) => peer.name).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing
              <span className="typing-dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
