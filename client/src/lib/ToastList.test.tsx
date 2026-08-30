import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ToastList } from './ToastList';

describe('ToastList', () => {
  it('renders its children inside a bulleted list', () => {
    render(
      <ToastList>
        <li>項目一</li>
        <li>項目二</li>
      </ToastList>,
    );

    // eslint-disable-next-line testing-library/no-node-access
    const list = screen.getByText('項目一').closest('ul');
    expect(list).not.toBeNull();
    expect(screen.getByText('項目二')).toBeInTheDocument();
  });
});
