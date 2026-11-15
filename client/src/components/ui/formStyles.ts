/** Shared Tailwind classes for standard text/select form inputs used across modals. */
export const INPUT_CLS =
  'border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-hidden focus:ring-2';

/** {@link INPUT_CLS} for multi-line `<textarea>` fields, which must not be user-resizable. */
export const TEXTAREA_CLS = `${INPUT_CLS} resize-none`;

/** Shared Tailwind classes for the label above a form field. */
export const LABEL_CLS = 'mb-1.5 block text-sm font-medium text-foreground';
