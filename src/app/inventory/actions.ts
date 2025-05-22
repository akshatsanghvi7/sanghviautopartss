
'use server';

import type { Part } from '@/lib/types';
import { readData, writeData } from '@/lib/file-data-utils';
import { revalidatePath } from 'next/cache';

const PARTS_FILE = 'parts.json';

export async function getParts(): Promise<Part[]> {
  return readData<Part[]>(PARTS_FILE, []);
}

export async function addOrUpdatePart(partData: Part): Promise<{ success: boolean; message: string }> {
  try {
    let parts = await getParts();
    const existingPartIndex = parts.findIndex(
      (p) => p.partNumber === partData.partNumber && p.mrp === partData.mrp
    );

    if (existingPartIndex !== -1) {
      // Update existing part
      parts[existingPartIndex] = {
        ...parts[existingPartIndex],
        partName: partData.partName,
        otherName: partData.otherName,
        company: partData.company,
        quantity: partData.quantity, // This replaces quantity for form "add/update"
        category: partData.category,
        shelf: partData.shelf,
      };
    } else {
      // Add new part
      parts.push(partData);
    }
    await writeData(PARTS_FILE, parts);
    revalidatePath('/inventory');
    return { success: true, message: existingPartIndex !== -1 ? 'Part updated successfully.' : 'Part added successfully.' };
  } catch (error) {
    console.error('Error in addOrUpdatePart:', error);
    return { success: false, message: 'Failed to save part.' };
  }
}

export async function importParts(importedParts: Part[]): Promise<{ success: boolean; message: string, addedCount: number, updatedCount: number }> {
  try {
    let currentParts = await getParts();
    let addedCount = 0;
    let updatedCount = 0;

    importedParts.forEach(importedPart => {
      const existingPartIndex = currentParts.findIndex(
        p => p.partNumber === importedPart.partNumber && p.mrp === importedPart.mrp
      );
      if (existingPartIndex !== -1) {
        // Update existing part: add quantity, update other details
        currentParts[existingPartIndex].quantity += importedPart.quantity;
        currentParts[existingPartIndex].partName = importedPart.partName;
        currentParts[existingPartIndex].otherName = importedPart.otherName;
        currentParts[existingPartIndex].company = importedPart.company;
        currentParts[existingPartIndex].category = importedPart.category;
        currentParts[existingPartIndex].shelf = importedPart.shelf;
        updatedCount++;
      } else {
        // Add new part
        currentParts.push(importedPart);
        addedCount++;
      }
    });

    await writeData(PARTS_FILE, currentParts);
    revalidatePath('/inventory');
    return { success: true, message: `Import complete. ${addedCount} added, ${updatedCount} updated.`, addedCount, updatedCount };
  } catch (error) {
    console.error('Error in importParts:', error);
    return { success: false, message: 'Failed to import parts.', addedCount: 0, updatedCount: 0 };
  }
}

export async function deletePartAction(partIdentifier: { partNumber: string; mrp: string }): Promise<{ success: boolean; message: string }> {
  try {
    let parts = await getParts();
    const updatedParts = parts.filter(
      (p) => !(p.partNumber === partIdentifier.partNumber && p.mrp === partIdentifier.mrp)
    );
    if (parts.length === updatedParts.length) {
      return { success: false, message: 'Part not found for deletion.' };
    }
    await writeData(PARTS_FILE, updatedParts);
    revalidatePath('/inventory');
    return { success: true, message: 'Part deleted successfully.' };
  } catch (error) {
    console.error('Error in deletePartAction:', error);
    return { success: false, message: 'Failed to delete part.' };
  }
}
