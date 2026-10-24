import { describe, expect, it } from 'vitest';

import { createPinElement } from './markerPin';

describe('createPinElement', () => {
  it('builds a normal-size coloured numbered pin for the selected day', () => {
    const pin = createPinElement('active', '3');

    expect(pin).toHaveTextContent('3');
    expect(pin).toHaveClass('size-8', 'bg-primary');
    expect(pin).not.toHaveClass('bg-gray-400');
  });

  it('builds a small grey unlabelled dot for other days', () => {
    const pin = createPinElement('inactive', '3');

    expect(pin).toBeEmptyDOMElement();
    expect(pin).toHaveClass('size-3', 'bg-gray-400');
    expect(pin).not.toHaveClass('bg-primary');
  });

  it.each(['active', 'inactive'] as const)(
    'centres the %s pin on its point',
    variant => {
      expect(createPinElement(variant, '1')).toHaveStyle({
        transform: 'translateY(50%)',
      });
    },
  );
});
