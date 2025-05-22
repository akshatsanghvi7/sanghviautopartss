
'use server';

import type { Purchase, Part, Supplier, PurchaseItem } from '@/lib/types';
import { readData, writeData } from '@/lib/file-data-utils';
import { revalidatePath } from 'next/cache';

const PURCHASES_FILE = 'purchases.json';
const PARTS_FILE = 'parts.json';
const SUPPLIERS_FILE = 'suppliers.json';
const PO_COUNTER_FILE = 'po_counter.json';

async function getNextPoSequenceNumber(): Promise<number> {
  const currentCounter = await readData<number>(PO_COUNTER_FILE, 0);
  const nextCounter = currentCounter + 1;
  await writeData(PO_COUNTER_FILE, nextCounter);
  return nextCounter;
}

function formatPoId(sequenceNumber: number): string {
  return `PO${String(sequenceNumber).padStart(5, '0')}`;
}

export async function getPurchases(): Promise<Purchase[]> {
  return readData<Purchase[]>(PURCHASES_FILE, []);
}

export async function getInventoryParts(): Promise<Part[]> {
  return readData<Part[]>(PARTS_FILE, []);
}

export async function getSuppliers(): Promise<Supplier[]> {
  return readData<Supplier[]>(SUPPLIERS_FILE, []);
}

