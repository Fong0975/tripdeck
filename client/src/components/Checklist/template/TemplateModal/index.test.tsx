import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
} from '@/test-utils/fixtures';
import type { ChecklistCategory, ChecklistTemplate } from '@/types';
import {
  addTemplateCategory,
  deleteTemplateCategory,
  getChecklistTemplate,
} from '@/utils/storage';

import TemplateModal from './index';

vi.mock('@/utils/storage');
vi.mock('@/components/ui/toast');

vi.mock('./CategoryEditPanel', () => ({
  default: ({
    category,
    onSaved,
    onDone,
    onCancel,
    onDirtyChange,
  }: {
    category: ChecklistCategory;
    onSaved: () => void;
    onDone: () => void;
    onCancel: () => void;
    onDirtyChange: (dirty: boolean) => void;
  }) => (
    <div>
      <span>Editing {category.name}</span>
      <button onClick={() => onDirtyChange(true)}>make-dirty</button>
      <button onClick={() => onDirtyChange(false)}>make-clean</button>
      <button onClick={onSaved}>panel-saved</button>
      <button onClick={onDone}>panel-done</button>
      <button onClick={onCancel}>panel-cancel</button>
    </div>
  ),
}));

const clothes = makeChecklistCategory({
  id: 1,
  name: 'Clothes',
  items: [makeChecklistItem({ id: 10, name: 'Shirt' })],
});
const toiletries = makeChecklistCategory({
  id: 2,
  name: 'Toiletries',
  items: [makeChecklistItem({ id: 20, name: 'Toothbrush' })],
});

function setTemplate(categories: ChecklistCategory[]) {
  const template: ChecklistTemplate = { categories };
  vi.mocked(getChecklistTemplate).mockResolvedValue(template);
}

async function renderLoaded(onClose = vi.fn()) {
  const user = userEvent.setup();
  render(<TemplateModal onClose={onClose} />);
  await screen.findByRole('heading', { level: 3 });
  return { user, onClose };
}

beforeEach(() => {
  setTemplate([clothes, toiletries]);
  vi.mocked(addTemplateCategory).mockResolvedValue(
    makeChecklistCategory({ id: 3, name: '新分類' }),
  );
  vi.mocked(deleteTemplateCategory).mockResolvedValue(undefined);
});

