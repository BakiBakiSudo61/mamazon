import { create } from 'zustand';
import { cartApi } from '../api/orders';
import type { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (product_id: string, quantity?: number) => Promise<void>;
  updateItem: (product_id: string, quantity: number) => Promise<void>;
  removeItem: (product_id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalCount: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const res = await cartApi.get();
      set({ items: res.items });
    } catch {
      set({ items: [] });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (product_id, quantity = 1) => {
    await cartApi.addItem(product_id, quantity);
    await get().fetchCart();
  },

  updateItem: async (product_id, quantity) => {
    if (quantity <= 0) {
      await get().removeItem(product_id);
      return;
    }
    await cartApi.updateItem(product_id, quantity);
    await get().fetchCart();
  },

  removeItem: async (product_id) => {
    await cartApi.removeItem(product_id);
    await get().fetchCart();
  },

  clearCart: async () => {
    await cartApi.clear();
    set({ items: [] });
  },

  totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  totalPrice: () =>
    get().items.reduce(
      (sum, i) => sum + i.quantity * (i.product?.price ?? 0),
      0
    ),
}));
