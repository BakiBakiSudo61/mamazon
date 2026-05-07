import { api } from './client';
import type { Order, CartItem, Address } from '../types';

export const ordersApi = {
  create: (data: {
    items: CartItem[];
    payment_method: string;
    shipping_addr: Address;
  }) => api.post<Order>('/orders', data),

  get: (id: string) => api.get<Order>(`/orders/${id}`),

  list: () => api.get<{ orders: Order[] }>('/users/me/orders'),
};

export const cartApi = {
  get: () => api.get<{ items: CartItem[] }>('/cart'),
  addItem: (product_id: string, quantity: number) =>
    api.post('/cart/items', { product_id, quantity }),
  updateItem: (product_id: string, quantity: number) =>
    api.put(`/cart/items/${product_id}`, { quantity }),
  removeItem: (product_id: string) =>
    api.delete(`/cart/items/${product_id}`),
  clear: () => api.delete('/cart'),
};
