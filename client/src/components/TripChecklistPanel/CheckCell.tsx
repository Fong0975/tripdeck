import { useEffect, useRef } from 'react';

import type { CheckState } from './checkProgress';

interface Props {
  state: CheckState;
  /** Accessible name of the checkbox. */
  label: string;
  /** Omit to render a read-only cell that only displays a derived state. */
  onToggle?: () => void;
}

/**
 * One occasion column cell holding a checkbox. A `partial` state shows the
 * indeterminate mark; a cell without `onToggle` is read-only.
 */
export default function CheckCell({ state, label, onToggle }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = state === 'partial';
    }
  }, [state]);

  const readOnly = onToggle === undefined;

  return (
    <td
      className={`px-4 py-2.5 text-center ${readOnly ? '' : 'cursor-pointer'}`}
      onClick={onToggle}
    >
      <label
        className={`flex items-center justify-center ${
          readOnly ? '' : 'cursor-pointer'
        }`}
      >
        <input
          ref={inputRef}
          type='checkbox'
          aria-label={label}
          checked={state === 'checked'}
          disabled={readOnly}
          onChange={() => onToggle?.()}
          onClick={e => e.stopPropagation()}
          className={`size-5 rounded-sm border-border accent-primary ${
            readOnly ? '' : 'cursor-pointer'
          }`}
        />
      </label>
    </td>
  );
}
