
'use server';

import type { Purchase, Part, Supplier, PurchaseItem } from '@/lib/types';
import { readData, writeData } from '@/lib/file-data-utils';
import { revalidatePath } from 'next/cache';

const PURCHASES_FILE = 'purchases.json';
const PARTS_FILE = 'parts.json';
const SUPPLIERS_FILE = 'suppliers.json';

export async function getPurchases(): Promise<Purchase[]> {
  return readData<Purchase[]>(PURCHASES_FILE, []);
}

export async function getInventoryParts(): Promise<Part[]> {
  return readData<Part[]>(PARTS_FILE, []);
}

export async function getSuppliers(): Promise<Supplier[]> {
  return readData<Supplier[]>(SUPPLIERS_FILE, []);
}

export async function addPurchase(newPurchase: Purchase): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Add Purchase
    let purchases = await getPurchases();
    purchases.unshift(newPurchase);
    await writeData(PURCHASES_FILE, purchases);

    // 2. Update Inventory if status is 'Received'
    if (newPurchase.status === 'Received') {
      let parts = await getInventoryParts();
      for (const purchaseItem of newPurchase.items) {
        const partIndex = parts.findIndex(p => p.partNumber === purchaseItem.partNumber && p.mrp === `₹${purchaseItem.unitCost.toFixed(2)}`); // Assuming unitCost reflects MRP for this transaction's variant
        if (partIndex !== -1) {
          parts[partIndex].quantity += purchaseItem.quantityPurchased;
        } else {
          // If part-MRP combo doesn't exist, we might need a strategy. For now, assume it should exist or be added separately.
          // Or, if new parts are expected to be created via PO:
          // parts.push({ partName: purchaseItem.partName, partNumber: purchaseItem.partNumber, quantity: purchaseItem.quantityPurchased, mrp: `₹${purchaseItem.unitCost.toFixed(2)}`, category: 'Default' /* or from form */ });
        }
      }
      await writeData(PARTS_FILE, parts);
    }

    // 3. Update or Add Supplier and their balance
    let suppliers = await getSuppliers();
    const formSupplierNameTrimmed = newPurchase.supplierName.trim();
    let supplierIdToUse = newPurchase.supplierId;
    let existingSupplier = supplierIdToUse ? suppliers.find(s => s.id === supplierIdToUse) : undefined;
    
    if (!existingSupplier && formSupplierNameTrimmed) {
        existingSupplier = suppliers.find(s => s.name.trim().toLowerCase() === formSupplierNameTrimmed.toLowerCase());
        if(existingSupplier) supplierIdToUse = existingSupplier.id;
    }

    let supplierMessage = "";
    if (existingSupplier) {
      existingSupplier.name = formSupplierNameTrimmed; // Update name if changed
      // Update contact details if provided (assuming they are part of newPurchase if form was extended)
      // existingSupplier.contactPerson = newPurchase.supplierContactPerson || existingSupplier.contactPerson;
      // existingSupplier.email = newPurchase.supplierEmail || existingSupplier.email;
      // existingSupplier.phone = newPurchase.supplierPhone || existingSupplier.phone;

      if (newPurchase.paymentType === 'on_credit') {
        existingSupplier.balance = (Number(existingSupplier.balance) || 0) + newPurchase.netAmount;
      }
      supplierMessage = `Supplier ${existingSupplier.name} updated.`;
    } else {
      const newSupplierData: Supplier = {
        id: supplierIdToUse || `SUP${Date.now().toString().slice(-5)}`,
        name: formSupplierNameTrimmed,
        // contactPerson: newPurchase.supplierContactPerson,
        // email: newPurchase.supplierEmail,
        // phone: newPurchase.supplierPhone,
        balance: newPurchase.paymentType === 'on_credit' ? newPurchase.netAmount : 0,
      };
      suppliers.unshift(newSupplierData);
      supplierMessage = `New supplier ${newSupplierData.name} added.`;
    }
    await writeData(SUPPLIERS_FILE, suppliers);

    revalidatePath('/purchases');
    revalidatePath('/inventory');
    revalidatePath('/suppliers');
    revalidatePath('/dashboard');
    return { success: true, message: `Purchase ${newPurchase.id} recorded. ${supplierMessage}` };
  } catch (error) {
    console.error('Error in addPurchase:', error);
    return { success: false, message: 'Failed to record purchase.' };
  }
}

