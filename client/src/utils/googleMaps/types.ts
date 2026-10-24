/**
 * The small slice of the Google Maps JavaScript API this app uses, typed by
 * hand so the project needs no extra type package. Only the members actually
 * called are declared.
 */

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface LatLngBoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapInstance {
  fitBounds(bounds: LatLngBoundsLiteral, padding?: number): void;
  setCenter(center: LatLngLiteral): void;
  setZoom(zoom: number): void;
}

export interface MapOptions {
  mapId: string;
  center: LatLngLiteral;
  zoom: number;
  mapTypeControl: boolean;
  streetViewControl: boolean;
  fullscreenControl: boolean;
}

export interface MapsLibrary {
  Map: new (element: HTMLElement, options: MapOptions) => MapInstance;
}

export interface AdvancedMarkerInstance {
  map: MapInstance | null;
}

export interface AdvancedMarkerOptions {
  map: MapInstance;
  position: LatLngLiteral;
  content: HTMLElement;
  title: string;
  zIndex: number;
}

export interface MarkerLibrary {
  AdvancedMarkerElement: new (
    options: AdvancedMarkerOptions,
  ) => AdvancedMarkerInstance;
}

export interface GoogleMapsApi {
  importLibrary(name: 'maps'): Promise<MapsLibrary>;
  importLibrary(name: 'marker'): Promise<MarkerLibrary>;
}

export interface MapLibraries {
  maps: MapsLibrary;
  marker: MarkerLibrary;
}

export interface GoogleWindow extends Window {
  google?: { maps?: GoogleMapsApi };
  gm_authFailure?: () => void;
  /** Invoked by the Maps script once the API is fully initialised. */
  __tripdeckMapsReady?: () => void;
}
