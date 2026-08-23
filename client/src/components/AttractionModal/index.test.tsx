import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEntityImages } from '@/hooks/useEntityImages';
import type { Attraction } from '@/types';

import AttractionModal from './index';

vi.mock('@/hooks/useEntityImages', () => ({
  useEntityImages: vi.fn(),
}));

vi.mock('../ImageUploadSection', () => ({
  default: ({
    onUpload,
    onDelete,
  }: {
    onUpload: (file: File, title: string) => void;
    onDelete: (imageId: number) => void;
  }) => (
    <div data-testid='image-upload-section'>
      <button
        type='button'
        onClick={() => onUpload(new File(['a'], 'a.jpg'), 'Uploaded title')}
      >
        upload image
      </button>
      <button type='button' onClick={() => onDelete(42)}>
        delete image
      </button>
    </div>
  ),
}));

vi.mock('./ReferenceWebsitesEditor', () => ({
  default: ({
    onChange,
    onDraftChange,
  }: {
    onChange: (websites: { url: string; title: string }[]) => void;
    onDraftChange?: (hasDraft: boolean) => void;
  }) => (
    <div data-testid='reference-websites-editor'>
      <button
        type='button'
        onClick={() => onChange([{ url: 'https://x.example.com', title: 'X' }])}
      >
        change websites
      </button>
      <button type='button' onClick={() => onDraftChange?.(true)}>
        set website draft
      </button>
      <button type='button' onClick={() => onDraftChange?.(false)}>
        clear website draft
      </button>
    </div>
  ),
}));

vi.mock('../StagedImageUploader', () => ({
  default: ({
    onImagesChange,
  }: {
    onImagesChange: (images: { file: File; title: string }[]) => void;
  }) => (
    <div data-testid='staged-image-uploader'>
      <button
        type='button'
        onClick={() =>
          onImagesChange([{ file: new File(['a'], 'a.jpg'), title: 'Staged' }])
        }
      >
        stage image
      </button>
    </div>
  ),
}));

const editingAttraction: Attraction = { id: 5, name: 'Existing' };

