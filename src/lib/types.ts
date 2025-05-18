export type User = {
  id: string;
  username: string;
  // In a real app, never store passwords like this
  // For this mock, we might not even need a password field on User if login is simulated
};

export type Part = {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  category?: string; // AI-suggested
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  supplierId?: string; 
  // lowStockThreshold?: number;
};

export type Sale = {
  id: string;
  date: string; // ISO string
  items: { partId: string; quantitySold: number; unitPrice: number }[];
  totalAmount: number;
  paymentType: 'cash' | 'credit';
  customerId?: string; // if credit
  // billSent?: boolean;
};

export type Purchase = {
  id: string;
  date: string; // ISO string
  items: { partId: string; quantityPurchased: number; unitCost: number }[];
  totalAmount: number;
  supplierId: string;
  // paymentStatus?: 'paid' | 'pending';
};

export type Customer = {
  id: string;
  name: string;
  contactInfo?: string;
  balanceDue: number;
};

export type Supplier = {
  id: string;
  name: string;
  contactInfo?: string;
  balanceOwed: number;
};
