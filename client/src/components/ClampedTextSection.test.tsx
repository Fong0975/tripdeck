import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockElementOverflow } from '@/test-utils/dom';

import ClampedTextSection from './ClampedTextSection';

describe('ClampedTextSection', () => {
  it('renders markdown syntax as formatted content by default', () => {
    render(
      <ClampedTextSection content='**bold text**' showBottomDivider={false} />,
    );

    const bold = screen.getByText('bold text');
    expect(bold.tagName).toBe('STRONG');
  });

  it('renders markdown syntax as literal text when markdown is disabled', () => {
    render(
      <ClampedTextSection
        content='**bold text**'
        showBottomDivider={false}
        markdown={false}
      />,
    );

    expect(screen.getByText('**bold text**')).toBeInTheDocument();
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
        <ClampedTextSection
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
        <ClampedTextSection
          content='內容'
          showBottomDivider={showBottomDivider}
        />,
      );

      expect(screen.getAllByRole('separator')).toHaveLength(expectedSeparators);
    },
  );

  describe('when the content overflows its clamp', () => {
    beforeEach(() =>
      mockElementOverflow({ scrollHeight: 100, clientHeight: 40 }),
    );

    it('shows a toggle button that switches between 展開 and 收起', async () => {
      const user = userEvent.setup();
      render(
        <ClampedTextSection
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
          <ClampedTextSection
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
          <ClampedTextSection
            content='第一段內容範例文字'
            showBottomDivider={false}
          />
          <ClampedTextSection
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
    beforeEach(() =>
      mockElementOverflow({ scrollHeight: 40, clientHeight: 40 }),
    );

    it('does not show a toggle button', () => {
      render(<ClampedTextSection content='短內容' showBottomDivider={false} />);

      expect(screen.queryByText('展開')).not.toBeInTheDocument();
    });
  });
});
