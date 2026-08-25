import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Trip } from '@/types';

import TripHeader from './TripHeader';

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: 'Japan Trip',
    destination: null,
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    createdAt: '2026-08-01',
    ...overrides,
  };
}

/**
 * The collapsed summary and the expanded details section (rendered by the
 * child `TripHeaderSummary`) are both kept mounted at all times, marked via
 * `role='group'` — only one is ever visible (`aria-hidden='false'`) at a
 * time. `hidden: true` is required because `getByRole` otherwise excludes
 * elements hidden via aria-hidden. Presentational behavior of that section
 * is covered by TripHeaderSummary.test.tsx; the tests here cover only what
 * TripHeader itself owns: navigation buttons and the shared expand state.
 *
 * Per the ARIA accname spec, an `aria-hidden="true"` element's computed
 * accessible name is always `""` regardless of its `aria-label` — so a
 * literal `name` string never matches it while collapsed. A matcher
 * function reading the raw `aria-label` attribute sidesteps that.
 */
function byAriaLabel(label: string) {
  return (_accessibleName: string, element: Element) =>
    element.getAttribute('aria-label') === label;
}

function getDetailsGroup() {
  return screen.getByRole('group', {
    name: byAriaLabel('旅程詳細資訊'),
    hidden: true,
  });
}

describe('TripHeader', () => {
  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <TripHeader
        trip={makeTrip()}
        onBack={onBack}
        onExport={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('返回首頁'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onExport when the export button is clicked', async () => {
    const onExport = vi.fn();
    const user = userEvent.setup();
    render(
      <TripHeader
        trip={makeTrip()}
        onBack={vi.fn()}
        onExport={onExport}
        onEdit={vi.fn()}
      />,
    );

    await user.click(screen.getByText('匯出'));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it.each([
    { exporting: false, expectedLabel: '匯出', expectedDisabled: false },
    { exporting: true, expectedLabel: '匯出中…', expectedDisabled: true },
  ])(
    'shows "$expectedLabel" and disabled=$expectedDisabled',
    ({ exporting, expectedLabel, expectedDisabled }) => {
      render(
        <TripHeader
          trip={makeTrip()}
          onBack={vi.fn()}
          onExport={vi.fn()}
          onEdit={vi.fn()}
          exporting={exporting}
        />,
      );

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      const exportButton = screen.getByTitle('匯出行程');
      if (expectedDisabled) {
        expect(exportButton).toBeDisabled();
      } else {
        expect(exportButton).toBeEnabled();
      }
    },
  );

  it('expands on mouse enter and collapses on mouse leave', async () => {
    const user = userEvent.setup();
    render(
      <TripHeader
        trip={makeTrip({ destination: 'Tokyo' })}
        onBack={vi.fn()}
        onExport={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    const title = screen.getByText('Japan Trip');

    expect(getDetailsGroup()).toHaveAttribute('aria-hidden', 'true');

    await user.hover(title);

    expect(getDetailsGroup()).toHaveAttribute('aria-hidden', 'false');

    await user.unhover(title);

    expect(getDetailsGroup()).toHaveAttribute('aria-hidden', 'true');
  });

  it('toggles the details section when the edge chevron button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TripHeader
        trip={makeTrip({ destination: 'Tokyo' })}
        onBack={vi.fn()}
        onExport={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(getDetailsGroup()).toHaveAttribute('aria-hidden', 'true');

    await user.click(screen.getByLabelText('展開旅程詳細資訊'));

    expect(getDetailsGroup()).toHaveAttribute('aria-hidden', 'false');

    await user.click(screen.getByLabelText('收合旅程詳細資訊'));

    expect(getDetailsGroup()).toHaveAttribute('aria-hidden', 'true');
  });
});
