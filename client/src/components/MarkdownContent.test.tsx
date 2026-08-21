import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MarkdownContent from './MarkdownContent';

describe('MarkdownContent', () => {
  it.each([
    {
      description: 'plain text',
      markdown: 'hello world',
      expected: 'hello world',
    },
    {
      description: 'a level 1 heading',
      markdown: '# Title',
      expected: 'Title',
    },
    {
      description: 'a level 2 heading',
      markdown: '## Title',
      expected: 'Title',
    },
    {
      description: 'a level 3 heading',
      markdown: '### Title',
      expected: 'Title',
    },
    { description: 'bold text', markdown: '**bold**', expected: 'bold' },
    { description: 'italic text', markdown: '*italic*', expected: 'italic' },
    { description: 'inline code', markdown: '`code`', expected: 'code' },
    { description: 'a blockquote', markdown: '> quoted', expected: 'quoted' },
    {
      description: 'a bullet list item',
      markdown: '- item',
      expected: 'item',
    },
    {
      description: 'an ordered list item',
      markdown: '1. item',
      expected: 'item',
    },
  ])('renders $description', ({ markdown, expected }) => {
    render(<MarkdownContent>{markdown}</MarkdownContent>);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('renders a link with a safe target and rel', () => {
    render(<MarkdownContent>{'[Site](https://example.com)'}</MarkdownContent>);

    const link = screen.getByRole('link', { name: 'Site' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('stops link clicks from bubbling to a react-tree ancestor', async () => {
    const parentOnClick = vi.fn();
    const user = userEvent.setup();
    render(
      <div onClick={parentOnClick}>
        <MarkdownContent>{'[Site](https://example.com)'}</MarkdownContent>
      </div>,
    );

    await user.click(screen.getByRole('link', { name: 'Site' }));

    expect(parentOnClick).not.toHaveBeenCalled();
  });

  it('renders a fenced code block using the pre override', () => {
    const { container } = render(
      <MarkdownContent>{'```\ncode block\n```'}</MarkdownContent>,
    );

    // `pre` has no role/name to query by — only reachable via its own tag.
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const pre = container.querySelector('pre');
    expect(pre).toHaveClass(
      'bg-muted',
      'mb-1.5',
      'overflow-x-auto',
      'rounded',
      'p-2',
      'font-mono',
      'text-xs',
    );
    expect(pre).toHaveTextContent('code block');
  });

  it('renders a thematic break using the hr override', () => {
    render(<MarkdownContent>{'above\n\n---\n\nbelow'}</MarkdownContent>);

    expect(screen.getByRole('separator')).toHaveClass('border-border', 'my-2');
  });

  it('merges a custom className with the base styling classes', () => {
    const { container } = render(
      <MarkdownContent className='my-extra-class'>hello</MarkdownContent>,
    );

    // The wrapping div is purely decorative — no role/name to query by —
    // so its class list can only be read via its own class selector.
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const wrapper = container.querySelector('.markdown-content');
    expect(wrapper).toHaveClass(
      'markdown-content',
      'break-words',
      'my-extra-class',
    );
  });
});
