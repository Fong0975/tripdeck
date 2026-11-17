import type { ChecklistItem, ItemSpec } from '@/types';

export type EditSpec = ItemSpec;

export type EditItem = ChecklistItem & {
  _deleted?: boolean;
  /**
   * Set by the single-category template editor when a saved item is moved
   * out: the id of the category it will be moved to on save.
   */
  _movedTo?: number;
};

export type EditCategory = {
  id: number;
  name: string;
  items: EditItem[];
  _deleted?: boolean;
};

export type EditOccasion = {
  id: number;
  name: string;
  _deleted?: boolean;
};
