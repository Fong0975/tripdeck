import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

interface Props {
  children: string;
  className?: string;
}

/**
 * Renders a markdown string into HTML with GFM and line-break support.
 * Applies basic prose styling via Tailwind utility classes.
 */
export default function MarkdownContent({ children, className = '' }: Props) {
  return (
    <div className={`markdown-content wrap-break-word ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => <p className='mb-1.5 last:mb-0'>{children}</p>,
          h1: ({ children }) => (
            <h1 className='mb-1 text-base font-bold'>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className='mb-1 text-sm font-bold'>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className='mb-1 text-sm font-semibold'>{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className='mb-1.5 list-disc pl-4'>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className='mb-1.5 list-decimal pl-4'>{children}</ol>
          ),
          li: ({ children }) => <li className='mb-0.5'>{children}</li>,
          strong: ({ children }) => (
            <strong className='font-semibold'>{children}</strong>
          ),
          em: ({ children }) => <em className='italic'>{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
              onClick={e => e.stopPropagation()}
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className='rounded-sm bg-muted px-1 py-0.5 font-mono text-xs'>
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className='mb-1.5 overflow-x-auto rounded-sm bg-muted p-2 font-mono text-xs'>
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className='border-l-2 border-border pl-3 italic'>
              {children}
            </blockquote>
          ),
          hr: () => <hr className='my-2 border-border' />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
