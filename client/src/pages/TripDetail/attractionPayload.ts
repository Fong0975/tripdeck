import type { Attraction, ReferenceWebsite } from '@/types';

/**
 * Create/update API payload for an attraction, where `TEmpty` is the value
 * sent for an unset optional field.
 */
export interface AttractionPayload<TEmpty extends null | undefined> {
  name: string;
  googleMapUrl: string | TEmpty;
  notes: string | TEmpty;
  nearbyAttractions: string | TEmpty;
  startTime: string | TEmpty;
  endTime: string | TEmpty;
  referenceWebsites?: ReferenceWebsite[];
}

/**
 * Maps an edited attraction to the create/update API payload.
 *
 * The two endpoints differ only in how a cleared optional field is sent:
 * create omits it (`undefined`), while update must send `null` so the server
 * actually clears the stored value. Overloads are used instead of a generic
 * because TypeScript does not infer a type parameter from a bare
 * `undefined`/`null` argument (it falls back to the constraint).
 *
 * @param attraction - The attraction as edited in the modal.
 * @param empty - Value used for optional fields that are unset.
 * @returns The payload accepted by `addAttraction` / `updateAttraction`.
 */
export function toAttractionPayload(
  attraction: Attraction,
  empty: undefined,
): AttractionPayload<undefined>;
export function toAttractionPayload(
  attraction: Attraction,
  empty: null,
): AttractionPayload<null>;
export function toAttractionPayload(
  attraction: Attraction,
  empty: null | undefined,
): AttractionPayload<null | undefined>;
export function toAttractionPayload(
  attraction: Attraction,
  empty: null | undefined,
): AttractionPayload<null | undefined> {
  return {
    name: attraction.name,
    googleMapUrl: attraction.googleMapUrl ?? empty,
    notes: attraction.notes ?? empty,
    nearbyAttractions: attraction.nearbyAttractions ?? empty,
    startTime: attraction.startTime ?? empty,
    endTime: attraction.endTime ?? empty,
    referenceWebsites: attraction.referenceWebsites,
  };
}
