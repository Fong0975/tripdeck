import { describe, expect, it } from 'vitest';

import { createPinElement } from './markerPin';

describe('createPinElement', () => {
  it('builds a normal-size coloured numbered pin for the selected day', () => {
    const pin = createPinElement('active', '3');

    expect(pin).toHaveTextContent('3');
    expect(pin).toHaveClass('size-8', 'bg-primary');
    expect(pin).not.toHaveClass('bg-gray-400');
  });

  it.each([
    { label: '12', pill: false },
    { label: '1·4', pill: true },
    { label: '10·12', pill: true },
  ])('uses a pill: $pill for label $label', ({ label, pill }) => {
    const pin = createPinElement('active', label);

    expect(pin).toHaveTextContent(label);
    if (pill) {
      expect(pin).toHaveClass('min-w-8', 'px-2');
      expect(pin).not.toHaveClass('size-8');
    } else {
      expect(pin).toHaveClass('size-8');
    }
  });

  it('builds a grey unlabelled dot with a white rim for other days', () => {
    const pin = createPinElement('inactive', '3');

    expect(pin).toBeEmptyDOMElement();
    expect(pin).toHaveClass(
      'size-5',
      'border-2',
      'border-white',
      'bg-gray-600',
    );
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
