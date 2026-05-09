import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types';

interface WishlistState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
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
      isInWishlist: (id) => !!get().items.find((i) => i.id === id),
    }),
    { name: 'mamazon-wishlist' }
  )
);
