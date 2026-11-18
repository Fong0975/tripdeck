import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LocationLabelsResponse } from '@tripdeck/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addLocationLabel,
  deleteLocationLabel,
  getLocationLabels,
  reorderLocationLabels,
  updateLocationLabel,
} from '@/utils/storage';

import LocationLabelsModal from './LocationLabelsModal';

vi.mock('@/utils/storage');
vi.mock('@/components/ui/toast');

const stored: LocationLabelsResponse = {
  labels: [
    { id: 1, name: '託運', show_as_group: true, sort_order: 0 },
    { id: 2, name: '隨身', show_as_group: false, sort_order: 1 },
  ],
  orphans: [{ name: '背包', trip_count: 3 }],
};

async function renderLoaded(data: LocationLabelsResponse = stored) {
  vi.mocked(getLocationLabels).mockResolvedValue(data);
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<LocationLabelsModal onClose={onClose} />);
  await screen.findByRole('dialog');
  await waitFor(() =>
    expect(screen.queryByText('載入中…')).not.toBeInTheDocument(),
  );
  return { user, onClose };
}

beforeEach(() => {
  vi.mocked(addLocationLabel).mockResolvedValue(stored.labels[0]);
  vi.mocked(deleteLocationLabel).mockResolvedValue();
  vi.mocked(updateLocationLabel).mockResolvedValue(stored.labels[0]);
  vi.mocked(reorderLocationLabels).mockResolvedValue();
});

describe('LocationLabelsModal', () => {
  it('is exposed as a dialog named 存放位置 listing the labels', async () => {
    await renderLoaded();

    expect(screen.getByRole('dialog')).toHaveAccessibleName('存放位置');
    expect(screen.getByText('託運')).toBeInTheDocument();
    expect(screen.getByLabelText('託運 獨立分組')).toBeChecked();
    expect(screen.getByLabelText('隨身 獨立分組')).not.toBeChecked();
  });

  it('shows the loading indicator, then a retryable error when loading fails', async () => {
    vi.mocked(getLocationLabels).mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    render(<LocationLabelsModal onClose={vi.fn()} />);

    expect(screen.getByText('載入中…')).toBeInTheDocument();
    await screen.findByText('載入存放位置失敗，請稍後再試');

    vi.mocked(getLocationLabels).mockResolvedValue(stored);
    await user.click(screen.getByRole('button', { name: '重試' }));

    expect(await screen.findByText('託運')).toBeInTheDocument();
  });

  it('shows an empty hint without labels', async () => {
    await renderLoaded({ labels: [], orphans: [] });

    expect(screen.getByText('尚未建立任何存放位置。')).toBeInTheDocument();
  });

  it('closes through the close button', async () => {
    const { user, onClose } = await renderLoaded();

    await user.click(screen.getByRole('button', { name: '關閉' }));

    expect(onClose).toHaveBeenCalled();
  });

  describe('adding a label', () => {
    it('adds the trimmed name with the group setting and clears the input', async () => {
      const { user } = await renderLoaded();
      const input = screen.getByLabelText('新增存放位置');

      await user.type(input, ' 手提 ');
      await user.click(
        screen.getByLabelText('在「依存放位置」檢視中獨立成一組'),
      );
      await user.click(screen.getByRole('button', { name: '新增' }));

      await waitFor(() =>
        expect(addLocationLabel).toHaveBeenCalledWith({
          name: '手提',
          show_as_group: false,
        }),
      );
      await waitFor(() => expect(input).toHaveValue(''));
    });

    it.each([
      { name: 'a blank name', text: '   ', error: '請輸入存放位置名稱' },
      { name: 'a name that exists', text: '託運', error: '已有同名的存放位置' },
      {
        name: 'a name with a comma',
        text: 'a,b',
        error: '存放位置名稱不可包含「,」或「|」',
      },
    ])('rejects $name without calling the API', async ({ text, error }) => {
      const { user } = await renderLoaded();

      if (text.trim() !== '') {
        await user.type(screen.getByLabelText('新增存放位置'), text);
      }
      await user.click(screen.getByRole('button', { name: '新增' }));

      expect(screen.getByText(error)).toBeInTheDocument();
      expect(addLocationLabel).not.toHaveBeenCalled();
    });
  });

  describe('changing a label', () => {
    it('toggles the group setting', async () => {
      const { user } = await renderLoaded();

      await user.click(screen.getByLabelText('隨身 獨立分組'));

      await waitFor(() =>
        expect(updateLocationLabel).toHaveBeenCalledWith(2, {
          show_as_group: true,
        }),
      );
    });

    it.each([
      { name: 'moves a label down', button: '下移 託運', ordered: [2, 1] },
      { name: 'moves a label up', button: '上移 隨身', ordered: [2, 1] },
    ])('$name', async ({ button, ordered }) => {
      const { user } = await renderLoaded();

      await user.click(screen.getByRole('button', { name: button }));

      await waitFor(() =>
        expect(reorderLocationLabels).toHaveBeenCalledWith(ordered),
      );
    });

    it('disables moving the first label up and the last label down', async () => {
      await renderLoaded();

      expect(screen.getByRole('button', { name: '上移 託運' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '下移 隨身' })).toBeDisabled();
    });
  });

  describe('deleting a label', () => {
    it('deletes after confirming', async () => {
      const { user } = await renderLoaded();

      await user.click(screen.getByRole('button', { name: '刪除 託運' }));
      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', {
          name: '刪除',
        }),
      );

      await waitFor(() => expect(deleteLocationLabel).toHaveBeenCalledWith(1));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('keeps the label when the confirmation is cancelled', async () => {
      const { user } = await renderLoaded();

      await user.click(screen.getByRole('button', { name: '刪除 託運' }));
      await user.click(screen.getByRole('button', { name: '取消' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(deleteLocationLabel).not.toHaveBeenCalled();
    });
  });

  describe('deleted labels still used by trips', () => {
    it('lists them with their trip count and adds one back by name', async () => {
      const { user } = await renderLoaded();

      expect(screen.getByText('已刪除但旅程仍在使用')).toBeInTheDocument();
      expect(screen.getByText('3 個旅程使用')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '加回 背包' }));

      await waitFor(() =>
        expect(addLocationLabel).toHaveBeenCalledWith({
          name: '背包',
          show_as_group: true,
        }),
      );
    });

    it('hides the section when no trip uses a deleted label', async () => {
      await renderLoaded({ ...stored, orphans: [] });

      expect(
        screen.queryByText('已刪除但旅程仍在使用'),
      ).not.toBeInTheDocument();
    });
  });
});
