import { useEffect, useRef, useState } from 'react';
import { AtSign, ImagePlus, Loader2, Send, X } from 'lucide-react';
import type { Attachment } from '../../shared/types';
import { MAX_ATTACHMENT_BYTES } from '../../shared/room-events';
import { cn } from '../lib/cn';
import { randomId } from '../lib/id';
import { Avatar, Button } from './ui';

const MAX_COMPOSER_HEIGHT = 160;

interface PendingUpload {
  clientId: string;
  name: string;
  previewUrl: string;
}

export interface ComposerInsertRequest {
  text: string;
  nonce: number;
}

export function Composer({
  channelName,
  disabled,
  onSend,
  onTyping,
  insertRequest,
}: {
  channelName: string;
  disabled: boolean;
  onSend: (text: string, attachments: Attachment[]) => void;
  onTyping: (typing: boolean) => void;
  insertRequest?: ComposerInsertRequest | null;
}) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastInsertNonce = useRef(0);

  useEffect(() => {
    if (!insertRequest || insertRequest.nonce === lastInsertNonce.current) return;
    lastInsertNonce.current = insertRequest.nonce;
    insertText(insertRequest.text);
  }, [insertRequest]);

  function autoresize() {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }

  function caretMention(text: string, caret: number): { start: number; query: string } | null {
    const before = text.slice(0, caret);
    const match = /(^|\s)@(\w*)$/.exec(before);
    if (!match) return null;
    return { start: before.length - match[2].length - 1, query: match[2] };
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    setValue(next);
    autoresize();
    onTyping(next.trim().length > 0);
    const mention = caretMention(next, event.target.selectionStart ?? next.length);
    setMentionOpen(mention !== null && 'famuse'.startsWith(mention.query.toLowerCase()));
  }

  function insertText(text: string) {
    const node = textareaRef.current;
    const caret = node?.selectionStart ?? value.length;
    const mention = text.startsWith('@') ? caretMention(value, caret) : null;
    const start = mention ? mention.start : caret;
    const next = `${value.slice(0, start)}${text}${value.slice(caret)}`;
    setValue(next);
    setMentionOpen(false);
    onTyping(next.trim().length > 0);
    requestAnimationFrame(() => {
      if (!node) return;
      node.focus();
      const pos = start + text.length;
      node.setSelectionRange(pos, pos);
      autoresize();
    });
  }

  function insertMention() {
    const node = textareaRef.current;
    if (!node) return;
    const caret = node.selectionStart ?? value.length;
    const mention = caretMention(value, caret);
    if (!mention) {
      const next = `${value.endsWith(' ') || value.length === 0 ? value : `${value} `}@famuse `;
      setValue(next);
    } else {
      const next = `${value.slice(0, mention.start)}@famuse ${value.slice(caret)}`;
      setValue(next);
    }
    setMentionOpen(false);
    requestAnimationFrame(() => {
      node.focus();
      autoresize();
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen && (event.key === 'Enter' || event.key === 'Tab')) {
      event.preventDefault();
      insertMention();
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
    if (event.key === 'Escape' && mentionOpen) {
      setMentionOpen(false);
    }
  }

  function handleSend() {
    const text = value.trim();
    if ((!text && attachments.length === 0) || disabled) return;
    onSend(text, attachments);
    setValue('');
    setAttachments([]);
    setMentionOpen(false);
    onTyping(false);
    requestAnimationFrame(autoresize);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image uploads are supported.');
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setUploadError('Images must be smaller than 5 MB.');
        continue;
      }
      const clientId = randomId();
      const previewUrl = URL.createObjectURL(file);
      setUploads((current) => [...current, { clientId, name: file.name, previewUrl }]);
      try {
        const form = new FormData();
        form.append('file', file);
        const response = await fetch('/api/uploads', { method: 'POST', body: form });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || `Upload failed (${response.status}).`);
        }
        const uploaded = (await response.json()) as Attachment;
        setAttachments((current) => [...current, uploaded].slice(0, 4));
      } catch (uploadFailure) {
        setUploadError(
          uploadFailure instanceof Error ? uploadFailure.message : 'Upload failed.',
        );
      } finally {
        URL.revokeObjectURL(previewUrl);
        setUploads((current) => current.filter((upload) => upload.clientId !== clientId));
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeAttachment(key: string) {
    setAttachments((current) => current.filter((item) => item.key !== key));
  }

  return (
    <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-4">
      <div className="mx-auto max-w-3xl rounded-xl border border-stone-300 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] focus-within:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:focus-within:border-stone-400">
        {(attachments.length > 0 || uploads.length > 0) && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((item) => (
              <span key={item.key} className="relative">
                <img
                  src={item.url}
                  alt={item.name}
                  className="h-14 w-14 rounded-lg border border-stone-200 object-cover dark:border-stone-700"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(item.key)}
                  aria-label={`Remove ${item.name}`}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-stone-900 p-0.5 text-white dark:bg-stone-100 dark:text-stone-900"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {uploads.map((upload) => (
              <span
                key={upload.clientId}
                className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-stone-300 dark:border-stone-600"
                title={`Uploading ${upload.name}…`}
              >
                <Loader2 className="size-4 animate-spin text-stone-400" />
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              onTyping(false);
            }}
            placeholder={`Message #${channelName}`}
            maxLength={2000}
            aria-label={`Message #${channelName}`}
            className={cn(
              'max-h-40 w-full resize-none bg-transparent px-3.5 pb-1 pt-2.5 text-base leading-6 outline-none placeholder:text-stone-400 sm:text-sm dark:placeholder:text-stone-500',
              disabled && 'opacity-60',
            )}
          />
          {mentionOpen && (
            <div className="absolute bottom-full left-3 z-10 mb-1 w-64 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
              <button
                type="button"
                onClick={insertMention}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <Avatar name="famuse" ai className="size-7 text-xs" />
                <span>
                  <span className="block text-sm font-medium">famuse</span>
                  <span className="block text-xs text-stone-500 dark:text-stone-400">
                    AI Butler · mention for help
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(event) => handleFiles(event.target.files)}
            />
            <Button
              variant="ghost"
              size="iconSm"
              title="Attach a photo"
              aria-label="Attach a photo"
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
              className="size-10 sm:size-8"
            >
              <ImagePlus />
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              title="Mention famuse"
              aria-label="Mention famuse"
              disabled={disabled}
              onClick={insertMention}
              className="size-10 sm:size-8"
            >
              <AtSign />
            </Button>
          </div>
          <Button
            variant="default"
            size="sm"
            disabled={disabled}
            onClick={handleSend}
            aria-label="Send message"
            className="h-10 px-4 sm:h-8"
          >
            <Send /> Send
          </Button>
        </div>
      </div>
      {uploadError && (
        <p role="alert" className="mx-auto mt-1.5 max-w-3xl text-xs text-red-700 dark:text-red-400">
          {uploadError}
        </p>
      )}
      <p className="mx-auto mt-1.5 hidden max-w-3xl text-[11px] text-stone-400 sm:block dark:text-stone-500">
        Enter to send · Shift+Enter for a new line · Markdown supported
      </p>
    </div>
  );
}
