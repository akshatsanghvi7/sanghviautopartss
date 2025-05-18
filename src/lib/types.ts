
export type User = {
  id: string;
  username: string;
  // In a real app, never store passwords like this
  // For this mock, we might not even need a password field on User if login is simulated
};

export type Part = {
  partName: string;
  otherName?: string;
  partNumber: string; // Unique identifier
  company?: string;
  description?: string; // Keeping this for potential future use or AI categorization
  category?: string; // AI-suggested or user-defined
  quantity: number;
  costPrice?: number; // Optional for now, as MRP is requested
  sellingPrice?: number; // This could be the same as MRP or different
  mrp: string; // Renamed from price, and as per user request
  shelf?: string;
  supplierId?: string; 
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
