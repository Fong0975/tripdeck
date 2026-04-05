// --- Response shapes returned to the client ---

export interface TemplateItemResponse {
  id: number;
  name: string;
  quantity: number | null;
  notes: string | null;
  sortOrder: number;
}

export interface TemplateCategoryResponse {
  id: number;
  name: string;
  sortOrder: number;
  items: TemplateItemResponse[];
}

export interface ChecklistTemplateResponse {
  categories: TemplateCategoryResponse[];
}

export interface TripChecklistItemResponse {
  id: number;
  name: string;
  quantity: number | null;
  notes: string | null;
  sortOrder: number;
}

export interface TripChecklistCategoryResponse {
  id: number;
  name: string;
  sortOrder: number;
  items: TripChecklistItemResponse[];
}

export interface OccasionResponse {
  id: number;
  name: string;
  /** Maps trip item ID to checked state. Only contains items explicitly set to true. */
  checks: Record<number, boolean>;
}

export interface TripChecklistResponse {
  tripId: number;
  categories: TripChecklistCategoryResponse[];
  occasions: OccasionResponse[];
}

// --- Request body shapes ---

export interface CreateCategoryBody {
  name: string;
}

export interface UpdateCategoryBody {
  name: string;
}

export interface CreateItemBody {
  name: string;
  quantity?: number | null;
  notes?: string | null;
}

export interface UpdateItemBody {
  name: string;
  quantity?: number | null;
  notes?: string | null;
}

export interface CreateTripItemBody {
  name: string;
  quantity?: number | null;
  notes?: string | null;
}

export interface UpdateTripItemBody {
  name?: string;
  quantity?: number | null;
  notes?: string | null;
}

export interface CreateOccasionBody {
  name: string;
}

export interface UpdateOccasionBody {
  name: string;
}

export interface SetCheckBody {
  checked: boolean;
}
