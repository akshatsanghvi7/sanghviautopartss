
export type User = {
  id: string;
  username: string;
  // In a real app, never store passwords like this
  // For this mock, we might not even need a password field on User if login is simulated
};

export type UserProfile = {
  username: string; // Acts as the ID
  fullName: string;
  email: string;
  // avatarUrl?: string; // Removed
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
  mrp: string; // Stores value like "₹100.00"
  shelf?: string;
  supplierId?: string;
};

export type SaleItem = {
  partNumber: string;
  partName: string;
  quantitySold: number;
  unitPrice: number; // Price at the time of sale
  itemTotal: number; // quantitySold * unitPrice
};

export type Sale = {
  id: string; // Unique sale identifier (e.g., timestamp or UUID)
  date: string; // ISO string
  buyerName: string;
  gstNumber?: string;
  contactDetails?: string;
  emailAddress?: string;
  items: SaleItem[];
  subTotal: number; // Sum of all itemTotals
  discount?: number; // Discount amount
  netAmount: number; // subTotal - discount
  paymentType: 'cash' | 'credit';
  status?: 'Completed' | 'Cancelled'; // New field for sale status
  // billSent?: boolean; // Could be added later
};

export type PurchaseItem = {
  partNumber: string;
  partName: string; // For display on PO, fetched from inventory
  quantityPurchased: number;
  unitCost: number; // Cost for this specific purchase transaction
  itemTotal: number; // quantityPurchased * unitCost
};

export type Purchase = {
  id: string; // Unique PO identifier
  date: string; // ISO string for purchase date
  supplierId?: string; // Store ID of the supplier
  supplierName: string;
  supplierInvoiceNumber?: string; // Optional
  items: PurchaseItem[];
  subTotal: number; // Sum of all PurchaseItem.itemTotal
  shippingCosts?: number;
  otherCharges?: number;
  netAmount: number; // subTotal + shippingCosts + otherCharges
  paymentType: 'cash' | 'bank_transfer' | 'on_credit' | 'cheque';
  status: 'Pending' | 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled';
  notes?: string; // Optional field for any notes
  paymentSettled?: boolean; // Tracks if an 'on_credit' purchase has been paid. Defaults to false.
};


export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  balance: number; 
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  balance: number; // Represents amount owed to supplier. Positive means we owe them.
};
