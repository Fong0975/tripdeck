import { vi } from 'vitest';

/**
 * jsdom does not run layout, so `scrollHeight`/`clientHeight` are always 0.
 * Stubs both on `HTMLElement.prototype` to simulate a specific overflow state.
 *
 * jsdom defines these getters on `Element.prototype`, so restoring simply
 * deletes the own properties added here; calling it more than once (or after
 * stubbing again) is safe.
 *
 * @param heights - The `scrollHeight` and `clientHeight` every element reports.
 * @returns A function that removes the stubs.
 */
export function mockElementOverflow({
  scrollHeight,
  clientHeight,
}: {
  scrollHeight: number;
  clientHeight: number;
}): () => void {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: clientHeight,
  });
  return () => {
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  };
}

/**
 * Builds a `window.matchMedia` implementation whose queries all report
 * `matches`. jsdom does not implement `matchMedia`.
 *
 * @param matches - The `matches` value every returned `MediaQueryList` has.
 * @returns A `matchMedia`-compatible function.
 */
export function createMatchMedia(
  matches: boolean,
): (query: string) => MediaQueryList {
  return query =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList;
}
