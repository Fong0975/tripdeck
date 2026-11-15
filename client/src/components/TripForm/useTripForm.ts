import { useState } from 'react';

import { addDaysToDateString } from '@/utils/date';

import { validateTripForm, type TripFormValues } from './validateTripForm';

/** Default trip length (in days after the start date) suggested for a new trip. */
const DEFAULT_TRIP_EXTRA_DAYS = 3;

interface Options {
  /**
   * When true, picking a start date suggests an end date a few days later,
   * but only if the end date is empty or would otherwise fall before the new
   * start date; an end date the user already chose is kept.
   */
  autoFillEndDate?: boolean;
}

/**
 * Whether a newly picked start date should replace the current end date with
 * the default suggestion: only when the end date is unset or now invalid.
 * Both values are `yyyy-MM-dd`, so string comparison orders them correctly.
 */
function shouldSuggestEndDate(startDate: string, endDate: string): boolean {
  return !endDate || endDate < startDate;
}

/**
 * Holds the add/edit trip form's values and validation error.
 *
 * @param initialValues - The form's starting values.
 * @param options - See {@link Options}.
 * @returns `values`; `error` — the current validation message (cleared on
 *   any edit); `handleChange` — change handler for the named inputs;
 *   `validate` — runs {@link validateTripForm}, shows its error and returns
 *   whether the values are valid.
 */
export function useTripForm(
  initialValues: TripFormValues,
  { autoFillEndDate = false }: Options = {},
) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setValues(prev => {
      const updated = { ...prev, [name]: value };
      if (
        autoFillEndDate &&
        name === 'startDate' &&
        value &&
        shouldSuggestEndDate(value, prev.endDate)
      ) {
        updated.endDate = addDaysToDateString(value, DEFAULT_TRIP_EXTRA_DAYS);
      }
      return updated;
    });
    setError('');
  };

  const validate = (): boolean => {
    const message = validateTripForm(values);
    if (message) {
      setError(message);
      return false;
    }
    return true;
  };

  return { values, error, handleChange, validate };
}
