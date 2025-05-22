
'use server';

import type { Sale, Part, Customer } from '@/lib/types';
import { readData, writeData } from '@/lib/file-data-utils';
import { revalidatePath } from 'next/cache';

const SALES_FILE = 'sales.json';
const PARTS_FILE = 'parts.json';
const CUSTOMERS_FILE = 'customers.json';

export async function getSales(): Promise<Sale[]> {
  return readData<Sale[]>(SALES_FILE, []);
}

export async function getInventoryParts(): Promise<Part[]> {
  return readData<Part[]>(PARTS_FILE, []);
}

export async function getCustomers(): Promise<Customer[]> {
  return readData<Customer[]>(CUSTOMERS_FILE, []);
}

export async function addSale(newSale: Sale): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Add Sale
    let sales = await getSales();
    sales.unshift(newSale); // Add to the beginning for chronological order display
    await writeData(SALES_FILE, sales);

    // 2. Update Inventory Parts
    let parts = await getInventoryParts();
    let inventoryUpdated = false;
    for (const saleItem of newSale.items) {
      const partIndex = parts.findIndex(p => p.partNumber === saleItem.partNumber && p.mrp === `₹${saleItem.unitPrice.toFixed(2)}`); // Match on MRP too
      if (partIndex !== -1) {
        parts[partIndex].quantity = Math.max(0, parts[partIndex].quantity - saleItem.quantitySold);
        inventoryUpdated = true;
      }
    }
    if (inventoryUpdated) {
      await writeData(PARTS_FILE, parts);
    }

    // 3. Update or Add Customer and their balance
    let customers = await getCustomers();
    const existingCustomerIndex = customers.findIndex(c => c.name.toLowerCase() === newSale.buyerName.toLowerCase());
    let customerMessage = "";

    if (existingCustomerIndex !== -1) {
      const existingCustomer = customers[existingCustomerIndex];
      let currentBalance = Number(existingCustomer.balance) || 0;
      if (newSale.paymentType === 'credit') {
        currentBalance += newSale.netAmount;
      }
      customers[existingCustomerIndex] = {
        ...existingCustomer,
        email: newSale.emailAddress || existingCustomer.email,
        phone: newSale.contactDetails || existingCustomer.phone,
        balance: currentBalance,
      };
      customerMessage = `Customer ${existingCustomer.name} balance updated.`;
    } else {
      const newCustomer: Customer = {
        id: `CUST${Date.now().toString().slice(-5)}`,
        name: newSale.buyerName,
        email: newSale.emailAddress,
        phone: newSale.contactDetails,
        balance: newSale.paymentType === 'credit' ? newSale.netAmount : 0,
      };
      customers.unshift(newCustomer);
      customerMessage = `New customer ${newCustomer.name} added.`;
    }
    await writeData(CUSTOMERS_FILE, customers);

    revalidatePath('/sales');
    revalidatePath('/inventory'); // Because stock changed
    revalidatePath('/customers'); // Because customer list/balance might have changed
    revalidatePath('/dashboard'); // Dashboard shows sales/customer data

    return { success: true, message: `Sale ${newSale.id} recorded. ${customerMessage}` };
  } catch (error) {
    console.error('Error in addSale:', error);
    return { success: false, message: 'Failed to record sale.' };
  }
}

export async function updateSalePaymentType(saleId: string, newPaymentType: 'cash' | 'credit'): Promise<{ success: boolean; message: string }> {
  try {
    let sales = await getSales();
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) {
      return { success: false, message: 'Sale not found.' };
    }

    const saleToUpdate = sales[saleIndex];
    const oldPaymentType = saleToUpdate.paymentType;
    saleToUpdate.paymentType = newPaymentType;
    await writeData(SALES_FILE, sales);

    // Adjust customer balance
    if (oldPaymentType !== newPaymentType) {
      let customers = await getCustomers();
      const customerIndex = customers.findIndex(c => c.name.toLowerCase() === saleToUpdate.buyerName.toLowerCase());
      if (customerIndex !== -1) {
        let currentBalance = Number(customers[customerIndex].balance) || 0;
        if (newPaymentType === 'cash' && oldPaymentType === 'credit') {
          currentBalance -= saleToUpdate.netAmount;
        } else if (newPaymentType === 'credit' && oldPaymentType === 'cash') {
          currentBalance += saleToUpdate.netAmount;
        }
        customers[customerIndex].balance = Math.max(0, currentBalance);
        await writeData(CUSTOMERS_FILE, customers);
      }
    }

    revalidatePath('/sales');
    revalidatePath('/customers');
    revalidatePath('/dashboard');
    return { success: true, message: `Sale ${saleId} payment type updated.` };
  } catch (error) {
    console.error('Error in updateSalePaymentType:', error);
    return { success: false, message: 'Failed to update payment type.' };
  }
}

