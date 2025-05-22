
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
  
  // Recalculate balances based on credit sales for existing customers
  // This ensures that if a customer was added manually or via a non-credit sale first, their balance starts at 0
  // before credit sales are applied.
  const customersWithInitialBalance = customers.map(c => ({...c, balance: 0}));


  customersWithInitialBalance.forEach(customer => {
    sales.forEach(sale => {
      if (sale.buyerName.toLowerCase() === customer.name.toLowerCase() && sale.paymentType === 'credit') {
        customer.balance += sale.netAmount;
      }
    });
  });

  return customersWithInitialBalance;
}

export async function deleteCustomerAction(customerId: string): Promise<{ success: boolean; message: string }> {
  try {
    let customers = await readData<Customer[]>(CUSTOMERS_FILE, []);
    const initialLength = customers.length;
    customers = customers.filter(customer => customer.id !== customerId);

    if (customers.length === initialLength) {
      return { success: false, message: 'Customer not found.' };
    }

    await writeData(CUSTOMERS_FILE, customers);
    revalidatePath('/customers');
    revalidatePath('/dashboard'); // Customer count might change
    return { success: true, message: 'Customer deleted successfully.' };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { success: false, message: 'Failed to delete customer.' };
  }
}
