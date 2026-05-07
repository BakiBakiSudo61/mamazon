import { api } from './client';
import type { Product, Review, ProductsQuery } from '../types';

export const productsApi = {
  list: (query: ProductsQuery = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return api.get<{ products: Product[]; total: number }>(
      `/products${qs ? `?${qs}` : ''}`
    );
  },

  get: (id: string) => api.get<Product>(`/products/${id}`),

  search: (q: string, query: ProductsQuery = {}) =>
    productsApi.list({ ...query, q }),

  getReviews: (id: string) => api.get<{ reviews: Review[] }>(`/products/${id}/reviews`),

  getReviewEligibility: (id: string) =>
    api.get<{ eligible: boolean; order_id: string | null; already_reviewed: boolean }>(`/products/${id}/review-eligibility`),

  postReview: (
    id: string,
    data: { rating: number; title?: string; body?: string; order_id: string }
  ) => api.post<Review>(`/products/${id}/reviews`, data),
};
