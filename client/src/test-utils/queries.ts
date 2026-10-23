import { fireEvent } from '@testing-library/react';

/**
 * DOM query helpers for elements that testing-library's accessible queries
 * cannot reach (unlabelled inputs, decorative backdrops, hidden groups).
 */

/**
 * Returns the first `<input type="file">` inside `container`. Upload inputs
 * have no accessible label, so they can only be reached by their type.
 *
 * @param container - The render container to search.
 * @returns The file input element.
 */
export function getFileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

/**
 * Simulates picking a single file in the container's file input.
 *
 * @param container - The render container holding the file input.
 * @param file - The file to select.
 */
export function selectFile(container: HTMLElement, file: File): void {
  fireEvent.change(getFileInput(container), { target: { files: [file] } });
}

/**
 * Sets the value of an `<input name={name}>` via a change event. Date inputs
 * have no `<label htmlFor>` association, so `name` is the most reliable hook.
 *
 * @param container - The render container holding the input.
 * @param name - The input's `name` attribute.
 * @param value - The value to set.
 */
export function fillDateField(
  container: HTMLElement,
  name: string,
  value: string,
): void {
  const input = container.querySelector(`input[name="${name}"]`)!;
  fireEvent.change(input, { target: { value } });
}

/**
 * Submits the first form in `container` directly. This bypasses native
 * constraint validation (e.g. a date input's `min`) that would otherwise
 * block a submit-button click, so the component's own JS validation runs.
 *
 * @param container - The render container holding the form.
 */
export function submitForm(container: HTMLElement): void {
  const form = container.querySelector('form')!;
  fireEvent.submit(form);
}

/**
 * Builds a `name` matcher for `getByRole` that compares the raw `aria-label`
 * attribute. Collapsed elements (`aria-hidden`/`inert`) have an empty
 * accessible name, so the default string matcher cannot find them.
 *
 * @param label - The exact `aria-label` value to match.
 * @returns A matcher function usable as the `name` option.
 */
export function byAriaLabel(label: string) {
  return (_accessibleName: string, element: Element) =>
    element.getAttribute('aria-label') === label;
}

/**
 * Returns a modal's decorative backdrop. It has no accessible role or name;
 * `.absolute` uniquely identifies it (the modal wrapper itself is `fixed`).
 *
 * @param container - The render container holding the modal.
 * @returns The backdrop element.
 */
export function getBackdrop(container: HTMLElement): HTMLElement {
  return container.querySelector('.absolute') as HTMLElement;
}
