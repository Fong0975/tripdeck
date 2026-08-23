import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ClampedMarkdownSection from './ClampedMarkdownSection';

describe('ClampedMarkdownSection', () => {
  it('renders the markdown content', () => {
    render(
      <ClampedMarkdownSection
        content='這是一段備註內容'
        showBottomDivider={false}
      />,
    );

    expect(screen.getByText('這是一段備註內容')).toBeInTheDocument();
  });

  it.each([
    {
      description: 'a label is provided',
      label: '附近景點',
      expectPresent: true,
    },
    {
      description: 'no label is provided',
      label: undefined,
      expectPresent: false,
    },
  ])(
    'renders the heading only when $description',
    ({ label, expectPresent }) => {
      render(
        <ClampedMarkdownSection
          content='內容'
          label={label}
          showBottomDivider={false}
        />,
      );

      if (expectPresent) {
        expect(screen.getByText('附近景點')).toBeInTheDocument();
      } else {
        expect(screen.queryByText('附近景點')).not.toBeInTheDocument();
      }
    },
  );

  it.each([
    { showBottomDivider: true, expectedSeparators: 2 },
    { showBottomDivider: false, expectedSeparators: 1 },
  ])(
    'renders $expectedSeparators <hr> when showBottomDivider=$showBottomDivider',
    ({ showBottomDivider, expectedSeparators }) => {
      render(
        <ClampedMarkdownSection
          content='內容'
          showBottomDivider={showBottomDivider}
        />,
      );

      expect(screen.getAllByRole('separator')).toHaveLength(expectedSeparators);
    },
  );

  describe('when the content overflows its clamp', () => {
    beforeEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        value: 100,
      });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        value: 40,
      });
    });

    afterEach(() => {
      delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
      delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
    });

    it('shows a toggle button that switches between 展開 and 收起', async () => {
      const user = userEvent.setup();
      render(
        <ClampedMarkdownSection
          content='很長很長的內容範例文字'
          showBottomDivider={false}
        />,
      );

      expect(screen.getByText('展開')).toBeInTheDocument();

      await user.click(screen.getByText('展開'));

      expect(screen.getByText('收起')).toBeInTheDocument();
    });

    it('does not bubble a click to the parent when the toggle is clicked', async () => {
      const user = userEvent.setup();
      const onParentClick = vi.fn();
      render(
        <div onClick={onParentClick}>
          <ClampedMarkdownSection
            content='很長很長的內容範例文字'
            showBottomDivider={false}
          />
        </div>,
      );

      await user.click(screen.getByText('展開'));

      expect(onParentClick).not.toHaveBeenCalled();
    });

    it('keeps two instances expand/collapse state independent of each other', async () => {
      const user = userEvent.setup();
      render(
        <>
          <ClampedMarkdownSection
            content='第一段內容範例文字'
            showBottomDivider={false}
          />
          <ClampedMarkdownSection
            content='第二段內容範例文字'
            label='附近景點'
            showBottomDivider={false}
          />
        </>,
      );
      const [firstToggle, secondToggle] = screen.getAllByText('展開');

      await user.click(firstToggle);

      expect(screen.getByText('收起')).toBeInTheDocument();
      expect(secondToggle).toHaveTextContent('展開');
    });
  });

  describe('when the content does not overflow its clamp', () => {
    beforeEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        value: 40,
      });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        value: 40,
      });
    });

    afterEach(() => {
      delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
      delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
    });

    it('does not show a toggle button', () => {
      render(
        <ClampedMarkdownSection content='短內容' showBottomDivider={false} />,
      );

      expect(screen.queryByText('展開')).not.toBeInTheDocument();
    });
  });
});
