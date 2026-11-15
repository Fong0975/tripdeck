import type { ChecklistItem, ItemSpec } from '@/types';

export type EditSpec = ItemSpec;

export type EditItem = ChecklistItem & {
  _deleted?: boolean;
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
