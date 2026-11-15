import { render, screen, waitFor } from '@testing-library/react';
import { MAX_IMAGE_UPLOAD_BYTES } from '@tripdeck/shared';
import { describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ui/toast';
import { selectFile } from '@/test-utils/queries';
import { setupUser } from '@/test-utils/render';

import PendingImageForm from './PendingImageForm';

vi.mock('@/components/ui/toast');

const TITLE_PLACEHOLDER = '圖片標題（必填）';

/** Renders the form, picks a file and returns the pieces tests act on. */
function renderWithPendingFile(
  props: Partial<React.ComponentProps<typeof PendingImageForm>> = {},
) {
  const onConfirm = props.onConfirm ?? vi.fn();
  const utils = render(
    <PendingImageForm confirmLabel='確認' {...props} onConfirm={onConfirm} />,
  );
  const file = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
  selectFile(utils.container, file);
  return { ...utils, file, onConfirm };
}

describe('PendingImageForm', () => {
  it('shows only the add-image trigger before a file is picked', () => {
    render(<PendingImageForm confirmLabel='確認' onConfirm={vi.fn()} />);

    expect(screen.getByText('新增圖片')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(TITLE_PLACEHOLDER),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      name: 'an oversized image',
      file: new File(['a'], 'big.png', { type: 'image/png' }),
      size: MAX_IMAGE_UPLOAD_BYTES + 1,
      message: '圖片大小不可超過 10 MB',
    },
    {
      name: 'an unsupported file type',
      file: new File(['a'], 'a.svg', { type: 'image/svg+xml' }),
      size: 1,
      message: '僅支援 JPEG、PNG、GIF、WEBP 格式的圖片',
    },
  ])(
    'rejects $name with an error toast instead of staging it',
    ({ file, size, message }) => {
      Object.defineProperty(file, 'size', { value: size });
      const { container } = render(
        <PendingImageForm confirmLabel='確認' onConfirm={vi.fn()} />,
      );

      selectFile(container, file);

      expect(showToast).toHaveBeenCalledWith('error', message);
      expect(
        screen.queryByPlaceholderText(TITLE_PLACEHOLDER),
      ).not.toBeInTheDocument();
    },
  );

  it.each([
    { name: 'an empty title', typed: '' },
    { name: 'a whitespace-only title', typed: '   ' },
  ])('rejects $name without calling onConfirm', async ({ typed }) => {
    const user = setupUser();
    const { onConfirm } = renderWithPendingFile();
    if (typed) {
      await user.type(screen.getByPlaceholderText(TITLE_PLACEHOLDER), typed);
    }

    await user.click(screen.getByText('確認'));

    expect(screen.getByText('請輸入圖片標題')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'resets the form after onConfirm resolves',
      makeOnConfirm: () => vi.fn().mockResolvedValue(undefined),
      expectFormKept: false,
    },
    {
      name: 'resets the form after a synchronous onConfirm',
      makeOnConfirm: () => vi.fn(),
      expectFormKept: false,
    },
    {
      name: 'keeps the form when onConfirm rejects',
      makeOnConfirm: () => vi.fn().mockRejectedValue(new Error('failed')),
      expectFormKept: true,
    },
  ])('$name', async ({ makeOnConfirm, expectFormKept }) => {
    const onConfirm = makeOnConfirm();
    const user = setupUser();
    const { file } = renderWithPendingFile({ onConfirm });
    await user.type(screen.getByPlaceholderText(TITLE_PLACEHOLDER), ' Sun ');

    await user.click(screen.getByText('確認'));

    expect(onConfirm).toHaveBeenCalledWith(file, 'Sun');
    if (expectFormKept) {
      await waitFor(() => expect(screen.getByText('確認')).toBeEnabled());
      expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER)).toHaveValue(
        ' Sun ',
      );
    } else {
      expect(await screen.findByText('新增圖片')).toBeInTheDocument();
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(expectFormKept ? 0 : 1);
  });

  it('shows the busy label and disables confirm while onConfirm is pending', async () => {
    const user = setupUser();
    renderWithPendingFile({
      busyLabel: '處理中',
      onConfirm: () => new Promise<void>(() => {}),
    });
    await user.type(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Title');

    await user.click(screen.getByText('確認'));

    expect(await screen.findByText('處理中')).toBeDisabled();
  });

  it('discards the pending file and calls onCancel when the preview is cleared', async () => {
    const onCancel = vi.fn();
    const user = setupUser();
    renderWithPendingFile({ onCancel });

    // The preview's clear button has no accessible name; it is the first
    // button, ahead of the text-identifiable confirm button.
    await user.click(screen.getAllByRole('button')[0]);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByText('新增圖片')).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('revokes the pending preview URL on unmount', () => {
    const { unmount } = renderWithPendingFile();

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