describe('AttractionModal', () => {
  beforeEach(() => {
    vi.mocked(useEntityImages).mockReturnValue({
      images: [],
      handleUpload: vi.fn(),
      handleDelete: vi.fn(),
    });
  });

  it.each([
    {
      description: 'no attraction is provided (create mode)',
      attraction: undefined,
      expectedTitle: '新增景點',
      expectedImageTestId: 'staged-image-uploader',
      otherImageTestId: 'image-upload-section',
    },
    {
      description: 'an attraction with a non-zero id is provided (edit mode)',
      attraction: editingAttraction,
      expectedTitle: '編輯景點',
      expectedImageTestId: 'image-upload-section',
      otherImageTestId: 'staged-image-uploader',
    },
  ])(
    'renders the matching title and image uploader when $description',
    ({ attraction, expectedTitle, expectedImageTestId, otherImageTestId }) => {
      render(
        <AttractionModal
          attraction={attraction}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />,
      );

      expect(
        screen.getByRole('heading', { name: expectedTitle }),
      ).toBeInTheDocument();
      expect(screen.getByTestId(expectedImageTestId)).toBeInTheDocument();
      expect(screen.queryByTestId(otherImageTestId)).not.toBeInTheDocument();
    },
  );

  it.each([
    { description: 'the name is empty', name: '' },
    { description: 'the name is whitespace-only', name: '   ' },
  ])(
    'shows a required-field error and does not save when $description',
    async ({ name }) => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<AttractionModal onClose={vi.fn()} onSave={onSave} />);

      if (name) {
        await user.type(screen.getByPlaceholderText('例：淺草寺'), name);
      }
      await user.click(screen.getByRole('button', { name: '儲存' }));

      expect(screen.getByText('請輸入景點名稱')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      description: 'creating a new attraction',
      attraction: undefined,
      typedName: '  淺草寺  ',
      expectedName: '淺草寺',
      stageImage: true,
      expectedSecondArg: [{ file: expect.any(File), title: 'Staged' }],
    },
    {
      description: 'editing an existing attraction',
      attraction: { id: 5, name: '  Existing  ' } as Attraction,
      typedName: null,
      expectedName: 'Existing',
      stageImage: false,
      expectedSecondArg: undefined,
    },
  ])(
    'calls onSave with the trimmed name when $description',
    async ({
      attraction,
      typedName,
      expectedName,
      stageImage,
      expectedSecondArg,
    }) => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(
        <AttractionModal
          attraction={attraction}
          onClose={vi.fn()}
          onSave={onSave}
        />,
      );

      if (typedName !== null) {
        const nameInput = screen.getByPlaceholderText('例：淺草寺');
        await user.clear(nameInput);
        await user.type(nameInput, typedName);
      }
      if (stageImage) {
        await user.click(screen.getByRole('button', { name: 'stage image' }));
      }
      await user.click(screen.getByRole('button', { name: '儲存' }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: expectedName }),
        expectedSecondArg,
      );
    },
  );

  it('shows the Google Maps external link when a URL is set', () => {
    render(
      <AttractionModal
        attraction={{
          id: 5,
          name: 'A',
          googleMapUrl: 'https://maps.google.com/x',
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://maps.google.com/x',
    );
  });

  it('hides the Google Maps external link when no URL is set', () => {
    render(
      <AttractionModal
        attraction={{ id: 5, name: 'A', googleMapUrl: '' }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('calls onClose when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AttractionModal onClose={onClose} onSave={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      field: 'googleMapUrl',
      placeholder: 'https://maps.google.com/...',
      typed: 'https://maps.google.com/x',
    },
    {
      field: 'notes',
      placeholder: '票價、開放時間、注意事項... (支援 Markdown 語法)',
      typed: 'Ticket info',
    },
    {
      field: 'nearbyAttractions',
      placeholder: '附近可順遊的景點... (支援 Markdown 語法)',
      typed: 'Nearby spot',
    },
  ])(
    'updates $field via its onChange and includes it in the saved attraction',
    async ({ field, placeholder, typed }) => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(
        <AttractionModal
          attraction={editingAttraction}
          onClose={vi.fn()}
          onSave={onSave}
        />,
      );

      await user.type(screen.getByPlaceholderText(placeholder), typed);
      await user.click(screen.getByRole('button', { name: '儲存' }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ [field]: typed }),
        undefined,
      );
    },
  );

  it.each([
    { field: 'startTime', index: 0 },
    { field: 'endTime', index: 1 },
  ])(
    'sets $field to the typed time, and to null when cleared',
    ({ field, index }) => {
      const onSave = vi.fn();
      const { container } = render(
        <AttractionModal
          attraction={editingAttraction}
          onClose={vi.fn()}
          onSave={onSave}
        />,
      );
      // The start/end time <input type="time"> fields have no <label htmlFor>
      // association in the source, so they can't be reached via
      // getByLabelText — querying by their type attribute is the most
      // reliable option available.
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const timeInput = container.querySelectorAll('input[type="time"]')[
        index
      ] as HTMLInputElement;

      fireEvent.change(timeInput, { target: { value: '10:30' } });
      fireEvent.click(screen.getByRole('button', { name: '儲存' }));

      expect(onSave).toHaveBeenLastCalledWith(
        expect.objectContaining({ [field]: '10:30' }),
        undefined,
      );

      fireEvent.change(timeInput, { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: '儲存' }));

      expect(onSave).toHaveBeenLastCalledWith(
        expect.objectContaining({ [field]: null }),
        undefined,
      );
    },
  );

  it('includes the updated reference websites list in the saved attraction', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <AttractionModal
        attraction={editingAttraction}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'change websites' }));
    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceWebsites: [{ url: 'https://x.example.com', title: 'X' }],
      }),
      undefined,
    );
  });

  describe('unsaved reference website draft guard', () => {
    it('asks for confirmation instead of saving when a website draft is pending', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(
        <AttractionModal
          attraction={editingAttraction}
          onClose={vi.fn()}
          onSave={onSave}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: 'set website draft' }),
      );
      await user.click(screen.getByRole('button', { name: '儲存' }));

      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText('尚有未加入的參考網站')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '捨棄並儲存' }));

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('returns to the form without saving when the save confirmation is cancelled', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(
        <AttractionModal
          attraction={editingAttraction}
          onClose={vi.fn()}
          onSave={onSave}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: 'set website draft' }),
      );
      await user.click(screen.getByRole('button', { name: '儲存' }));
      await user.click(screen.getByRole('button', { name: '返回修改' }));

      expect(onSave).not.toHaveBeenCalled();
      expect(
        screen.queryByText('尚有未加入的參考網站'),
      ).not.toBeInTheDocument();
    });

    it('asks for confirmation instead of closing when cancel is clicked with a pending website draft', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <AttractionModal
          attraction={editingAttraction}
          onClose={onClose}
          onSave={vi.fn()}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: 'set website draft' }),
      );
      await user.click(screen.getByRole('button', { name: '取消' }));

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText('尚有未加入的參考網站')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '捨棄並離開' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('saves directly without a confirmation once the website draft is cleared', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(
        <AttractionModal
          attraction={editingAttraction}
          onClose={vi.fn()}
          onSave={onSave}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: 'set website draft' }),
      );
      await user.click(
        screen.getByRole('button', { name: 'clear website draft' }),
      );
      await user.click(screen.getByRole('button', { name: '儲存' }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByText('尚有未加入的參考網站'),
      ).not.toBeInTheDocument();
    });
  });

  it('wires the useEntityImages upload and delete handlers to ImageUploadSection when editing', async () => {
    const handleUpload = vi.fn();
    const handleDelete = vi.fn();
    vi.mocked(useEntityImages).mockReturnValue({
      images: [],
      handleUpload,
      handleDelete,
    });
    const user = userEvent.setup();
    render(
      <AttractionModal
        attraction={editingAttraction}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'upload image' }));
    expect(handleUpload).toHaveBeenCalledWith(
      expect.any(File),
      'Uploaded title',
    );

    await user.click(screen.getByRole('button', { name: 'delete image' }));
    expect(handleDelete).toHaveBeenCalledWith(42);
  });
});
