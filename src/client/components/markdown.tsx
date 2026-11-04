import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/cn';

export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('famuse-markdown', className)}>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
