import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEntityImages } from '@/hooks/useEntityImages';
import { makeConnection } from '@/test-utils/fixtures';
import { setupUser } from '@/test-utils/render';
import type { TravelConnection } from '@/types';

import TravelConnectionModal from './TravelConnectionModal';

vi.mock('@/hooks/useEntityImages', () => ({
  useEntityImages: vi.fn(),
}));

vi.mock('@/components/MarkdownField', async () => ({
  default: (await import('@/test-utils/stubs')).MarkdownFieldStub,
}));

vi.mock('./ImageUploadSection', () => ({
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

vi.mock('./StagedImageUploader', () => ({
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

const TRANSPORT_LABELS = [
  { value: 'walk', label: '步行' },
  { value: 'transit', label: '大眾運輸' },
  { value: 'drive', label: '開車' },
  { value: 'bike', label: '騎車' },
  { value: 'taxi', label: '計程車' },
  { value: 'flight', label: '飛機' },
  { value: 'other', label: '其他' },
] as const;

const ACTIVE_CLASSES = ['border-primary', 'bg-primary/10', 'text-primary'];
const INACTIVE_CLASSES = ['border-border'];

// The modal reads every optional text field, so start them all as
// explicit nulls (as the API returns them) rather than undefined.
function makeFormConnection(
  overrides: Partial<TravelConnection> = {},
): TravelConnection {
  return makeConnection({
    duration: null,
    route: null,
    notes: null,
    images: [],
    ...overrides,
  });
}

const baseProps = {
  tripId: 1,
  fromName: '東京車站',
  toName: '淺草寺',
  onClose: vi.fn(),
  onSave: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useEntityImages).mockReturnValue({
    images: [],
    handleUpload: vi.fn(),
    handleDelete: vi.fn(),
  });
});

describe('TravelConnectionModal', () => {
  it('marks only the selected transport button active as each mode is clicked', async () => {
    const user = setupUser();
    render(
      <TravelConnectionModal
        {...baseProps}
        connection={makeFormConnection({ transportMode: 'walk' })}
      />,
    );

    for (const { label } of TRANSPORT_LABELS) {
      await user.click(screen.getByRole('button', { name: new RegExp(label) }));

      TRANSPORT_LABELS.forEach(({ label: otherLabel }) => {
        const button = screen.getByRole('button', {
          name: new RegExp(otherLabel),
        });
        const [expected, unexpected] =
          otherLabel === label
            ? [ACTIVE_CLASSES, INACTIVE_CLASSES]
            : [INACTIVE_CLASSES, ACTIVE_CLASSES];
        // Match whole class tokens: a substring check would treat
        // `hover:border-primary/50` as containing `border-primary`.
        expected.forEach(cls => expect(button).toHaveClass(cls));
        unexpected.forEach(cls => expect(button).not.toHaveClass(cls));
      });
    }
  });

  describe.each([
    { description: 'no stored duration', duration: null, hours: 0, minutes: 0 },
    {
      description: 'a duration of 90 minutes',
      duration: '90',
      hours: 1,
      minutes: 30,
    },
    {
      description: 'a duration of 45 minutes',
      duration: '45',
      hours: 0,
      minutes: 45,
    },
  ])('when the connection has $description', ({ duration, hours, minutes }) => {
    it(`renders hours=${hours} and minutes=${minutes} inputs`, () => {
      render(
        <TravelConnectionModal
          {...baseProps}
          connection={makeFormConnection({ duration })}
        />,
      );

      const [hoursInput, minutesInput] = screen.getAllByRole('spinbutton');
      expect(hoursInput).toHaveValue(hours);
      expect(minutesInput).toHaveValue(minutes);
    });
  });

  it('submits a combined duration string when hours/minutes are edited', async () => {
    const user = setupUser();
    const onSave = vi.fn();
    render(
      <TravelConnectionModal
        {...baseProps}
        onSave={onSave}
        connection={makeFormConnection({ duration: null })}
      />,
    );

    const [hoursInput, minutesInput] = screen.getAllByRole('spinbutton');
    await user.clear(hoursInput);
    await user.type(hoursInput, '2');
    await user.clear(minutesInput);
    await user.type(minutesInput, '15');

    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ duration: '135' });
  });

  it('submits a null duration when both hours and minutes remain 0', async () => {
    const user = setupUser();
    const onSave = vi.fn();
    render(
      <TravelConnectionModal
        {...baseProps}
        onSave={onSave}
        connection={makeFormConnection({ duration: null })}
      />,
    );

    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(onSave.mock.calls[0][0]).toMatchObject({ duration: null });
  });

  it('renders the image upload section when editing an existing connection', () => {
    render(
      <TravelConnectionModal
        {...baseProps}
        connection={makeFormConnection({ id: 5 })}
      />,
    );

    expect(screen.getByTestId('image-upload-section')).toBeInTheDocument();
  });

  it('shows the staged image uploader instead for a not-yet-saved connection', () => {
    render(
      <TravelConnectionModal
        {...baseProps}
        connection={makeFormConnection({ id: 0 })}
      />,
    );

    expect(
      screen.queryByTestId('image-upload-section'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('staged-image-uploader')).toBeInTheDocument();
  });

  it('passes the staged images to onSave when creating a new connection', async () => {
    const user = setupUser();
    const onSave = vi.fn();
    render(
      <TravelConnectionModal
        {...baseProps}
        onSave={onSave}
        connection={makeFormConnection({ id: 0 })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'stage image' }));
    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 0 }), [
      { file: expect.any(File), title: 'Staged' },
    ]);
  });

  it('does not pass staged images to onSave when editing an existing connection', async () => {
    const user = setupUser();
    const onSave = vi.fn();
    render(
      <TravelConnectionModal
        {...baseProps}
        onSave={onSave}
        connection={makeFormConnection({ id: 5 })}
      />,
    );

    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5 }),
      undefined,
    );
  });

  it('updates transportMode when a different transport option is clicked and includes it when saved', async () => {
    const user = setupUser();
    const onSave = vi.fn();
    render(
      <TravelConnectionModal
        {...baseProps}
        onSave={onSave}
        connection={makeFormConnection({ transportMode: 'walk' })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /大眾運輸/ }));
    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ transportMode: 'transit' }),
      undefined,
    );
  });

  it.each([
    {
      field: 'route',
      placeholder: '例：搭乘銀座線至上野站...（支援 Markdown 語法）',
      typed: 'Take the Ginza line',
    },
    {
      field: 'notes',
      placeholder: '其他注意事項...',
      typed: 'Bring an umbrella',
    },
  ])(
    'updates $field via its onChange and includes it in the saved connection',
    async ({ field, placeholder, typed }) => {
      const user = setupUser();
      const onSave = vi.fn();
      render(
        <TravelConnectionModal
          {...baseProps}
          onSave={onSave}
          connection={makeFormConnection()}
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

  it('wires the useEntityImages upload and delete handlers to ImageUploadSection when editing', async () => {
    const handleUpload = vi.fn();
    const handleDelete = vi.fn();
    vi.mocked(useEntityImages).mockReturnValue({
      images: [],
      handleUpload,
      handleDelete,
    });
    const user = setupUser();
    render(
      <TravelConnectionModal
        {...baseProps}
        connection={makeFormConnection({ id: 5 })}
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
