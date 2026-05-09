export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  address_json?: string;
  role: 'buyer' | 'seller' | 'both';
  balance: number;
  finance_balance: number;
  created_at: string;
}

export interface Store {
  id: string;
  owner_user_id: string;
  store_name: string;
  description?: string;
  logo_url?: string;
  brand_color?: string;
  rating: number;
  sales_count: number;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  price: string;
  stock: number;
  made_to_order: number;
  category: string;
  condition: string;
  rating: number;
  review_count: number;
  is_featured: number;
  images_json?: string;
  tags_json?: string;
  created_at: string;
  store_name?: string;
  store?: Store;
}

export interface Order {
  id: string;
  buyer_user_id: string;
  total_amount: string;
  payment_method: string;
  shipping_addr: string;
  status: 'ordered' | 'preparing' | 'shipped' | 'delivered' | 'returned';
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  item_count?: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  name?: string;
  images_json?: string;
  product?: Product;
}

export interface SellerSaleItem {
  id: string;
  order_id: string;
  quantity: number;
  unit_price: string;
  order_date: string;
  status: string;
  product_id: string;
  product_name: string;
  images_json?: string;
  buyer_name?: string;
  buyer_email?: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string;
  rating: number;
  title?: string;
  body?: string;
  helpful: number;
  created_at: string;
  // flat fields from JOIN (Workers returns these directly)
  display_name?: string;
  avatar_url?: string;
  user?: User;
}

export interface CartItem {
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface Address {
  zip: string;
  prefecture: string;
  city: string;
  line1: string;
  line2?: string;
  name: string;
  phone: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface ProductsQuery {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
  sort?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'recent_bought';
  min_price?: string;
  max_price?: string;
}
