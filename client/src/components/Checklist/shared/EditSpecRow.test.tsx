import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EditSpecRow from './EditSpecRow';
import type { EditSpec } from './types';

function makeSpec(overrides: Partial<EditSpec> = {}): EditSpec {
  return { id: 1, name: 'Spec A', storage_location: null, ...overrides };
}

describe('EditSpecRow', () => {
  it('renders the index and the spec name', () => {
    render(
      <EditSpecRow
        spec={makeSpec()}
        index={2}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('3.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Spec A')).toBeInTheDocument();
  });

  it('calls onUpdate with the new name when the name input changes', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(
      <EditSpecRow
        spec={makeSpec({ name: '' })}
        index={0}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('規格名稱'), 'X');

    expect(onUpdate).toHaveBeenCalledWith({ name: 'X' });
  });

  it('calls onUpdate with the toggled storage location', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(
      <EditSpecRow
        spec={makeSpec()}
        index={0}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('託運'));

    expect(onUpdate).toHaveBeenCalledWith({ storage_location: '託運' });
  });

  it('calls onDelete when the trash button is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <EditSpecRow
        spec={makeSpec()}
        index={0}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByLabelText('刪除規格'));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
