import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AttractionImage } from '@/types';

import ImageLightbox from './ImageLightbox';

function makeImages(count: number): AttractionImage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    filename: `img-${i + 1}.jpg`,
    title: `Image ${i + 1}`,
  }));
}

function renderLightbox(images: AttractionImage[], initialIndex: number) {
  const onClose = vi.fn();
  const parentOnClick = vi.fn();
  render(
    <div onClick={parentOnClick}>
      <ImageLightbox
        images={images}
        initialIndex={initialIndex}
        onClose={onClose}
      />
    </div>,
  );
  return { onClose, parentOnClick };
}

// The lightbox portals into document.body via createPortal, and its
// backdrop is a bare decorative div with no accessible role/name — the
// only way to reach it is by its own class name.
function getBackdrop(): HTMLElement {
  // eslint-disable-next-line testing-library/no-node-access
  return document.body.querySelector('.backdrop-blur-sm') as HTMLElement;
}

describe('ImageLightbox', () => {
  it('renders the image at the initial index', () => {
    renderLightbox(makeImages(3), 1);

    expect(screen.getByAltText('Image 2')).toBeInTheDocument();
  });

  it.each([
    { description: 'a single image', count: 1, initialIndex: 0, buttons: 1 },
    {
      description: 'the first of several images',
      count: 3,
      initialIndex: 0,
      buttons: 2,
    },
    {
      description: 'the last of several images',
      count: 3,
      initialIndex: 2,
      buttons: 2,
    },
    { description: 'a middle image', count: 3, initialIndex: 1, buttons: 3 },
  ])(
    'shows $buttons buttons (close + available nav) for $description',
    ({ count, initialIndex, buttons }) => {
      renderLightbox(makeImages(count), initialIndex);

      expect(screen.getAllByRole('button')).toHaveLength(buttons);
    },
  );

  it.each([
    { description: 'only one image', count: 1, expectVisible: false },
    { description: 'multiple images', count: 3, expectVisible: true },
  ])(
    'shows the position counter only with $description',
    ({ count, expectVisible }) => {
      renderLightbox(makeImages(count), 0);

      const counter = screen.queryByText(`1 / ${count}`);
      expect(counter !== null).toBe(expectVisible);
    },
  );

  it('calls onClose when the backdrop is clicked', () => {
    const { onClose } = renderLightbox(makeImages(2), 0);

    fireEvent.click(getBackdrop());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', () => {
    const { onClose } = renderLightbox(makeImages(2), 0);

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const { onClose } = renderLightbox(makeImages(2), 0);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      description: 'ArrowRight moves forward when there is a next image',
      key: 'ArrowRight',
      initialIndex: 0,
      expectedAlt: 'Image 2',
    },
    {
      description: 'ArrowLeft moves backward when there is a previous image',
      key: 'ArrowLeft',
      initialIndex: 1,
      expectedAlt: 'Image 1',
    },
    {
      description: 'ArrowRight is a no-op at the last image',
      key: 'ArrowRight',
      initialIndex: 2,
      expectedAlt: 'Image 3',
    },
    {
      description: 'ArrowLeft is a no-op at the first image',
      key: 'ArrowLeft',
      initialIndex: 0,
      expectedAlt: 'Image 1',
    },
  ])('$description', ({ key, initialIndex, expectedAlt }) => {
    renderLightbox(makeImages(3), initialIndex);

    fireEvent.keyDown(window, { key });

    expect(screen.getByAltText(expectedAlt)).toBeInTheDocument();
  });

  it('moves to the previous image when the prev button is clicked', () => {
    renderLightbox(makeImages(3), 1);

    const [, prevButton] = screen.getAllByRole('button');
    fireEvent.click(prevButton);

    expect(screen.getByAltText('Image 1')).toBeInTheDocument();
  });

  it('moves to the next image when the next button is clicked', () => {
    renderLightbox(makeImages(3), 1);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    expect(screen.getByAltText('Image 3')).toBeInTheDocument();
  });

  it('does not bubble to a react-tree ancestor when the caption is clicked', () => {
    const { parentOnClick } = renderLightbox(makeImages(2), 0);

    fireEvent.click(screen.getByText('Image 1'));

    expect(parentOnClick).not.toHaveBeenCalled();
  });
});
