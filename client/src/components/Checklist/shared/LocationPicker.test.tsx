import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LocationLabel } from '@tripdeck/shared';
import { describe, expect, it, vi } from 'vitest';

import { LocationLabelsContext } from '../locations/LocationLabelsContext';
import { buildLabelSet } from '../locations/locationLabelSet';

import LocationPicker from './LocationPicker';

function makeLabels(names: string[]): LocationLabel[] {
  return names.map((name, index) => ({
    id: index + 1,
    name,
    show_as_group: true,
    sort_order: index,
  }));
}

function renderPicker(
  value: string | null,
  { names = ['託運', '隨身', '手提'], onChange = vi.fn() } = {},
) {
  const user = userEvent.setup();
  render(
    <LocationLabelsContext.Provider
      value={buildLabelSet(makeLabels(names), async () => {})}
    >
      <LocationPicker value={value} onChange={onChange} />
    </LocationLabelsContext.Provider>,
  );
  return { user, onChange };
}

const openButton = () => screen.getByRole('button', { name: '設定存放位置' });

describe('LocationPicker', () => {
  it.each([
    { description: 'no value', value: null, shown: [], hint: true },
    { description: 'an empty value', value: '', shown: [], hint: true },
    {
      description: 'two names',
      value: '隨身,託運',
      shown: ['託運', '隨身'],
      hint: false,
    },
  ])(
    'shows the selected names as chips for $description',
    ({ value, shown, hint }) => {
      renderPicker(value);

      for (const name of shown) {
        expect(openButton()).toHaveTextContent(name);
      }
      if (hint) {
        expect(openButton()).toHaveTextContent('選擇位置');
      } else {
        expect(openButton()).not.toHaveTextContent('選擇位置');
      }
    },
  );

  it('lists every defined label as a checkbox only after opening', async () => {
    const { user } = renderPicker('隨身');
    expect(
      screen.queryByRole('group', { name: '存放位置' }),
    ).not.toBeInTheDocument();

    await user.click(openButton());

    expect(screen.getByRole('group', { name: '存放位置' })).toBeInTheDocument();
    expect(screen.getByLabelText('託運')).not.toBeChecked();
    expect(screen.getByLabelText('隨身')).toBeChecked();
    expect(screen.getByLabelText('手提')).not.toBeChecked();
    expect(openButton()).toHaveAttribute('aria-expanded', 'true');
  });

  it.each([
    {
      description: 'adds a label in label order',
      value: '手提',
      toggle: '託運',
      expected: '託運,手提',
    },
    {
      description: 'adds the first label to an empty value',
      value: null,
      toggle: '隨身',
      expected: '隨身',
    },
    {
      description: 'removes a label',
      value: '託運,隨身',
      toggle: '託運',
      expected: '隨身',
    },
    {
      description: 'clears the value when the last label is removed',
      value: '託運',
      toggle: '託運',
      expected: null,
    },
  ])('$description', async ({ value, toggle, expected }) => {
    const { user, onChange } = renderPicker(value);

    await user.click(openButton());
    await user.click(screen.getByLabelText(toggle));

    expect(onChange).toHaveBeenCalledWith(expected);
  });

  describe('a deleted label the value still carries', () => {
    it('is listed as deleted, checked, and can be removed', async () => {
      const { user, onChange } = renderPicker('託運,背包');

      await user.click(openButton());
      const deleted = screen.getByLabelText('背包（已刪除）');
      expect(deleted).toBeChecked();
      await user.click(deleted);

      expect(onChange).toHaveBeenCalledWith('託運');
    });

    it('is not offered once the value no longer carries it', async () => {
      const { user } = renderPicker('託運');

      await user.click(openButton());

      expect(screen.queryByLabelText('背包（已刪除）')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('背包')).not.toBeInTheDocument();
    });
  });

  it('explains that no label exists yet', async () => {
    const { user } = renderPicker(null, { names: [] });

    await user.click(openButton());

    expect(screen.getByText('尚未建立位置標籤')).toBeInTheDocument();
  });

  it.each([
    {
      description: 'pressing Escape',
      close: async (user: ReturnType<typeof userEvent.setup>) =>
        user.keyboard('{Escape}'),
    },
    {
      description: 'clicking outside',
      close: async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(document.body),
    },
    {
      description: 'clicking the button again',
      close: async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(openButton()),
    },
  ])('closes after $description', async ({ close }) => {
    const { user } = renderPicker(null);
    await user.click(openButton());

    await close(user);

    expect(
      screen.queryByRole('group', { name: '存放位置' }),
    ).not.toBeInTheDocument();
  });

  it('stays open when a checkbox inside is clicked', async () => {
    const { user } = renderPicker(null);
    await user.click(openButton());

    await user.click(screen.getByLabelText('託運'));

    expect(screen.getByRole('group', { name: '存放位置' })).toBeInTheDocument();
  });

  it('uses the default labels without a provider', async () => {
    const user = userEvent.setup();
    render(<LocationPicker value={null} onChange={vi.fn()} />);

    await user.click(openButton());

    expect(screen.getByLabelText('託運')).toBeInTheDocument();
    expect(screen.getByLabelText('隨身')).toBeInTheDocument();
  });
});
