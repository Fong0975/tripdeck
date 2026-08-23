import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { AttractionImage } from '@/types';

import AttractionImageStrip from './AttractionImageStrip';

describe('AttractionImageStrip', () => {
  it('renders only the first 3 thumbnails plus an overflow count for more than 3 images', () => {
    const images: AttractionImage[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      filename: `img-${i + 1}.jpg`,
      title: `Img ${i + 1}`,
    }));

    render(<AttractionImageStrip images={images} onOpenLightbox={vi.fn()} />);

    expect(screen.getByAltText('Img 1')).toBeInTheDocument();
    expect(screen.getByAltText('Img 3')).toBeInTheDocument();
    expect(screen.queryByAltText('Img 4')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('does not show an overflow count for 3 or fewer images', () => {
    const images: AttractionImage[] = [
      { id: 1, filename: 'a.jpg', title: 'Img 1' },
      { id: 2, filename: 'b.jpg', title: 'Img 2' },
    ];

    render(<AttractionImageStrip images={images} onOpenLightbox={vi.fn()} />);

    expect(screen.queryByText('+', { exact: false })).not.toBeInTheDocument();
  });

  it('calls onOpenLightbox when the thumbnail stack is clicked', async () => {
    const user = userEvent.setup();
    const onOpenLightbox = vi.fn();
    const images: AttractionImage[] = [
      { id: 1, filename: 'a.jpg', title: 'Img 1' },
    ];
    render(
      <AttractionImageStrip images={images} onOpenLightbox={onOpenLightbox} />,
    );

    await user.click(screen.getByRole('button', { name: /Img 1/ }));

    expect(onOpenLightbox).toHaveBeenCalledTimes(1);
  });

  it('does not bubble a click to the parent', async () => {
    const user = userEvent.setup();
    const onParentClick = vi.fn();
    const images: AttractionImage[] = [
      { id: 1, filename: 'a.jpg', title: 'Img 1' },
    ];
    render(
      <div onClick={onParentClick}>
        <AttractionImageStrip images={images} onOpenLightbox={vi.fn()} />
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /Img 1/ }));

    expect(onParentClick).not.toHaveBeenCalled();
  });
});
