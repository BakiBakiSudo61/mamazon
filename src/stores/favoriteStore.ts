import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types';

interface FavoriteState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => set((state) => {
        if (state.items.find((i) => i.id === product.id)) return state;
        return { items: [...state.items, product] };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      })),
      isFavorite: (id) => !!get().items.find((i) => i.id === id),
    }),
    { name: 'mamazon-favorite' }
  )
);
