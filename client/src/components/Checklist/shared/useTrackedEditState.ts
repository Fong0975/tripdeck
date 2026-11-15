import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Whether two plain-data edit states differ. Edit states are JSON-shaped
 * trees built by the same constructors and updated immutably, so their
 * serialised form is a reliable structural comparison.
 */
export function hasEditChanges<T>(baseline: T, current: T): boolean {
  return JSON.stringify(baseline) !== JSON.stringify(current);
}

/**
 * `useState` for a local edit draft that also reports whether the draft
 * differs from its initial value. Reverting an edit (e.g. retyping the
 * original name, or adding then removing an unsaved row) makes it clean
 * again.
 *
 * @param init - Builds the initial draft; called once on mount.
 * @returns `[draft, setDraft, isDirty]`.
 */
export function useTrackedEditState<T>(
  init: () => T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [baseline] = useState(init);
  const [draft, setDraft] = useState<T>(baseline);
  const isDirty = useMemo(
    () => hasEditChanges(baseline, draft),
    [baseline, draft],
  );
  return [draft, setDraft, isDirty];
}