export async function addPurchase(newPurchaseDataFromForm: Omit<Purchase, 'id' | 'paymentSettled'> & { paymentSettled?: boolean }): Promise<{ success: boolean; message: string }> {
  try {
    const nextPoSequence = await getNextPoSequenceNumber();
    const newPoId = formatPoId(nextPoSequence);

    const newPurchase: Purchase = {
      ...newPurchaseDataFromForm,
      id: newPoId, // Assign the generated sequential ID
      paymentSettled: newPurchaseDataFromForm.paymentType !== 'on_credit', // Set paymentSettled based on paymentType
    };

    // 1. Add Purchase
    let purchases = await getPurchases();
    purchases.unshift(newPurchase);
    await writeData(PURCHASES_FILE, purchases);

    // 2. Update Inventory if status is 'Received'
    let inventoryUpdatedMessage = "";
    if (newPurchase.status === 'Received') {
      let parts = await getInventoryParts();
      let inventoryModified = false;
      for (const purchaseItem of newPurchase.items) {
        const partIndex = parts.findIndex(p => p.partNumber === purchaseItem.partNumber && p.mrp === `₹${purchaseItem.unitCost.toFixed(2)}`);
        if (partIndex !== -1) {
          parts[partIndex].quantity += purchaseItem.quantityPurchased;
          inventoryModified = true;
        } else {
          // Optionally handle new part creation if needed, or assume part must exist
           parts.push({
            partName: purchaseItem.partName,
            partNumber: purchaseItem.partNumber,
            mrp: `₹${purchaseItem.unitCost.toFixed(2)}`, // Assume unit cost is MRP for new part
            quantity: purchaseItem.quantityPurchased,
            category: 'Default', // Or get from form if available
            otherName: '',
            company: '',
            shelf: ''
          });
          inventoryModified = true;
        }
      }
      if (inventoryModified) {
        await writeData(PARTS_FILE, parts);
        inventoryUpdatedMessage = " Inventory updated.";
      }
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
    let finalSupplierBalance = 0;

    if (existingSupplier) {
      const detailsChanged = 
        (existingSupplier.name.trim().toLowerCase() !== formSupplierNameTrimmed.toLowerCase() && formSupplierNameTrimmed) ||
        (newPurchaseDataFromForm.supplierContactPerson || "") !== (existingSupplier.contactPerson || "") ||
        (newPurchaseDataFromForm.supplierEmail || "") !== (existingSupplier.email || "") ||
        (newPurchaseDataFromForm.supplierPhone || "") !== (existingSupplier.phone || "");

      existingSupplier.name = formSupplierNameTrimmed || existingSupplier.name; // Use existing if new is empty
      existingSupplier.contactPerson = newPurchaseDataFromForm.supplierContactPerson || existingSupplier.contactPerson;
      existingSupplier.email = newPurchaseDataFromForm.supplierEmail || existingSupplier.email;
      existingSupplier.phone = newPurchaseDataFromForm.supplierPhone || existingSupplier.phone;
      
      let currentBalance = Number(existingSupplier.balance) || 0;
      if (newPurchase.paymentType === 'on_credit' && !newPurchase.paymentSettled) { // Only add to balance if it's on_credit and not settled
        currentBalance += newPurchase.netAmount;
      }
      existingSupplier.balance = currentBalance;
      finalSupplierBalance = currentBalance;
      
      if (detailsChanged || currentBalance !== (Number(suppliers.find(s => s.id === existingSupplier!.id)?.balance) || 0) ) { 
          supplierMessage = `Supplier ${existingSupplier.name} updated. Balance Owed: ₹${finalSupplierBalance.toFixed(2)}.`;
      } else {
          supplierMessage = `Purchase recorded with supplier ${existingSupplier.name}. Balance Owed: ₹${finalSupplierBalance.toFixed(2)}.`;
      }

    } else {
      finalSupplierBalance = (newPurchase.paymentType === 'on_credit' && !newPurchase.paymentSettled) ? newPurchase.netAmount : 0;
      const newSupplierData: Supplier = {
        id: supplierIdToUse || `SUP${Date.now().toString().slice(-5)}`,
        name: formSupplierNameTrimmed,
        contactPerson: newPurchaseDataFromForm.supplierContactPerson,
        email: newPurchaseDataFromForm.supplierEmail,
        phone: newPurchaseDataFromForm.supplierPhone,
        balance: finalSupplierBalance,
      };
      suppliers.unshift(newSupplierData);
      supplierMessage = `New supplier ${newSupplierData.name} added. Balance Owed: ₹${finalSupplierBalance.toFixed(2)}.`;
    }
    await writeData(SUPPLIERS_FILE, suppliers);

    revalidatePath('/purchases');
    revalidatePath('/inventory');
    revalidatePath('/suppliers');
    revalidatePath('/dashboard');
    return { success: true, message: `Purchase ${newPurchase.id} recorded. ${supplierMessage}${inventoryUpdatedMessage}` };
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
    

    let inventoryAdjusted = false;
    if (oldStatus !== newStatus) {
      let parts = await getInventoryParts();
      let needsWrite = false;
      if (newStatus === 'Received' && oldStatus !== 'Received') {
        // Increase stock
        purchaseToUpdate.items.forEach(item => {
          const partIdx = parts.findIndex(p => p.partNumber === item.partNumber && p.mrp === `₹${item.unitCost.toFixed(2)}`);
          if (partIdx !== -1) {
             parts[partIdx].quantity += item.quantityPurchased;
             needsWrite = true;
          } else {
            // Part with this MRP might not exist, create it or log warning
            console.warn(`Part ${item.partNumber} with MRP ₹${item.unitCost.toFixed(2)} not found for stock increase. Creating new entry.`);
            parts.push({
              partName: item.partName,
              partNumber: item.partNumber,
              mrp: `₹${item.unitCost.toFixed(2)}`,
              quantity: item.quantityPurchased,
              category: 'Default', // Consider how to get category
              otherName: '',
              company: '',
              shelf: '',
            });
            needsWrite = true;
          }
        });
        inventoryAdjusted = true;
      } else if (newStatus !== 'Received' && oldStatus === 'Received') {
        // Decrease stock
        purchaseToUpdate.items.forEach(item => {
          const partIdx = parts.findIndex(p => p.partNumber === item.partNumber && p.mrp === `₹${item.unitCost.toFixed(2)}`);
          if (partIdx !== -1) {
            parts[partIdx].quantity = Math.max(0, parts[partIdx].quantity - item.quantityPurchased);
            needsWrite = true;
          } else {
             console.warn(`Part ${item.partNumber} with MRP ₹${item.unitCost.toFixed(2)} not found for stock decrease.`);
          }
        });
        inventoryAdjusted = true;
      }
      if (needsWrite) await writeData(PARTS_FILE, parts);
    }
    
    await writeData(PURCHASES_FILE, purchases); // Save purchase status change
    revalidatePath('/purchases');
    if (inventoryAdjusted) {
      revalidatePath('/inventory');
      revalidatePath('/dashboard'); // For low stock alerts
    }
    return { success: true, message: `Purchase ${purchaseId} status updated to ${newStatus}.`, inventoryAdjusted };
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

    const oldPaymentSettled = purchaseToUpdate.paymentSettled ?? false; // Default to false if undefined
    
    // Only proceed if the status actually changes
    if (oldPaymentSettled === paymentSettled) {
        return { success: true, message: `Purchase ${purchaseId} payment status already ${paymentSettled ? 'Paid' : 'Due'}. No change made.` };
    }

    purchaseToUpdate.paymentSettled = paymentSettled;
    
    let suppliers = await getSuppliers();
    const supplierIndex = suppliers.findIndex(s => s.id === purchaseToUpdate.supplierId || s.name.toLowerCase() === purchaseToUpdate.supplierName.toLowerCase());
    
    let supplierBalanceUpdatedMessage = "";

    if (supplierIndex !== -1) {
      const balanceChange = paymentSettled ? -purchaseToUpdate.netAmount : purchaseToUpdate.netAmount;
      suppliers[supplierIndex].balance = (Number(suppliers[supplierIndex].balance) || 0) + balanceChange;
      supplierBalanceUpdatedMessage = ` Supplier ${suppliers[supplierIndex].name}'s balance updated to ₹${suppliers[supplierIndex].balance.toFixed(2)}.`;
      await writeData(SUPPLIERS_FILE, suppliers);
      revalidatePath('/suppliers');
    } else {
        supplierBalanceUpdatedMessage = " Supplier not found for balance update.";
    }
    
    await writeData(PURCHASES_FILE, purchases); // Save purchases file
    revalidatePath('/purchases');
    revalidatePath('/dashboard'); // Dashboard might show supplier balance summaries or related info

    return { success: true, message: `Purchase ${purchaseId} payment status updated to ${paymentSettled ? 'Paid' : 'Due'}.${supplierBalanceUpdatedMessage}` };
  } catch (error) {
    console.error('Error in updatePurchasePaymentSettled:', error);
    return { success: false, message: 'Failed to update payment status.' };
  }
}
