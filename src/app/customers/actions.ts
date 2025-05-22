
'use server';

import type { Customer, Sale } from '@/lib/types';
import { readData, writeData } from '@/lib/file-data-utils';
import { revalidatePath } from 'next/cache';

const CUSTOMERS_FILE = 'customers.json';
const SALES_FILE = 'sales.json'; // Needed to calculate balances

export async function getCustomersWithCalculatedBalances(): Promise<Customer[]> {
  const customers = await readData<Customer[]>(CUSTOMERS_FILE, []);
  const sales = await readData<Sale[]>(SALES_FILE, []);

  const customerMap = new Map<string, Customer>();

  // Initialize map with customers from file, ensuring balance is a number
  customers.forEach(c => {
    customerMap.set(c.name.toLowerCase(), { ...c, balance: Number(c.balance) || 0 });
  });

  // Recalculate balances based on credit sales
  sales.forEach(sale => {
    if (sale.paymentType === 'credit') {
      const customerNameLower = sale.buyerName.toLowerCase();
      const existingCustomer = customerMap.get(customerNameLower);
      if (existingCustomer) {
        existingCustomer.balance += sale.netAmount;
      } else {
        // This case should ideally not happen if customers are added upon sale creation
        // But if it does, create a temporary entry for balance calculation
        customerMap.set(customerNameLower, { 
            id: `TEMP-${Date.now()}`, // Temporary ID
            name: sale.buyerName, 
            balance: sale.netAmount,
            email: sale.emailAddress,
            phone: sale.contactDetails
        });
      }
    }
  });
  
  // Ensure all customers from file are present, even if they had no credit sales affecting balance calculation
  // The balance from file is used as base, then credit sales add to it.
  // If a customer from file isn't in sales, their file balance (or 0 if not numeric) is kept.
  // The previous logic for adding to map already handles this as it starts with customers from file.
  // The critical part is that `customers` from `readData` should be the source of truth for who is a customer,
  // and `sales` data only *adjusts* their balance.
  
  // Let's refine the balance calculation:
  // 1. Start with all customers, balances reset to 0.
  // 2. Add amounts from 'credit' sales.
  
  const finalCustomers: Customer[] = customers.map(c => ({ ...c, balance: 0 })); // Reset balances

  finalCustomers.forEach(customer => {
    sales.forEach(sale => {
      if (sale.buyerName.toLowerCase() === customer.name.toLowerCase() && sale.paymentType === 'credit') {
        customer.balance += sale.netAmount;
      }
    });
  });

  return finalCustomers;
}

// Placeholder for future actions like manual add/edit/delete of customers
// For now, customers are primarily managed via the Sales process.
