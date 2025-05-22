
'use server';

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src/data');

// Ensure data directory exists
async function ensureDataDirExists() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function readData<T>(fileName: string, initialData: T): Promise<T> {
  await ensureDataDirExists();
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    if (!fileContent.trim()) { // Handle empty file case
      await writeData(fileName, initialData); // Initialize file with default data
      return initialData;
    }
    return JSON.parse(fileContent) as T;
  } catch (error: any) {
    if (error.code === 'ENOENT') { // File does not exist
      await writeData(fileName, initialData); // Create file with initial data
      return initialData;
    }
    console.error(`Error reading file ${fileName}:`, error);
    // In case of other errors (e.g., malformed JSON), return initialData as a fallback
    // and potentially re-initialize the file.
    try {
        await writeData(fileName, initialData);
    } catch (writeError) {
        console.error(`Error initializing file ${fileName} after read error:`, writeError);
    }
    return initialData;
  }
}

export async function writeData<T>(fileName: string, data: T): Promise<void> {
  await ensureDataDirExists();
  const filePath = path.join(DATA_DIR, fileName);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing file ${fileName}:`, error);
    throw error; // Re-throw to be handled by Server Action
  }
}
