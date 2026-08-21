import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HeroSection from './HeroSection';

describe('HeroSection', () => {
  it('renders the heading and subheading text', () => {
    render(<HeroSection />);

    expect(
      screen.getByRole('heading', { name: '規劃你的旅程' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('像卡牌一樣排列景點，輕鬆安排每一天的行程'),
    ).toBeInTheDocument();
  });
});
