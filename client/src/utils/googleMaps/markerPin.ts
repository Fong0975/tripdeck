/** `active` is a selected-day attraction; `inactive` belongs to another day. */
export type PinVariant = 'active' | 'inactive';

const PIN_CLASSES: Record<PinVariant, string> = {
  active:
    'flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary text-sm font-bold text-primary-foreground shadow-lg',
  inactive:
    'size-3 rounded-full border border-white bg-gray-400 opacity-80 shadow',
};

/**
 * Builds the DOM element drawn as a marker. The selected day's attractions
 * get a normal-size coloured numbered pin; other days get a small grey dot.
 *
 * @param variant - Which style to use.
 * @param label - Text shown inside an active pin (its position in the day).
 */
export function createPinElement(
  variant: PinVariant,
  label: string,
): HTMLElement {
  const pin = document.createElement('div');
  pin.className = PIN_CLASSES[variant];
  // Advanced markers anchor their bottom edge to the point; centre the pin on it instead.
  pin.style.transform = 'translateY(50%)';
  if (variant === 'active') {
    pin.textContent = label;
  }
  return pin;
}
