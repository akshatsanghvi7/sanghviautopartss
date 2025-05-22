
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
  
  // Reset balances before recalculating to ensure accuracy if sales are cancelled/payment types change
  Array.from(customerMap.values()).forEach(c => c.balance = 0);
  
  // Recalculate balances based on 'credit' sales that are not 'Cancelled'
  sales.forEach(sale => {
    if (sale.paymentType === 'credit' && sale.status !== 'Cancelled') {
      const customerKey = sale.buyerName.toLowerCase();
      if (customerMap.has(customerKey)) {
        const customer = customerMap.get(customerKey)!;
        customer.balance += sale.netAmount;
      } else {
        // This case should ideally be handled when a sale is made, creating the customer.
        // If a customer exists in sales but not in customers.json, this logic might be needed.
        // For now, we assume customers are added via sales actions.
      }
    }
  });

  return Array.from(customerMap.values()).sort((a,b) => a.name.localeCompare(b.name));
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

export async function updateCustomerBalanceAction(customerId: string, newBalance: number): Promise<{ success: boolean; message: string }> {
  try {
    let customers = await readData<Customer[]>(CUSTOMERS_FILE, []);
    const customerIndex = customers.findIndex(c => c.id === customerId);

    if (customerIndex === -1) {
      return { success: false, message: 'Customer not found.' };
    }

    customers[customerIndex].balance = newBalance;
    await writeData(CUSTOMERS_FILE, customers);
    revalidatePath('/customers');
    return { success: true, message: `Amount Due for ${customers[customerIndex].name} updated to ₹${newBalance.toFixed(2)}.` };
  } catch (error) {
    console.error('Error updating customer balance:', error);
    return { success: false, message: 'Failed to update customer Amount Due.' };
  }
}
