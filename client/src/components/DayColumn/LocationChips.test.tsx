import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { DayLocation } from '@/types';

import LocationChips from './LocationChips';

const locations: DayLocation[] = [
  { id: 1, name: 'Tokyo' },
  { id: 2, name: 'Osaka' },
];

describe('LocationChips', () => {
  it('renders every location name', () => {
    render(
      <LocationChips
        locations={locations}
        dayIndex={3}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Osaka')).toBeInTheDocument();
  });

  it('enters edit mode with the current name when a location is clicked', async () => {
    const user = userEvent.setup();
    render(
      <LocationChips
        locations={locations}
        dayIndex={3}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Tokyo'));

    expect(screen.getByDisplayValue('Tokyo')).toBeInTheDocument();
  });

  it('commits the trimmed name on Enter and exits edit mode', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationChips
        locations={locations}
        dayIndex={3}
        onAdd={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Tokyo'));
    const input = screen.getByDisplayValue('Tokyo');
    await user.clear(input);
    await user.type(input, '  Kyoto  ');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onUpdate).toHaveBeenCalledWith(3, 1, 'Kyoto');
    expect(screen.queryByDisplayValue('  Kyoto  ')).not.toBeInTheDocument();
  });

  it('discards the edit without calling onUpdate on Escape', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationChips
        locations={locations}
        dayIndex={3}
        onAdd={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Tokyo'));
    const input = screen.getByDisplayValue('Tokyo');
    await user.type(input, 'X');

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
  });

  it('does not call onUpdate for a blank value but still exits edit mode', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationChips
        locations={locations}
        dayIndex={3}
        onAdd={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Tokyo'));
    const input = screen.getByDisplayValue('Tokyo');
    await user.clear(input);

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
  });

  it('commits the trimmed name on blur', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationChips
        locations={locations}
        dayIndex={3}
        onAdd={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Tokyo'));
    const input = screen.getByDisplayValue('Tokyo');
    await user.clear(input);
    await user.type(input, '  Kyoto  ');

    fireEvent.blur(input);

    expect(onUpdate).toHaveBeenCalledWith(3, 1, 'Kyoto');
    expect(screen.queryByDisplayValue('  Kyoto  ')).not.toBeInTheDocument();
  });

  it('calls onDelete with the dayIndex and location id', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationChips
        locations={locations}
        dayIndex={3}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getAllByLabelText('刪除地區')[0]);

    expect(onDelete).toHaveBeenCalledWith(3, 1);
  });

  it('calls onAdd with the trimmed value on Enter and hides the input', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationChips
        locations={[]}
        dayIndex={3}
        onAdd={onAdd}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText('地區'));
    const input = screen.getByPlaceholderText('地區名稱');
    await user.type(input, 'Kyoto');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onAdd).toHaveBeenCalledWith(3, 'Kyoto');
    expect(screen.queryByPlaceholderText('地區名稱')).not.toBeInTheDocument();
    expect(screen.getByText('地區')).toBeInTheDocument();
  });

  it('closes the add input without calling onAdd on Escape', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationChips
        locations={[]}
        dayIndex={3}
        onAdd={onAdd}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText('地區'));
    const input = screen.getByPlaceholderText('地區名稱');
    await user.type(input, 'X');

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('地區名稱')).not.toBeInTheDocument();
  });

  it('does not call onAdd for a blank value but still closes the input', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationChips
        locations={[]}
        dayIndex={3}
        onAdd={onAdd}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByText('地區'));
    const input = screen.getByPlaceholderText('地區名稱');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('地區名稱')).not.toBeInTheDocument();
  });
});
