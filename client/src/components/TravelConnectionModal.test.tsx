import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEntityImages } from '@/hooks/useEntityImages';
import type { TravelConnection } from '@/types';

import TravelConnectionModal from './TravelConnectionModal';

vi.mock('@/hooks/useEntityImages', () => ({
  useEntityImages: vi.fn(),
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

function makeConnection(
  overrides: Partial<TravelConnection> = {},
): TravelConnection {
  return {
    id: 1,
    fromAttractionId: 10,
    toAttractionId: 20,
    transportMode: 'walk',
    duration: null,
    route: null,
    notes: null,
    images: [],
    ...overrides,
  };
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
  describe.each(TRANSPORT_LABELS)(
    'when transportMode is $value',
    ({ value, label }) => {
      it(`marks the ${label} button active and another button inactive`, () => {
        render(
          <TravelConnectionModal
            {...baseProps}
            connection={makeConnection({ transportMode: value })}
          />,
        );

        const activeButton = screen.getByRole('button', {
          name: new RegExp(label),
        });
        ACTIVE_CLASSES.forEach(cls =>
          expect(activeButton.className).toContain(cls),
        );

        const otherLabel = TRANSPORT_LABELS.find(
          opt => opt.value !== value,
        )!.label;
        const inactiveButton = screen.getByRole('button', {
          name: new RegExp(otherLabel),
        });
        INACTIVE_CLASSES.forEach(cls =>
          expect(inactiveButton.className).toContain(cls),
        );
      });
    },
  );

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
          connection={makeConnection({ duration })}
        />,
      );

      const [hoursInput, minutesInput] = screen.getAllByRole('spinbutton');
      expect(hoursInput).toHaveValue(hours);
      expect(minutesInput).toHaveValue(minutes);
    });
  });

  it('submits a combined duration string when hours/minutes are edited', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <TravelConnectionModal
        {...baseProps}
        onSave={onSave}
        connection={makeConnection({ duration: null })}
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
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <TravelConnectionModal
        {...baseProps}
        onSave={onSave}
        connection={makeConnection({ duration: null })}
      />,
    );

    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(onSave.mock.calls[0][0]).toMatchObject({ duration: null });
  });

  it('renders the image upload section when editing an existing connection', () => {
    render(
      <TravelConnectionModal
        {...baseProps}
        connection={makeConnection({ id: 5 })}
      />,
    );

    expect(screen.getByTestId('image-upload-section')).toBeInTheDocument();
  });

  it('omits the image upload section for a not-yet-saved connection', () => {
    render(
      <TravelConnectionModal
        {...baseProps}
        connection={makeConnection({ id: 0 })}
      />,
    );

    expect(
      screen.queryByTestId('image-upload-section'),
    ).not.toBeInTheDocument();
  });

  it('updates transportMode when a different transport option is clicked and includes it when saved', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <TravelConnectionModal
        {...baseProps}
        onSave={onSave}
        connection={makeConnection({ transportMode: 'walk' })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /大眾運輸/ }));
    await user.click(screen.getByRole('button', { name: '儲存' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ transportMode: 'transit' }),
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
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(
        <TravelConnectionModal
          {...baseProps}
          onSave={onSave}
          connection={makeConnection()}
        />,
      );

      await user.type(screen.getByPlaceholderText(placeholder), typed);
      await user.click(screen.getByRole('button', { name: '儲存' }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ [field]: typed }),
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
    const user = userEvent.setup();
    render(
      <TravelConnectionModal
        {...baseProps}
        connection={makeConnection({ id: 5 })}
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
