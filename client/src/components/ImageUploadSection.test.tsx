import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/lib/toast';
import type { AttractionImage } from '@/types';

import ImageUploadSection from './ImageUploadSection';

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
}));

const images: AttractionImage[] = [
  { id: 1, filename: 'a.jpg', title: 'Photo A' },
  { id: 2, filename: 'b.jpg', title: 'Photo B' },
];

// The upload <input type="file"> has no accessible label, so it can only
// be reached by its type attribute rather than a testing-library query.
function getFileInput(container: HTMLElement): HTMLInputElement {
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

function selectFile(container: HTMLElement, file: File) {
  fireEvent.change(getFileInput(container), { target: { files: [file] } });
}

// The lightbox's close button (rendered via createPortal into document.body)
// has no accessible label; the top-4 class is unique to it among the
// lightbox's close/prev/next buttons.
function getLightboxCloseButton(): HTMLElement {
  // eslint-disable-next-line testing-library/no-node-access
  return document.body.querySelector('.top-4') as HTMLElement;
}

beforeEach(() => {
  // jsdom does not implement the Blob URL APIs used to preview a pending file.
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
});

describe('ImageUploadSection', () => {
  it('shows the add-image trigger with no images', () => {
    render(
      <ImageUploadSection images={[]} onUpload={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText('新增圖片')).toBeInTheDocument();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('renders existing images as thumbnails', () => {
    render(
      <ImageUploadSection
        images={images}
        onUpload={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByAltText('Photo A')).toBeInTheDocument();
    expect(screen.getByAltText('Photo B')).toBeInTheDocument();
  });

  it('shows the pending-file form after a file is selected', () => {
    const { container } = render(
      <ImageUploadSection images={[]} onUpload={vi.fn()} onDelete={vi.fn()} />,
    );

    selectFile(container, new File(['a'], 'a.jpg'));

    expect(screen.getByPlaceholderText('圖片標題（必填）')).toBeInTheDocument();
    expect(screen.getByText('確認上傳')).toBeInTheDocument();
    expect(screen.queryByText('新增圖片')).not.toBeInTheDocument();
  });

  it('requires a title before calling onUpload', async () => {
    const onUpload = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <ImageUploadSection images={[]} onUpload={onUpload} onDelete={vi.fn()} />,
    );
    selectFile(container, new File(['a'], 'a.jpg'));

    await user.click(screen.getByText('確認上傳'));

    expect(screen.getByText('請輸入圖片標題')).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('calls onUpload and clears the form on success', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { container } = render(
      <ImageUploadSection images={[]} onUpload={onUpload} onDelete={vi.fn()} />,
    );
    const file = new File(['a'], 'a.jpg');
    selectFile(container, file);
    await user.type(
      screen.getByPlaceholderText('圖片標題（必填）'),
      'My Photo',
    );

    await user.click(screen.getByText('確認上傳'));

    expect(onUpload).toHaveBeenCalledWith(file, 'My Photo');
    expect(await screen.findByText('新增圖片')).toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith('success', '已上傳圖片。');
  });

  it('shows an error and keeps the form when onUpload rejects', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('upload failed'));
    const user = userEvent.setup();
    const { container } = render(
      <ImageUploadSection images={[]} onUpload={onUpload} onDelete={vi.fn()} />,
    );
    selectFile(container, new File(['a'], 'a.jpg'));
    await user.type(
      screen.getByPlaceholderText('圖片標題（必填）'),
      'My Photo',
    );

    await user.click(screen.getByText('確認上傳'));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        'error',
        '上傳失敗，請確認檔案格式（支援 JPG、PNG、GIF、WebP）',
      ),
    );
    expect(screen.getByPlaceholderText('圖片標題（必填）')).toBeInTheDocument();
  });

  it("calls onDelete with the clicked thumbnail's image id", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ImageUploadSection
        images={images}
        onUpload={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getAllByTitle('刪除圖片')[0]);

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('opens the lightbox when an existing thumbnail is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ImageUploadSection
        images={images}
        onUpload={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByAltText('Photo A'));

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('closes the lightbox when its close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ImageUploadSection
        images={images}
        onUpload={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByAltText('Photo A'));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    await user.click(getLightboxCloseButton());

    expect(screen.queryByText('1 / 2')).not.toBeInTheDocument();
  });

  it('triggers the hidden file input when the upload trigger is clicked', () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});
    const { container } = render(
      <ImageUploadSection images={[]} onUpload={vi.fn()} onDelete={vi.fn()} />,
    );

    fireEvent.click(screen.getByText('新增圖片'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy.mock.instances[0]).toBe(getFileInput(container));
    clickSpy.mockRestore();
  });

  it('does nothing when the file input change event carries no files', () => {
    const { container } = render(
      <ImageUploadSection images={[]} onUpload={vi.fn()} onDelete={vi.fn()} />,
    );

    fireEvent.change(getFileInput(container), { target: { files: [] } });

    expect(
      screen.queryByPlaceholderText('圖片標題（必填）'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('新增圖片')).toBeInTheDocument();
  });

  it('revokes the previous preview URL when the pending file is replaced', () => {
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    const { container } = render(
      <ImageUploadSection images={[]} onUpload={vi.fn()} onDelete={vi.fn()} />,
    );

    selectFile(container, new File(['a'], 'a.jpg'));
    selectFile(container, new File(['b'], 'b.jpg'));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');
  });
});
