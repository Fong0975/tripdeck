import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StagedImageUploader from './StagedImageUploader';

beforeEach(() => {
  // jsdom does not implement the Blob URL APIs used to preview a staged file.
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
});

// The staging <input type="file"> has no accessible label, so it can only
// be reached by its type attribute rather than a testing-library query.
function getFileInput(container: HTMLElement): HTMLInputElement {
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

function stageFile(container: HTMLElement, file: File) {
  fireEvent.change(getFileInput(container), { target: { files: [file] } });
}

describe('StagedImageUploader', () => {
  it('shows the add-image trigger and no thumbnails initially', () => {
    render(<StagedImageUploader onImagesChange={vi.fn()} />);

    expect(screen.getByText('新增圖片')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('圖片標題（必填）'),
    ).not.toBeInTheDocument();
  });

  it('calls onImagesChange with an empty list on initial mount', () => {
    const onImagesChange = vi.fn();
    render(<StagedImageUploader onImagesChange={onImagesChange} />);

    expect(onImagesChange).toHaveBeenCalledWith([]);
  });

  it('shows the pending-file form after a file is selected', () => {
    const { container } = render(
      <StagedImageUploader onImagesChange={vi.fn()} />,
    );

    stageFile(container, new File(['a'], 'a.jpg'));

    expect(screen.getByPlaceholderText('圖片標題（必填）')).toBeInTheDocument();
    expect(screen.getByText('加入圖片')).toBeInTheDocument();
    expect(screen.queryByText('新增圖片')).not.toBeInTheDocument();
  });

  it('shows a required-title error when confirming without a title', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <StagedImageUploader onImagesChange={vi.fn()} />,
    );
    stageFile(container, new File(['a'], 'a.jpg'));

    await user.click(screen.getByText('加入圖片'));

    expect(screen.getByText('請輸入圖片標題')).toBeInTheDocument();
  });

  it('stages the image and reports it once a title is provided', async () => {
    const onImagesChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <StagedImageUploader onImagesChange={onImagesChange} />,
    );
    const file = new File(['a'], 'a.jpg');
    stageFile(container, file);

    await user.type(
      screen.getByPlaceholderText('圖片標題（必填）'),
      'My Photo',
    );
    await user.click(screen.getByText('加入圖片'));

    expect(onImagesChange).toHaveBeenCalledWith([{ file, title: 'My Photo' }]);
    expect(screen.getByText('My Photo')).toBeInTheDocument();
    expect(screen.getByText('新增圖片')).toBeInTheDocument();
  });

  it('clears the pending file without staging when the X button is clicked', async () => {
    const onImagesChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <StagedImageUploader onImagesChange={onImagesChange} />,
    );
    stageFile(container, new File(['a'], 'a.jpg'));

    // The pending-file preview's clear button has no accessible name, so
    // it is identified by position: it's the only button besides the
    // text-identifiable '加入圖片' confirm button at this point.
    await user.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('新增圖片')).toBeInTheDocument();
    expect(onImagesChange).toHaveBeenCalledWith([]);
  });

  it('removes a staged image and reports the updated list', async () => {
    const onImagesChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <StagedImageUploader onImagesChange={onImagesChange} />,
    );
    stageFile(container, new File(['a'], 'a.jpg'));
    await user.type(
      screen.getByPlaceholderText('圖片標題（必填）'),
      'My Photo',
    );
    await user.click(screen.getByText('加入圖片'));

    await user.click(screen.getByTitle('移除圖片'));

    expect(screen.queryByText('My Photo')).not.toBeInTheDocument();
    expect(onImagesChange).toHaveBeenLastCalledWith([]);
  });

  it('revokes the previous preview URL when a new file replaces a pending one', () => {
    const { container } = render(
      <StagedImageUploader onImagesChange={vi.fn()} />,
    );
    stageFile(container, new File(['a'], 'a.jpg'));

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    stageFile(container, new File(['b'], 'b.jpg'));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('does not stage anything when the file input change has no file', () => {
    const onImagesChange = vi.fn();
    const { container } = render(
      <StagedImageUploader onImagesChange={onImagesChange} />,
    );

    fireEvent.change(getFileInput(container), { target: { files: [] } });

    expect(
      screen.queryByPlaceholderText('圖片標題（必填）'),
    ).not.toBeInTheDocument();
    expect(onImagesChange).toHaveBeenLastCalledWith([]);
  });

  it('opens the file picker when the add-image button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <StagedImageUploader onImagesChange={vi.fn()} />,
    );
    const fileInput = getFileInput(container);
    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(screen.getByText('新增圖片'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
