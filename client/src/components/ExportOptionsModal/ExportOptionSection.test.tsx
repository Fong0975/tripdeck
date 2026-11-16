import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ExportOptionSection from './ExportOptionSection';

describe('ExportOptionSection', () => {
  it('shows the title, description and children', () => {
    render(
      <ExportOptionSection title='時間軸' description='說明文字'>
        <span>child-content</span>
      </ExportOptionSection>,
    );

    expect(screen.getByRole('heading', { name: '時間軸' })).toBeInTheDocument();
    expect(screen.getByText('說明文字')).toBeInTheDocument();
    expect(screen.getByText('child-content')).toBeInTheDocument();
  });

  it('omits the description when none is given', () => {
    render(
      <ExportOptionSection title='時間軸'>
        <span>child-content</span>
      </ExportOptionSection>,
    );

    expect(screen.queryByText('說明文字')).not.toBeInTheDocument();
  });
});
