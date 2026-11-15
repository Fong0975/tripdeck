import { useState, type ReactNode } from 'react';

interface Props<P> {
  /** Props used for the first render. */
  initialProps: P;
  /** Derives the props for the next render from the current ones. */
  nextProps: (props: P) => P;
  /** Renders the component under test with the current props. */
  children: (props: P) => ReactNode;
}

/**
 * Test helper for memoization checks. Clicking its `rerender-harness`
 * button re-renders only the harness (with `nextProps(current)`), so context
 * providers rendered above it keep their values and any extra render of the
 * child can be attributed to its own props.
 */
export default function RerenderHarness<P>({
  initialProps,
  nextProps,
  children,
}: Props<P>) {
  const [props, setProps] = useState(initialProps);

  return (
    <>
      <button type='button' onClick={() => setProps(nextProps)}>
        rerender-harness
      </button>
      {children(props)}
    </>
  );
}
