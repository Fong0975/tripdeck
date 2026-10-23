import { useClampedText } from '@/hooks/useClampedText';

import MarkdownContent from './MarkdownContent';

interface ClampedTextSectionProps {
  content: string;
  /** Optional heading shown above the content, e.g. "附近景點". */
  label?: string;
  /** Whether to render a trailing divider, decided by the caller based on what follows this section. */
  showBottomDivider: boolean;
  /** Whether to render content as markdown, or as plain preformatted text. Defaults to true. */
  markdown?: boolean;
}

/**
 * Renders a line-clamped text block (markdown or plain) with a "展開/收起"
 * toggle that only appears once the content actually overflows. Each
 * instance tracks its own clamp/expand state independently via
 * useClampedText.
 */
export default function ClampedTextSection({
  content,
  label,
  showBottomDivider,
  markdown = true,
}: ClampedTextSectionProps) {
  const { ref, expanded, clamped, toggle } = useClampedText(content);

  return (
    <div className='my-3'>
      <hr className='mb-3 border-border' />
      {label && (
        <p className='mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
          {label}
        </p>
      )}
      <div
        ref={ref}
        className={`text-sm text-muted-foreground ${expanded ? '' : 'line-clamp-3'}`}
      >
        {markdown ? (
          <MarkdownContent>{content}</MarkdownContent>
        ) : (
          <div className='whitespace-pre-wrap'>{content}</div>
        )}
      </div>
      {(clamped || expanded) && (
        <button
          onClick={e => {
            e.stopPropagation();
            toggle();
          }}
          className='mt-0.5 text-sm text-primary/60 transition-colors hover:text-primary'
        >
          {expanded ? '收起' : '展開'}
        </button>
      )}
      {showBottomDivider && <hr className='mt-3 border-border' />}
    </div>
  );
}
