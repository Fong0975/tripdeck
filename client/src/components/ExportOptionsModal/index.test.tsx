import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_EXPORT_OPTIONS } from '@/utils/exportToDocx/exportOptions';

import ExportOptionsModal from './index';

function renderModal() {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(<ExportOptionsModal onClose={onClose} onConfirm={onConfirm} />);
  return { onClose, onConfirm };
}

describe('ExportOptionsModal', () => {
  it('starts from the default options', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    await user.click(screen.getByRole('button', { name: '匯出' }));

    expect(onConfirm).toHaveBeenCalledWith(DEFAULT_EXPORT_OPTIONS);
  });

  it('confirms with the edited options', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    await user.selectOptions(
      screen.getByLabelText('每張圖片包含的天數'),
      '全部',
    );
    await user.click(screen.getByLabelText('包含時間軸圖片'));
    await user.click(screen.getByRole('button', { name: '匯出' }));

    expect(onConfirm).toHaveBeenCalledWith({
      timeline: { enabled: false, daysPerImage: 'all' },
    });
  });

  it('closes without confirming when cancelled', async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderModal();

    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
