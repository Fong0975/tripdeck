import { createContext, useContext } from 'react';

import { DEFAULT_LABEL_SET, type LocationLabelSet } from './locationLabelSet';

export const LocationLabelsContext =
  createContext<LocationLabelSet>(DEFAULT_LABEL_SET);

/**
 * Reads the defined location labels. Outside a `LocationLabelsProvider` it
 * yields the default labels.
 */
export function useLocationLabelSet(): LocationLabelSet {
  return useContext(LocationLabelsContext);
}
