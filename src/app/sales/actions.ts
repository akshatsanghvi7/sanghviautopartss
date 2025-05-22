
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

export async function addSale(newSale: Omit<Sale, 'status'>): Promise<{ success: boolean; message: string }> {
  try {
    const saleWithStatus: Sale = { ...newSale, status: 'Completed' };
    // 1. Add Sale
    let sales = await getSales();
    sales.unshift(saleWithStatus); 
    await writeData(SALES_FILE, sales);

    // 2. Update Inventory Parts
    let parts = await getInventoryParts();
    let inventoryUpdated = false;
    for (const saleItem of saleWithStatus.items) {
      const partIndex = parts.findIndex(p => p.partNumber === saleItem.partNumber && p.mrp === `₹${saleItem.unitPrice.toFixed(2)}`);
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
    const existingCustomerIndex = customers.findIndex(c => c.name.toLowerCase() === saleWithStatus.buyerName.toLowerCase());
    let customerMessage = "";

    if (existingCustomerIndex !== -1) {
      const existingCustomer = customers[existingCustomerIndex];
      let currentBalance = Number(existingCustomer.balance) || 0;
      if (saleWithStatus.paymentType === 'credit') {
        currentBalance += saleWithStatus.netAmount;
      }
      customers[existingCustomerIndex] = {
        ...existingCustomer,
        email: saleWithStatus.emailAddress || existingCustomer.email,
        phone: saleWithStatus.contactDetails || existingCustomer.phone,
        balance: currentBalance,
      };
      customerMessage = `Customer ${existingCustomer.name} balance updated.`;
    } else {
      const newCustomer: Customer = {
        id: `CUST${Date.now().toString().slice(-5)}`,
        name: saleWithStatus.buyerName,
        email: saleWithStatus.emailAddress,
        phone: saleWithStatus.contactDetails,
        balance: saleWithStatus.paymentType === 'credit' ? saleWithStatus.netAmount : 0,
      };
      customers.unshift(newCustomer);
      customerMessage = `New customer ${newCustomer.name} added.`;
    }
    await writeData(CUSTOMERS_FILE, customers);

    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/customers');
    revalidatePath('/dashboard');

    return { success: true, message: `Sale ${saleWithStatus.id} recorded. ${customerMessage}` };
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
    if (saleToUpdate.status === 'Cancelled') {
      return { success: false, message: 'Cannot change payment type for a cancelled sale.' };
    }
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

export async function cancelSaleAction(saleId: string): Promise<{ success: boolean; message: string }> {
  try {
    let sales = await getSales();
    const saleIndex = sales.findIndex(s => s.id === saleId);

    if (saleIndex === -1) {
      return { success: false, message: 'Sale not found.' };
    }
    const saleToCancel = sales[saleIndex];
    if (saleToCancel.status === 'Cancelled') {
      return { success: false, message: 'Sale is already cancelled.' };
    }

    const oldStatus = saleToCancel.status;
    saleToCancel.status = 'Cancelled';

    // Adjust Inventory: Add back sold items
    let parts = await getInventoryParts();
    let inventoryUpdated = false;
    for (const item of saleToCancel.items) {
      const partIndex = parts.findIndex(p => p.partNumber === item.partNumber && p.mrp === `₹${item.unitPrice.toFixed(2)}`);
      if (partIndex !== -1) {
        parts[partIndex].quantity += item.quantitySold;
        inventoryUpdated = true;
      } else {
        // If part was deleted from inventory after sale, it might not be found. Log this.
        console.warn(`Part ${item.partNumber} with MRP ₹${item.unitPrice.toFixed(2)} not found for inventory reversal during sale cancellation.`);
      }
    }
    if (inventoryUpdated) {
      await writeData(PARTS_FILE, parts);
    }

    // Adjust Customer Balance: If it was a credit sale and not already cancelled
    let customerBalanceUpdated = false;
    if (saleToCancel.paymentType === 'credit' && oldStatus !== 'Cancelled') {
      let customers = await getCustomers();
      const customerIndex = customers.findIndex(c => c.name.toLowerCase() === saleToCancel.buyerName.toLowerCase());
      if (customerIndex !== -1) {
        customers[customerIndex].balance = Math.max(0, (Number(customers[customerIndex].balance) || 0) - saleToCancel.netAmount);
        await writeData(CUSTOMERS_FILE, customers);
        customerBalanceUpdated = true;
      }
    }

    await writeData(SALES_FILE, sales);

    revalidatePath('/sales');
    if (inventoryUpdated) revalidatePath('/inventory');
    if (customerBalanceUpdated) revalidatePath('/customers');
    revalidatePath('/dashboard'); // Dashboard shows sales/customer/inventory data
    revalidatePath('/reports'); // Reports use this data

    return { success: true, message: `Sale ${saleId} has been cancelled. Inventory and customer balance (if applicable) adjusted.` };
  } catch (error) {
    console.error('Error cancelling sale:', error);
    return { success: false, message: 'Failed to cancel sale.' };
  }
}
