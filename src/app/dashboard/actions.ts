
'use server';

import type { Sale, Part } from '@/lib/types';
import { readData } from '@/lib/file-data-utils';
import { startOfDay, endOfDay, isWithinInterval, parseISO, getYear, setMonth, setDate, isBefore } from 'date-fns';

const SALES_FILE = 'sales.json';
const PARTS_FILE = 'parts.json';

export interface DashboardData {
  totalRevenue: number;
  fiscalYearStartDate: Date; // For display subtitle
  partsInStock: number;
  activeCustomers: number;
  salesTodayCount: number;
  recentSales: Sale[];
  lowStockItems: Part[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const sales = await readData<Sale[]>(SALES_FILE, []);
  const inventoryParts = await readData<Part[]>(PARTS_FILE, []);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  let fiscalYearStart = setDate(setMonth(now, 3), 1); // April is month 3 (0-indexed)
  if (isBefore(now, fiscalYearStart)) {
    fiscalYearStart = setDate(setMonth(now, 3), 1);
    fiscalYearStart.setFullYear(getYear(now) - 1);
  }
  const fiscalYearStartDateForDisplay = startOfDay(fiscalYearStart);

  // Filter for completed sales only
  const completedSales = sales.filter(sale => sale.status !== 'Cancelled');

  const salesInFiscalYear = completedSales.filter(sale => {
    const saleDate = parseISO(sale.date);
    return isWithinInterval(saleDate, { start: fiscalYearStartDateForDisplay, end: now });
  });
  const totalRevenue = salesInFiscalYear.reduce((acc, sale) => acc + sale.netAmount, 0);

  const partsInStock = inventoryParts.reduce((acc, part) => acc + part.quantity, 0);
  const activeCustomers = new Set(completedSales.map(sale => sale.buyerName.toLowerCase())).size;
  
  const salesTodayCount = completedSales.filter(sale => {
      const saleDate = parseISO(sale.date);
      return isWithinInterval(saleDate, { start: todayStart, end: todayEnd });
  }).length;

  // Recent sales can include cancelled ones but should indicate status
  const recentSales = [...sales] // Use all sales for recent, status will be shown
      .sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      .slice(0, 7);

  const lowStockItems = inventoryParts.filter(part => part.quantity <= 1);

  return {
    totalRevenue,
    fiscalYearStartDate: fiscalYearStartDateForDisplay,
    partsInStock,
    activeCustomers,
    salesTodayCount,
    recentSales,
    lowStockItems
  };
}
