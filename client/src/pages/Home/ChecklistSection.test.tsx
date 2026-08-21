import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ChecklistSection from './ChecklistSection';

vi.mock('@/components/checklist/template/ChecklistTemplateView', () => ({
  default: () => <div>checklist-template-view</div>,
}));

describe('ChecklistSection', () => {
  it('is collapsed by default, showing the header but not the template view', () => {
    render(<ChecklistSection />);

    expect(screen.getByText('行李清單模板')).toBeInTheDocument();
    expect(
      screen.getByText(
        '管理每次旅程行李清單的分類與項目，新增旅程時會自動複製一份',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('checklist-template-view'),
    ).not.toBeInTheDocument();
  });

  it('toggles the template view when the header button is clicked twice', async () => {
    const user = userEvent.setup();
    render(<ChecklistSection />);
    const toggleButton = screen.getByRole('button');

    await user.click(toggleButton);
    expect(screen.getByText('checklist-template-view')).toBeInTheDocument();

    await user.click(toggleButton);
    expect(
      screen.queryByText('checklist-template-view'),
    ).not.toBeInTheDocument();
  });
});
