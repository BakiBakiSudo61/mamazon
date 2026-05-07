import { api } from './client';
import type { Store, Product } from '../types';

export const sellerApi = {
  createStore: (data: {
    store_name: string;
    description?: string;
  }) => api.post<Store>('/stores', data),

  getStore: (id: string) => api.get<Store>(`/stores/${id}`),

  getStoreProducts: (id: string) =>
    api.get<{ products: Product[] }>(`/stores/${id}/products`),

  getDashboard: () =>
    api.get<{ store: Store; products: Product[]; recent_sales: number; total_revenue: number }>(
      '/seller/dashboard'
    ),

  createProduct: (data: Partial<Product>) =>
    api.post<Product>('/seller/products', data),

  updateProduct: (id: string, data: Partial<Product>) =>
    api.put<Product>(`/seller/products/${id}`, data),

  deleteProduct: (id: string) =>
    api.delete(`/seller/products/${id}`),

  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.postForm<{ url: string }>('/upload/image', form);
  },
};
