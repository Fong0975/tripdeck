import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EditOccasion } from '../../shared/types';

import OccasionEditList from './OccasionEditList';

function makeOccasions(count: number): EditOccasion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Occasion ${i + 1}`,
  }));
}

describe('OccasionEditList', () => {
  it('renders every occasion name', () => {
    render(
      <OccasionEditList
        occasions={makeOccasions(2)}
        onUpdateName={vi.fn()}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Occasion 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Occasion 2')).toBeInTheDocument();
  });

  it('calls onUpdateName with the occasion id when its name changes', () => {
    const onUpdateName = vi.fn();
    render(
      <OccasionEditList
        occasions={makeOccasions(1)}
        onUpdateName={onUpdateName}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    // The input is controlled by the (static, un-rerendered) `occ.name`
    // prop, so a single `fireEvent.change` is used instead of per-keystroke
    // `user.type()`, which would have React reset the DOM value between
    // keystrokes.
    fireEvent.change(screen.getByDisplayValue('Occasion 1'), {
      target: { value: 'Occasion 1X' },
    });

    expect(onUpdateName).toHaveBeenCalledWith(1, 'Occasion 1X');
  });

  it('calls onRemove with the occasion id when its delete button is clicked', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <OccasionEditList
        occasions={makeOccasions(2)}
        onUpdateName={vi.fn()}
        onRemove={onRemove}
        onAdd={vi.fn()}
      />,
    );

    await user.click(screen.getAllByLabelText('刪除時機')[1]);

    expect(onRemove).toHaveBeenCalledWith(2);
  });

  it('disables every delete button when only one occasion remains', () => {
    render(
      <OccasionEditList
        occasions={makeOccasions(1)}
        onUpdateName={vi.fn()}
        onRemove={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('刪除時機')).toBeDisabled();
  });

  it('calls onAdd when the add button is clicked', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <OccasionEditList
        occasions={makeOccasions(1)}
        onUpdateName={vi.fn()}
        onRemove={vi.fn()}
        onAdd={onAdd}
      />,
    );

    await user.click(screen.getByText('新增時機'));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
