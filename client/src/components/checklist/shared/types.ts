export type EditSpec = {
  id: number;
  name: string;
  storage_location: string | null;
};

export type EditItem = {
  id: number;
  name: string;
  quantity: number | null;
  notes: string | null;
  storage_location: string | null;
  specs: EditSpec[];
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
