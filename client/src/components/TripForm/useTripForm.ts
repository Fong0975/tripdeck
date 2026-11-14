import { useState } from 'react';

import { validateTripForm, type TripFormValues } from './validateTripForm';

/** Default trip length (in days after the start date) suggested for a new trip. */
const DEFAULT_TRIP_EXTRA_DAYS = 3;

interface Options {
  /** When true, picking a start date also sets the end date a few days later. */
  autoFillEndDate?: boolean;
}

/**
 * Returns `startDate` (`yyyy-MM-dd`) shifted by `days`, in the same format.
 */
function addDays(startDate: string, days: number): string {
  const end = new Date(startDate);
  end.setDate(end.getDate() + days);
  return end.toISOString().slice(0, 10);
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
      if (autoFillEndDate && name === 'startDate' && value) {
        updated.endDate = addDays(value, DEFAULT_TRIP_EXTRA_DAYS);
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
