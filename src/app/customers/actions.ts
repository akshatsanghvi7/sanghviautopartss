
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
  const customersWithCalculatedBalance = customers.map(customer => {
    let currentBalance = 0; // Start from 0 for calculation
    sales.forEach(sale => {
      if (sale.buyerName.toLowerCase() === customer.name.toLowerCase() && sale.paymentType === 'credit') {
        currentBalance += sale.netAmount;
      }
    });
    // Check if customer already has a manually adjusted balance; if so, that takes precedence.
    // This simple model assumes `customer.balance` from the file is the source of truth *if* it exists and isn't the default 0 from a fresh add.
    // For this version, we recalculate based on sales if the stored balance seems like an uninitialized/default state.
    // A more advanced system would differentiate between calculated and manually set balances.
    // For now, we will directly use the calculated credit sales.
    return { ...customer, balance: currentBalance };
  });


  return customersWithCalculatedBalance;
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
    // Optionally revalidate dashboard if it shows aggregate customer balances
    // revalidatePath('/dashboard'); 
    return { success: true, message: `Amount Due for ${customers[customerIndex].name} updated to ₹${newBalance.toFixed(2)}.` };
  } catch (error) {
    console.error('Error updating customer balance:', error);
    return { success: false, message: 'Failed to update customer Amount Due.' };
  }
}
