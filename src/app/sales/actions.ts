
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

export async function addSale(newSaleData: Omit<Sale, 'id' | 'status'>): Promise<{ success: boolean; message: string }> {
  try {
    const newSale: Sale = { 
      ...newSaleData, 
      id: `S${Date.now().toString().slice(-4)}${Math.random().toString(36).substr(2, 2).toUpperCase()}`,
      status: 'Completed' 
    };
    
    let sales = await getSales();
    sales.unshift(newSale); 
    await writeData(SALES_FILE, sales);

    let parts = await getInventoryParts();
    let inventoryUpdated = false;
    for (const saleItem of newSale.items) {
      const partIndex = parts.findIndex(p => p.partNumber === saleItem.partNumber && p.mrp === `₹${saleItem.unitPrice.toFixed(2)}`);
      if (partIndex !== -1) {
        parts[partIndex].quantity = Math.max(0, parts[partIndex].quantity - saleItem.quantitySold);
        inventoryUpdated = true;
      }
    }
    if (inventoryUpdated) {
      await writeData(PARTS_FILE, parts);
    }

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
      customerMessage = `Customer ${existingCustomer.name} balance updated to ₹${currentBalance.toFixed(2)}.`;
    } else {
      const newCustomerBalance = newSale.paymentType === 'credit' ? newSale.netAmount : 0;
      const newCustomer: Customer = {
        id: `CUST${Date.now().toString().slice(-5)}`,
        name: newSale.buyerName,
        email: newSale.emailAddress,
        phone: newSale.contactDetails,
        balance: newCustomerBalance,
      };
      customers.unshift(newCustomer);
      customerMessage = `New customer ${newCustomer.name} added. Amount Due: ₹${newCustomerBalance.toFixed(2)}.`;
    }
    await writeData(CUSTOMERS_FILE, customers);

    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/customers');
    revalidatePath('/dashboard');
    revalidatePath('/reports');

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
    if (saleToUpdate.status === 'Cancelled') {
      return { success: false, message: 'Cannot change payment type for a cancelled sale.' };
    }
    const oldPaymentType = saleToUpdate.paymentType;
    saleToUpdate.paymentType = newPaymentType;
    

    let customerBalanceUpdatedMessage = "";
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
        customerBalanceUpdatedMessage = ` Customer ${customers[customerIndex].name}'s amount due is now ₹${customers[customerIndex].balance.toFixed(2)}.`;
      }
    }
    
    await writeData(SALES_FILE, sales);
    revalidatePath('/sales');
    revalidatePath('/customers');
    revalidatePath('/dashboard');
    return { success: true, message: `Sale ${saleId} payment type updated.${customerBalanceUpdatedMessage}` };
  } catch (error) {
    console.error('Error in updateSalePaymentType:', error);
    return { success: false, message: 'Failed to update payment type.' };
  }
}

export async function cancelSaleAction(saleId: string): Promise<{ success: boolean; message: string }> {
  try {
    let sales = await getSales();
    const saleIndex = sales.findIndex(s => s.id === saleId);

    if (saleIndex === -1) return { success: false, message: 'Sale not found.' };
    
    const saleToCancel = sales[saleIndex];
    if (saleToCancel.status === 'Cancelled') return { success: false, message: 'Sale is already cancelled.' };

    const oldStatus = saleToCancel.status; // Should be 'Completed'
    saleToCancel.status = 'Cancelled';

    let parts = await getInventoryParts();
    let inventoryUpdated = false;
    for (const item of saleToCancel.items) {
      const partIndex = parts.findIndex(p => p.partNumber === item.partNumber && p.mrp === `₹${item.unitPrice.toFixed(2)}`);
      if (partIndex !== -1) {
        parts[partIndex].quantity += item.quantitySold;
        inventoryUpdated = true;
      } else {
        console.warn(`Part ${item.partNumber} with MRP ₹${item.unitPrice.toFixed(2)} not found for inventory reversal.`);
      }
    }
    if (inventoryUpdated) await writeData(PARTS_FILE, parts);

    let customerBalanceUpdated = false;
    if (saleToCancel.paymentType === 'credit' && oldStatus === 'Completed') {
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
    revalidatePath('/dashboard');
    revalidatePath('/reports');

    return { success: true, message: `Sale ${saleId} has been cancelled. Inventory and customer balance (if applicable) adjusted.` };
  } catch (error) {
    console.error('Error cancelling sale:', error);
    return { success: false, message: 'Failed to cancel sale.' };
  }
}

export async function restoreSaleAction(saleId: string): Promise<{ success: boolean; message: string }> {
  try {
    let sales = await getSales();
    const saleIndex = sales.findIndex(s => s.id === saleId);

    if (saleIndex === -1) return { success: false, message: 'Sale not found.' };
    
    const saleToRestore = sales[saleIndex];
    if (saleToRestore.status !== 'Cancelled') return { success: false, message: 'Sale is not cancelled.' };

    saleToRestore.status = 'Completed';

    let parts = await getInventoryParts();
    let inventoryUpdated = false;
    for (const item of saleToRestore.items) {
      const partIndex = parts.findIndex(p => p.partNumber === item.partNumber && p.mrp === `₹${item.unitPrice.toFixed(2)}`);
      if (partIndex !== -1) {
        const newQuantity = parts[partIndex].quantity - item.quantitySold;
        if (newQuantity < 0) {
          // This case means stock is insufficient to restore the sale fully.
          // For simplicity, we'll allow it to go negative, but a real app might prevent or warn.
          console.warn(`Restoring sale ${saleId} for part ${item.partNumber} results in negative stock.`);
        }
        parts[partIndex].quantity = newQuantity;
        inventoryUpdated = true;
      } else {
         // If part was deleted from inventory, it might not be found.
         // Create it back or log warning. For now, log and continue.
        console.warn(`Part ${item.partNumber} with MRP ₹${item.unitPrice.toFixed(2)} not found for inventory deduction during sale restoration.`);
      }
    }
    if (inventoryUpdated) await writeData(PARTS_FILE, parts);

    let customerBalanceUpdated = false;
    if (saleToRestore.paymentType === 'credit') {
      let customers = await getCustomers();
      const customerIndex = customers.findIndex(c => c.name.toLowerCase() === saleToRestore.buyerName.toLowerCase());
      if (customerIndex !== -1) {
        customers[customerIndex].balance = (Number(customers[customerIndex].balance) || 0) + saleToRestore.netAmount;
        await writeData(CUSTOMERS_FILE, customers);
        customerBalanceUpdated = true;
      }
    }

    await writeData(SALES_FILE, sales);
    revalidatePath('/sales');
    if (inventoryUpdated) revalidatePath('/inventory');
    if (customerBalanceUpdated) revalidatePath('/customers');
    revalidatePath('/dashboard');
    revalidatePath('/reports');

    return { success: true, message: `Sale ${saleId} has been restored. Inventory and customer balance (if applicable) adjusted.` };
  } catch (error) {
    console.error('Error restoring sale:', error);
    return { success: false, message: 'Failed to restore sale.' };
  }
}
