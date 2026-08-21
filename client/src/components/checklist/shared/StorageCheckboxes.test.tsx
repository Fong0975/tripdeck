import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StorageCheckboxes from './StorageCheckboxes';

describe('StorageCheckboxes', () => {
  it.each([
    {
      description: 'no value selected',
      value: null,
      checked託運: false,
      checked隨身: false,
    },
    {
      description: 'only 託運 selected',
      value: '託運',
      checked託運: true,
      checked隨身: false,
    },
    {
      description: 'both options selected',
      value: '託運,隨身',
      checked託運: true,
      checked隨身: true,
    },
  ])(
    'reflects checkbox state when $description',
    ({ value, checked託運, checked隨身 }) => {
      render(<StorageCheckboxes value={value} onChange={vi.fn()} />);

      const 託運Checkbox = screen.getByLabelText('託運');
      const 隨身Checkbox = screen.getByLabelText('隨身');
      if (checked託運) {
        expect(託運Checkbox).toBeChecked();
      } else {
        expect(託運Checkbox).not.toBeChecked();
      }
      if (checked隨身) {
        expect(隨身Checkbox).toBeChecked();
      } else {
        expect(隨身Checkbox).not.toBeChecked();
      }
    },
  );

  it('calls onChange with the option added when toggled on from an empty value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StorageCheckboxes value={null} onChange={onChange} />);

    await user.click(screen.getByLabelText('託運'));

    expect(onChange).toHaveBeenCalledWith('託運');
  });

  it('calls onChange with the option removed when toggled off', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StorageCheckboxes value='託運,隨身' onChange={onChange} />);

    await user.click(screen.getByLabelText('託運'));

    expect(onChange).toHaveBeenCalledWith('隨身');
  });
});