export async function updatePurchaseStatus(purchaseId: string, newStatus: Purchase['status']): Promise<{ success: boolean; message: string, inventoryAdjusted: boolean }> {
  try {
    let purchases = await getPurchases();
    const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
    if (purchaseIndex === -1) return { success: false, message: 'Purchase not found.', inventoryAdjusted: false };

    const purchaseToUpdate = purchases[purchaseIndex];
    const oldStatus = purchaseToUpdate.status;
    purchaseToUpdate.status = newStatus;
    await writeData(PURCHASES_FILE, purchases);

    let inventoryAdjusted = false;
    if (oldStatus !== newStatus) {
      let parts = await getInventoryParts();
      let needsWrite = false;
      if (newStatus === 'Received' && oldStatus !== 'Received') {
        // Increase stock
        purchaseToUpdate.items.forEach(item => {
          const partIdx = parts.findIndex(p => p.partNumber === item.partNumber /* && p.mrp matches item.unitCost if that's the logic */);
          if (partIdx !== -1) parts[partIdx].quantity += item.quantityPurchased;
        });
        needsWrite = true;
        inventoryAdjusted = true;
      } else if (newStatus !== 'Received' && oldStatus === 'Received') {
        // Decrease stock
        purchaseToUpdate.items.forEach(item => {
          const partIdx = parts.findIndex(p => p.partNumber === item.partNumber);
          if (partIdx !== -1) parts[partIdx].quantity = Math.max(0, parts[partIdx].quantity - item.quantityPurchased);
        });
        needsWrite = true;
        inventoryAdjusted = true;
      }
      if (needsWrite) await writeData(PARTS_FILE, parts);
    }
    
    revalidatePath('/purchases');
    if (inventoryAdjusted) revalidatePath('/inventory');
    revalidatePath('/dashboard');
    return { success: true, message: `Purchase ${purchaseId} status updated.`, inventoryAdjusted };
  } catch (error) {
    console.error('Error in updatePurchaseStatus:', error);
    return { success: false, message: 'Failed to update status.', inventoryAdjusted: false };
  }
}

export async function updatePurchasePaymentSettled(purchaseId: string, paymentSettled: boolean): Promise<{ success: boolean; message: string }> {
  try {
    let purchases = await getPurchases();
    const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
    if (purchaseIndex === -1) return { success: false, message: 'Purchase not found.' };

    const purchaseToUpdate = purchases[purchaseIndex];
    if (purchaseToUpdate.paymentType !== 'on_credit') return { success: false, message: 'Payment status only applicable to "On Credit" POs.'};

    const oldPaymentSettled = purchaseToUpdate.paymentSettled ?? false;
    purchaseToUpdate.paymentSettled = paymentSettled;
    await writeData(PURCHASES_FILE, purchases);

    // Adjust supplier balance
    if (oldPaymentSettled !== paymentSettled) {
      let suppliers = await getSuppliers();
      const supplierIndex = suppliers.findIndex(s => s.id === purchaseToUpdate.supplierId || s.name.toLowerCase() === purchaseToUpdate.supplierName.toLowerCase());
      if (supplierIndex !== -1) {
        const balanceChange = paymentSettled ? -purchaseToUpdate.netAmount : purchaseToUpdate.netAmount;
        suppliers[supplierIndex].balance = (Number(suppliers[supplierIndex].balance) || 0) + balanceChange;
        await writeData(SUPPLIERS_FILE, suppliers);
      }
    }

    revalidatePath('/purchases');
    revalidatePath('/suppliers');
    revalidatePath('/dashboard');
    return { success: true, message: `Purchase ${purchaseId} payment status updated.` };
  } catch (error) {
    console.error('Error in updatePurchasePaymentSettled:', error);
    return { success: false, message: 'Failed to update payment status.' };
  }
}
