import { render, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType } from 'react';

/**
 * Creates a `userEvent` instance with no artificial delay between actions.
 *
 * @returns The configured user-event instance.
 */
export function setupUser() {
  return userEvent.setup({ delay: null });
}

/**
 * Builds a render function for `Component` whose props start from fresh
 * `defaults()` on every call and can be partially overridden.
 *
 * @param Component - The component under test.
 * @param defaults - Factory for the default props; called once per render so
 *   each render gets its own `vi.fn()` callbacks. It is excluded from type
 *   inference so optional props it omits can still be passed as overrides.
 * @returns A function that renders the component and also returns the props
 *   it was rendered with.
 */
export function makeMounter<P extends object>(
  Component: ComponentType<P>,
  defaults: () => NoInfer<P>,
) {
  return (overrides: Partial<P> = {}): RenderResult & { props: P } => {
    const props = { ...defaults(), ...overrides };
    return { ...render(<Component {...props} />), props };
  };
}
