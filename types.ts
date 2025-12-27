
export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'completed';

export interface Order {
  order_id: string;
  customer_name: string;
  phone: string;
  order_type: 'pickup' | 'delivery';
  items: string;
  total_amount: string;
  payment_status: string;
  order_status: OrderStatus;
  created_at: string;
}

export interface MenuItem {
  item_id: string;
  item_name: string;
  price: string;
  available: boolean;
}

export interface AppSettings {
  pollingInterval: number;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  spreadsheetId: string;
  googleClientId: string;
  googleClientSecret: string;
}

export enum View {
  ORDERS = 'orders',
  MENU = 'menu',
  SETTINGS = 'settings',
  LOGIN = 'login'
}

export interface GoogleAuthState {
  accessToken: string | null;
  user: {
    email: string;
    name: string;
    picture: string;
  } | null;
}
