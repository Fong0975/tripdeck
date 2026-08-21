import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MarkdownField from './MarkdownField';

describe('MarkdownField', () => {
  it('renders the label and the current value in the edit tab by default', () => {
    render(
      <MarkdownField label='Notes' value='hello world' onChange={vi.fn()} />,
    );

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('hello world');
  });

  it('calls onChange with the new value when the textarea is edited', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MarkdownField label='Notes' value='' onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('switches to the preview tab and renders the markdown content', async () => {
    const user = userEvent.setup();
    render(
      <MarkdownField label='Notes' value='**bold** text' onChange={vi.fn()} />,
    );

    await user.click(screen.getByText('預覽'));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
  });

  it('shows the empty-state placeholder when previewing blank content', async () => {
    const user = userEvent.setup();
    render(<MarkdownField label='Notes' value='   ' onChange={vi.fn()} />);

    await user.click(screen.getByText('預覽'));

    expect(screen.getByText('尚無內容')).toBeInTheDocument();
  });

  it('switches back to the edit tab', async () => {
    const user = userEvent.setup();
    render(<MarkdownField label='Notes' value='hello' onChange={vi.fn()} />);

    await user.click(screen.getByText('預覽'));
    await user.click(screen.getByText('編輯'));

    expect(screen.getByRole('textbox')).toHaveValue('hello');
  });
});
