
'use server';

import type { Supplier, Purchase } from '@/lib/types';
import { readData, writeData } from '@/lib/file-data-utils';
import { revalidatePath } from 'next/cache';

const SUPPLIERS_FILE = 'suppliers.json';
const PURCHASES_FILE = 'purchases.json'; // Needed to calculate balances

// Function to get suppliers with balances calculated from purchases
export async function getSuppliersWithCalculatedBalances(): Promise<Supplier[]> {
  const suppliers = await readData<Supplier[]>(SUPPLIERS_FILE, []);
  const purchases = await readData<Purchase[]>(PURCHASES_FILE, []);

  const supplierMap = new Map<string, Supplier>();

  // Initialize map with suppliers from file, ensuring balance is a number
  suppliers.forEach(s => {
    supplierMap.set(s.id, { ...s, balance: Number(s.balance) || 0 });
  });

  // Recalculate balances based on 'on_credit' purchases that are not settled
  // This ensures the displayed balance is "Amount Owed"
  // Reset balances first
  suppliers.forEach(s => {
    const supplierInMap = supplierMap.get(s.id);
    if (supplierInMap) {
        supplierInMap.balance = 0; // Reset before summing up unsettled credit purchases
    }
  });

  purchases.forEach(purchase => {
    if (purchase.paymentType === 'on_credit' && !(purchase.paymentSettled === true)) {
      // Try to find supplier by ID first, then by name if ID is missing (for older data or flexibility)
      let supplier: Supplier | undefined = undefined;
      if (purchase.supplierId) {
        supplier = supplierMap.get(purchase.supplierId);
      }
      if (!supplier) {
        supplier = Array.from(supplierMap.values()).find(s => s.name.toLowerCase() === purchase.supplierName.toLowerCase());
      }
      
      if (supplier) {
        supplier.balance += purchase.netAmount;
      }
    }
  });

  return Array.from(supplierMap.values());
}

export async function updateSupplierBalanceAction(supplierId: string, newBalance: number): Promise<{ success: boolean; message: string }> {
  try {
    let suppliers = await readData<Supplier[]>(SUPPLIERS_FILE, []);
    const supplierIndex = suppliers.findIndex(s => s.id === supplierId);
    if (supplierIndex === -1) {
      return { success: false, message: 'Supplier not found.' };
    }
    suppliers[supplierIndex].balance = newBalance;
    await writeData(SUPPLIERS_FILE, suppliers);
    revalidatePath('/suppliers');
    revalidatePath('/dashboard'); // If dashboard uses supplier balances
    return { success: true, message: 'Supplier balance updated successfully.' };
  } catch (error) {
    console.error('Error in updateSupplierBalanceAction:', error);
    return { success: false, message: 'Failed to update supplier balance.' };
  }
}

export async function deleteSupplierAction(supplierId: string): Promise<{ success: boolean; message: string }> {
  try {
    let suppliers = await readData<Supplier[]>(SUPPLIERS_FILE, []);
    const initialLength = suppliers.length;
    suppliers = suppliers.filter(supplier => supplier.id !== supplierId);

    if (suppliers.length === initialLength) {
      return { success: false, message: 'Supplier not found.' };
    }

    await writeData(SUPPLIERS_FILE, suppliers);
    revalidatePath('/suppliers');
    revalidatePath('/purchases'); // Purchases might reference this supplier
    revalidatePath('/dashboard'); // Supplier count might change
    return { success: true, message: 'Supplier deleted successfully.' };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: 'Failed to delete supplier.' };
  }
}

export async function getAllPurchasesForHistory(): Promise<Purchase[]> {
    return readData<Purchase[]>(PURCHASES_FILE, []);
}
