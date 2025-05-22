
'use server';

import type { Sale, Purchase, Part, SaleItem, PurchaseItem } from '@/lib/types';
import { readData } from '@/lib/file-data-utils';
import { isWithinInterval, parseISO, startOfDay, endOfDay, format as formatDate, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

const SALES_FILE = 'sales.json';
const PURCHASES_FILE = 'purchases.json';
const PARTS_FILE = 'parts.json';

export interface SalesSummaryData {
  totalSales: number; cashSales: number; creditSales: number;
  highestSellingProduct: { name: string; quantity: number; partNumber: string } | null;
  numberOfTransactions: number;
}
export interface PurchaseSummaryData {
  totalPurchases: number; numberOfPurchaseOrders: number;
  mostFrequentPart: { name: string; quantity: number; partNumber: string } | null;
  topSupplierByValue: { name: string; totalValue: number; supplierId?: string } | null;
}
export interface InventoryValuationData {
  totalValue: number; numberOfUniqueParts: number; totalQuantityOfParts: number;
}
export interface StockMovementEntry { date: string; purchased: number; sold: number; }
export interface StockMovementData { data: StockMovementEntry[]; hasData: boolean; }

const parseMrpToNumber = (mrpString?: string): number => {
  if (!mrpString) return 0;
  const numericValue = parseFloat(String(mrpString).replace(/[^0-9.-]+/g,""));
  return isNaN(numericValue) ? 0 : numericValue;
};

export async function generateSalesSummaryReport(dateRange: DateRange): Promise<SalesSummaryData | { message: string }> {
  if (!dateRange.from || !dateRange.to) return { message: "Date range is required." };
  const sales = await readData<Sale[]>(SALES_FILE, []);
  const fromDate = startOfDay(dateRange.from); const toDate = endOfDay(dateRange.to);
  const filteredSales = sales.filter(s => isWithinInterval(parseISO(s.date), { start: fromDate, end: toDate }));

  if (filteredSales.length === 0) return { totalSales: 0, cashSales: 0, creditSales: 0, highestSellingProduct: null, numberOfTransactions: 0 };
  
  let totalSales = 0, cashSales = 0, creditSales = 0;
  const productQuantities: Record<string, { name: string; quantity: number }> = {};
  filteredSales.forEach(s => {
    totalSales += s.netAmount;
    if (s.paymentType === 'cash') cashSales += s.netAmount; else creditSales += s.netAmount;
    s.items.forEach(i => {
      if (!productQuantities[i.partNumber]) productQuantities[i.partNumber] = { name: i.partName, quantity: 0 };
      productQuantities[i.partNumber].quantity += i.quantitySold;
    });
  });
  let highestSellingProduct: SalesSummaryData['highestSellingProduct'] = null; let maxQty = 0;
  for (const pn in productQuantities) {
    if (productQuantities[pn].quantity > maxQty) {
      maxQty = productQuantities[pn].quantity;
      highestSellingProduct = { partNumber: pn, name: productQuantities[pn].name, quantity: productQuantities[pn].quantity };
    }
  }
  return { totalSales, cashSales, creditSales, highestSellingProduct, numberOfTransactions: filteredSales.length };
}

export async function generatePurchaseSummaryReport(dateRange: DateRange): Promise<PurchaseSummaryData | { message: string }> {
  if (!dateRange.from || !dateRange.to) return { message: "Date range is required." };
  const purchases = await readData<Purchase[]>(PURCHASES_FILE, []);
  const fromDate = startOfDay(dateRange.from); const toDate = endOfDay(dateRange.to);
  const filteredPurchases = purchases.filter(p => isWithinInterval(parseISO(p.date), { start: fromDate, end: toDate }));

  if (filteredPurchases.length === 0) return { totalPurchases: 0, numberOfPurchaseOrders: 0, mostFrequentPart: null, topSupplierByValue: null };

  let totalPurchases = 0;
  const partQtys: Record<string, { name: string; quantity: number }> = {};
  const supplierValues: Record<string, { name: string; totalValue: number }> = {};
  filteredPurchases.forEach(p => {
    totalPurchases += p.netAmount;
    const supKey = p.supplierId || p.supplierName.toLowerCase();
    if (!supplierValues[supKey]) supplierValues[supKey] = { name: p.supplierName, totalValue: 0 };
    supplierValues[supKey].totalValue += p.netAmount;
    p.items.forEach(i => {
      if(!partQtys[i.partNumber]) partQtys[i.partNumber] = { name: i.partName, quantity: 0 };
      partQtys[i.partNumber].quantity += i.quantityPurchased;
    });
  });
  let mostFreqPart: PurchaseSummaryData['mostFrequentPart'] = null; let maxPQty = 0;
  for(const pn in partQtys) if(partQtys[pn].quantity > maxPQty) { maxPQty = partQtys[pn].quantity; mostFreqPart = {partNumber: pn, name: partQtys[pn].name, quantity: partQtys[pn].quantity};}
  let topSup: PurchaseSummaryData['topSupplierByValue'] = null; let maxSupVal = 0;
  for(const sid in supplierValues) if(supplierValues[sid].totalValue > maxSupVal) { maxSupVal = supplierValues[sid].totalValue; topSup = {supplierId: sid, name: supplierValues[sid].name, totalValue: supplierValues[sid].totalValue};}
  return { totalPurchases, numberOfPurchaseOrders: filteredPurchases.length, mostFrequentPart: mostFreqPart, topSupplierByValue: topSup };
}

export async function generateInventoryValuationReport(): Promise<InventoryValuationData> {
  const parts = await readData<Part[]>(PARTS_FILE, []);
  let totalValue = 0, totalQuantity = 0;
  parts.forEach(p => { totalValue += p.quantity * parseMrpToNumber(p.mrp); totalQuantity += p.quantity; });
  return { totalValue, numberOfUniqueParts: parts.length, totalQuantityOfParts: totalQuantity };
}

export async function generateStockMovementReport(): Promise<StockMovementData> {
  const sales = await readData<Sale[]>(SALES_FILE, []);
  const purchases = await readData<Purchase[]>(PURCHASES_FILE, []);
  const today = new Date(); const data: StockMovementEntry[] = []; let hasMovement = false;
  for (let i = 6; i >= 0; i--) {
    const currentDayStart = startOfDay(subDays(today, i)); const currentDayEnd = endOfDay(currentDayStart);
    let dailySold = 0; sales.forEach(s => { if(isWithinInterval(parseISO(s.date), {start: currentDayStart, end: currentDayEnd})) s.items.forEach(it => dailySold += it.quantitySold); });
    let dailyPurchased = 0; purchases.forEach(p => { if(p.status === 'Received' && isWithinInterval(parseISO(p.date), {start: currentDayStart, end: currentDayEnd})) p.items.forEach(it => dailyPurchased += it.quantityPurchased); });
    if(dailySold > 0 || dailyPurchased > 0) hasMovement = true;
    data.push({ date: formatDate(currentDayStart, "MMM d"), sold: dailySold, purchased: dailyPurchased });
  }
  return { data, hasData: hasMovement };
}