describe('TemplateModal', () => {
  it('is exposed as a dialog named 行李清單模板', async () => {
    await renderLoaded();

    expect(screen.getByRole('dialog')).toHaveAccessibleName('行李清單模板');
  });

  it('shows the loading indicator before the template resolves', () => {
    vi.mocked(getChecklistTemplate).mockReturnValue(new Promise(() => {}));

    render(<TemplateModal onClose={vi.fn()} />);

    expect(screen.getByText('載入中…')).toBeInTheDocument();
  });

  it('shows a retryable error when loading fails and recovers on retry', async () => {
    vi.mocked(getChecklistTemplate).mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    render(<TemplateModal onClose={vi.fn()} />);
    await screen.findByText('載入行李清單模板失敗，請稍後再試');

    await user.click(screen.getByRole('button', { name: '重試' }));

    expect(
      await screen.findByRole('heading', { name: 'Clothes', level: 3 }),
    ).toBeInTheDocument();
  });

  it('selects the first category by default and switches on click', async () => {
    const { user } = await renderLoaded();
    expect(screen.getByText('Shirt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Toiletries/ }));

    expect(
      screen.getByRole('heading', { name: 'Toiletries', level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Toothbrush')).toBeInTheDocument();
  });

  it('shows the empty hint when there are no categories', async () => {
    setTemplate([]);
    render(<TemplateModal onClose={vi.fn()} />);

    expect(
      await screen.findByText('尚無分類，請先新增一個分類。'),
    ).toBeInTheDocument();
  });

  describe('editing', () => {
    it('opens the editor from 編輯 and returns to the view when done', async () => {
      const { user } = await renderLoaded();

      await user.click(screen.getByRole('button', { name: '編輯' }));
      expect(screen.getByText('Editing Clothes')).toBeInTheDocument();

      await user.click(screen.getByText('panel-done'));

      expect(screen.queryByText('Editing Clothes')).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Clothes', level: 3 }),
      ).toBeInTheDocument();
    });

    it('reloads the template when the panel reports a save', async () => {
      const { user } = await renderLoaded();
      await user.click(screen.getByRole('button', { name: '編輯' }));
      vi.mocked(getChecklistTemplate).mockClear();

      await user.click(screen.getByText('panel-saved'));

      await waitFor(() =>
        expect(getChecklistTemplate).toHaveBeenCalledTimes(1),
      );
    });

    it('cancels without confirmation when the draft is clean', async () => {
      const { user } = await renderLoaded();
      await user.click(screen.getByRole('button', { name: '編輯' }));

      await user.click(screen.getByText('panel-cancel'));

      expect(screen.queryByText('Editing Clothes')).not.toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it.each([
      {
        action: 'cancelling the editor',
        trigger: async (user: ReturnType<typeof userEvent.setup>) =>
          user.click(screen.getByText('panel-cancel')),
      },
      {
        action: 'switching category',
        trigger: async (user: ReturnType<typeof userEvent.setup>) =>
          user.click(screen.getByRole('button', { name: /Toiletries/ })),
      },
    ])(
      'asks before discarding a dirty draft when $action, and keeps editing on 繼續編輯',
      async ({ trigger }) => {
        const { user } = await renderLoaded();
        await user.click(screen.getByRole('button', { name: '編輯' }));
        await user.click(screen.getByText('make-dirty'));

        await trigger(user);
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: '繼續編輯' }));

        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(screen.getByText('Editing Clothes')).toBeInTheDocument();
      },
    );

    it('discards a dirty draft and switches category after 捨棄', async () => {
      const { user } = await renderLoaded();
      await user.click(screen.getByRole('button', { name: '編輯' }));
      await user.click(screen.getByText('make-dirty'));
      await user.click(screen.getByRole('button', { name: /Toiletries/ }));

      await user.click(screen.getByRole('button', { name: '捨棄' }));

      expect(screen.queryByText('Editing Clothes')).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Toiletries', level: 3 }),
      ).toBeInTheDocument();
    });
  });

  describe('closing', () => {
    it.each([
      {
        trigger: 'the close button',
        act: (user: ReturnType<typeof userEvent.setup>) =>
          user.click(screen.getByRole('button', { name: '關閉' })),
      },
      {
        trigger: 'Escape',
        act: async () => {
          fireEvent.keyDown(window, { key: 'Escape' });
        },
      },
    ])('closes immediately via $trigger when clean', async ({ act }) => {
      const { user, onClose } = await renderLoaded();

      await act(user);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('asks first when dirty and closes only after 捨棄', async () => {
      const { user, onClose } = await renderLoaded();
      await user.click(screen.getByRole('button', { name: '編輯' }));
      await user.click(screen.getByText('make-dirty'));

      await user.click(screen.getByRole('button', { name: '關閉' }));
      expect(onClose).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: '捨棄' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('adding a category', () => {
    it('creates the category, reloads, selects it and opens the editor', async () => {
      const { user } = await renderLoaded();
      setTemplate([
        clothes,
        toiletries,
        makeChecklistCategory({ id: 3, name: '新分類' }),
      ]);

      await user.click(screen.getByRole('button', { name: '新增分類' }));

      expect(await screen.findByText('Editing 新分類')).toBeInTheDocument();
      expect(addTemplateCategory).toHaveBeenCalledWith('新分類');
    });

    it('stays on the current category when creation fails', async () => {
      vi.mocked(addTemplateCategory).mockRejectedValue(new Error('network'));
      const { user } = await renderLoaded();

      await user.click(screen.getByRole('button', { name: '新增分類' }));

      await waitFor(() => expect(addTemplateCategory).toHaveBeenCalled());
      expect(screen.queryByText(/Editing/)).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Clothes', level: 3 }),
      ).toBeInTheDocument();
    });
  });

  describe('deleting a category', () => {
    it('confirms with the category name and item count, then deletes and reloads', async () => {
      const { user } = await renderLoaded();
      vi.mocked(getChecklistTemplate).mockClear();

      await user.click(screen.getByRole('button', { name: '刪除' }));
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveTextContent(
        '「Clothes」及其 1 個項目將一併刪除，且無法復原。',
      );

      await user.click(within(dialog).getByRole('button', { name: '刪除' }));

      await waitFor(() =>
        expect(deleteTemplateCategory).toHaveBeenCalledWith(1),
      );
      await waitFor(() =>
        expect(getChecklistTemplate).toHaveBeenCalledTimes(1),
      );
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('keeps the dialog flow safe when deletion fails', async () => {
      vi.mocked(deleteTemplateCategory).mockRejectedValue(new Error('network'));
      const { user } = await renderLoaded();
      vi.mocked(getChecklistTemplate).mockClear();

      await user.click(screen.getByRole('button', { name: '刪除' }));
      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', {
          name: '刪除',
        }),
      );

      await waitFor(() => expect(deleteTemplateCategory).toHaveBeenCalled());
      expect(getChecklistTemplate).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('does not delete when the confirmation is cancelled', async () => {
      const { user } = await renderLoaded();

      await user.click(screen.getByRole('button', { name: '刪除' }));
      await user.click(screen.getByRole('button', { name: '取消' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(deleteTemplateCategory).not.toHaveBeenCalled();
    });
  });
});
