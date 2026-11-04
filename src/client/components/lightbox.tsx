import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import type { Attachment } from '../../shared/types';

export function Lightbox({
  attachment,
  onClose,
}: {
  attachment: Attachment;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Portal out of the message bubble: pending messages render with
  // opacity-70, which would otherwise trap this fixed overlay inside
  // the bubble as its containing block.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Image viewer: ${attachment.name}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-stone-950/90 p-3 sm:p-6"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 pb-2">
        <p className="truncate text-sm font-medium text-stone-200">{attachment.name}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={attachment.url}
            download={attachment.name}
            onClick={(event) => event.stopPropagation()}
            aria-label="Download image"
            title="Download image"
            className="inline-flex size-10 items-center justify-center rounded-lg text-stone-200 transition-colors hover:bg-white/10"
          >
            <Download className="size-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image viewer"
            autoFocus
            className="inline-flex size-10 items-center justify-center rounded-lg text-stone-200 transition-colors hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <img
          src={attachment.url}
          alt={attachment.name}
          onClick={(event) => event.stopPropagation()}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body,
  );
}
