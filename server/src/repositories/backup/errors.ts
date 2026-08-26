/** Thrown when an export is requested for a trip ID that does not exist. */
export class TripNotFoundError extends Error {
  constructor(public readonly tripId: number) {
    super(`Trip ${tripId} not found`);
    this.name = 'TripNotFoundError';
  }
}
