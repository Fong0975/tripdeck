import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom does not implement matchMedia; ThemeContext.getInitialTheme() (and
// anything else relying on prefers-color-scheme) needs it defined. Individual
// tests can override this default with vi.spyOn(window, 'matchMedia').
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// jsdom does not implement Element.scrollTo/scrollIntoView; components that
// auto-scroll a container ref (e.g. after adding a new row) call these on
// real DOM elements during tests.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Image previews call the Blob URL APIs. Node's own implementation would
// leak real blob entries and can't be asserted on, so always replace it
// with spies.
URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();

// jsdom does not implement pointer capture; swipeable components capture
// the pointer on pointerdown.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn();
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn();
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
}
