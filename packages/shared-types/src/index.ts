// Shared Types
export type User = { id: string };

export interface VaultItem {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultData {
  items: VaultItem[];
}
