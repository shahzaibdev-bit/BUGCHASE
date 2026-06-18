import { cn } from '@/lib/utils';

/** True when the string looks like HTML from the rich-text editor. */
export function hasHtml(value?: string) {
  if (!value) return false;
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Strip tags for plain-text fallback (e.g. resolution notes). */
export function stripHtml(value?: string) {
  if (!value) return '';
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface RichTextContentProps {
  content?: string;
  className?: string;
}

/** Render rich-text HTML or plain text without showing raw tags. */
export function RichTextContent({ content, className }: RichTextContentProps) {
  if (!content?.trim()) return null;

  if (hasHtml(content)) {
    return (
      <div
        className={cn(
          'prose prose-sm prose-zinc dark:prose-invert max-w-none',
          'prose-blockquote:border-l-zinc-300 dark:prose-blockquote:border-l-zinc-600',
          'prose-blockquote:text-zinc-600 dark:prose-blockquote:text-zinc-300',
          'prose-p:my-1 prose-blockquote:my-2',
          '[&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline',
          className,
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <p className={cn('text-sm whitespace-pre-wrap leading-relaxed', className)}>{content}</p>
  );
}
