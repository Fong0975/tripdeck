import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AttractionReferenceLinks from './AttractionReferenceLinks';

describe('AttractionReferenceLinks', () => {
  it('renders a link for each reference website', () => {
    render(
      <AttractionReferenceLinks
        referenceWebsites={[
          { url: 'https://a.example.com', title: 'Site A' },
          { url: 'https://b.example.com', title: 'Site B' },
        ]}
        showTopDivider={false}
      />,
    );

    expect(screen.getByText('Site A')).toBeInTheDocument();
    expect(screen.getByText('Site B')).toBeInTheDocument();
  });

  it('falls back to the URL when a reference website has no title', () => {
    render(
      <AttractionReferenceLinks
        referenceWebsites={[{ url: 'https://example.com', title: '' }]}
        showTopDivider={false}
      />,
    );

    expect(screen.getByText('https://example.com')).toBeInTheDocument();
  });

  it.each([
    { showTopDivider: true, expectPresent: true },
    { showTopDivider: false, expectPresent: false },
  ])(
    'renders the leading divider only when showTopDivider=$showTopDivider',
    ({ showTopDivider, expectPresent }) => {
      render(
        <AttractionReferenceLinks
          referenceWebsites={[{ url: 'https://example.com', title: 'Site' }]}
          showTopDivider={showTopDivider}
        />,
      );

      if (expectPresent) {
        expect(screen.getByRole('separator')).toBeInTheDocument();
      } else {
        expect(screen.queryByRole('separator')).not.toBeInTheDocument();
      }
    },
  );

  it('does not bubble a click to the parent when a link is clicked', async () => {
    const user = userEvent.setup();
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <AttractionReferenceLinks
          referenceWebsites={[
            { url: 'https://example.com', title: 'Example Site' },
          ]}
          showTopDivider={false}
        />
      </div>,
    );

    await user.click(screen.getByText('Example Site'));

    expect(onParentClick).not.toHaveBeenCalled();
  });
});
