export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: 'face' | 'body' | 'oils' | 'combos' | 'wigs';
  isPopular?: boolean;
  createdAt?: number;
  comboItems?: string[]; // Array of product IDs included in the combo
}

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = 'pending_payment' | 'paid' | 'pending' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';

export interface DeliveryLocation {
  id: string;
  name: string;
  fee: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  items: CartItem[];
  total: number;
  deliveryFee: number;
  finalTotal: number;
  customerName: string;
  customerPhone: string;
  deliveryZone: string;
  deliveryAddress?: string;
  paymentMethod: 'delivery';
  status: OrderStatus;
  orderTrackingId?: string;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  approved: boolean;
}
