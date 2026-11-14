/** Editable fields shared by the add/edit trip forms. */
export interface TripFormValues {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
}

/**
 * Validates trip form values.
 *
 * @param values - The current form values (dates as `yyyy-MM-dd`).
 * @returns The first user-facing error message, or `null` when valid.
 */
export function validateTripForm(values: TripFormValues): string | null {
  if (!values.title.trim()) {
    return '請輸入旅程名稱';
  }
  if (!values.startDate || !values.endDate) {
    return '請選擇旅遊期間';
  }
  // ISO `yyyy-MM-dd` strings sort lexicographically in date order.
  if (values.endDate < values.startDate) {
    return '結束日期不能早於開始日期';
  }
  return null;
}
